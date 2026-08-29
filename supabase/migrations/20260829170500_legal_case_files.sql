create table if not exists public.legal_cases (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists legal_cases_room_owner_idx
  on public.legal_cases(room_id, owner_id, updated_at desc);

alter table public.legal_cases enable row level security;

drop policy if exists legal_cases_select_owner on public.legal_cases;
create policy legal_cases_select_owner on public.legal_cases
for select to authenticated
using (
  owner_id = auth.uid()
  and exists (
    select 1 from public.rooms r
    where r.id = legal_cases.room_id
      and r.room_owner_id = auth.uid()
  )
);

drop policy if exists legal_cases_insert_owner on public.legal_cases;
create policy legal_cases_insert_owner on public.legal_cases
for insert to authenticated
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.rooms r
    where r.id = legal_cases.room_id
      and r.room_owner_id = auth.uid()
  )
);

drop policy if exists legal_cases_update_owner on public.legal_cases;
create policy legal_cases_update_owner on public.legal_cases
for update to authenticated
using (
  owner_id = auth.uid()
  and exists (
    select 1 from public.rooms r
    where r.id = legal_cases.room_id
      and r.room_owner_id = auth.uid()
  )
)
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.rooms r
    where r.id = legal_cases.room_id
      and r.room_owner_id = auth.uid()
  )
);

alter table public.legal_story_entries
  add column if not exists case_id uuid null references public.legal_cases(id) on delete set null;

create index if not exists legal_story_entries_case_recorded_idx
  on public.legal_story_entries(case_id, recorded_at desc);

insert into public.legal_cases (room_id, owner_id, title)
select distinct lse.room_id, lse.owner_id, '기존 사건 / Existing case'
from public.legal_story_entries lse
where lse.case_id is null
  and not exists (
    select 1 from public.legal_cases lc
    where lc.room_id = lse.room_id
      and lc.owner_id = lse.owner_id
      and lc.title = '기존 사건 / Existing case'
  );

update public.legal_story_entries lse
set case_id = lc.id
from public.legal_cases lc
where lse.case_id is null
  and lc.room_id = lse.room_id
  and lc.owner_id = lse.owner_id
  and lc.title = '기존 사건 / Existing case';
