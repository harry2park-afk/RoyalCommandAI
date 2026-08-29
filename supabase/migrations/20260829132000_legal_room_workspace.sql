create table if not exists public.legal_room_workspaces (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  case_story text not null default '',
  desired_outcome text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.legal_room_workspaces enable row level security;

drop policy if exists legal_room_workspaces_select_owner on public.legal_room_workspaces;
create policy legal_room_workspaces_select_owner
on public.legal_room_workspaces
for select
to authenticated
using (
  owner_id = auth.uid()
  and exists (
    select 1 from public.rooms r
    where r.id = room_id and r.room_owner_id = auth.uid()
  )
);

drop policy if exists legal_room_workspaces_insert_owner on public.legal_room_workspaces;
create policy legal_room_workspaces_insert_owner
on public.legal_room_workspaces
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.rooms r
    where r.id = room_id and r.room_owner_id = auth.uid()
  )
);

drop policy if exists legal_room_workspaces_update_owner on public.legal_room_workspaces;
create policy legal_room_workspaces_update_owner
on public.legal_room_workspaces
for update
to authenticated
using (
  owner_id = auth.uid()
  and exists (
    select 1 from public.rooms r
    where r.id = room_id and r.room_owner_id = auth.uid()
  )
)
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.rooms r
    where r.id = room_id and r.room_owner_id = auth.uid()
  )
);

create table if not exists public.legal_evidence_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  title text not null,
  event_date date,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists legal_evidence_items_room_created_idx
  on public.legal_evidence_items(room_id, created_at desc);

alter table public.legal_evidence_items enable row level security;

drop policy if exists legal_evidence_items_select_owner on public.legal_evidence_items;
create policy legal_evidence_items_select_owner
on public.legal_evidence_items
for select
to authenticated
using (
  owner_id = auth.uid()
  and exists (
    select 1 from public.rooms r
    where r.id = room_id and r.room_owner_id = auth.uid()
  )
);

drop policy if exists legal_evidence_items_insert_owner on public.legal_evidence_items;
create policy legal_evidence_items_insert_owner
on public.legal_evidence_items
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.rooms r
    where r.id = room_id and r.room_owner_id = auth.uid()
  )
);

drop policy if exists legal_evidence_items_update_owner on public.legal_evidence_items;
create policy legal_evidence_items_update_owner
on public.legal_evidence_items
for update
to authenticated
using (
  owner_id = auth.uid()
  and exists (
    select 1 from public.rooms r
    where r.id = room_id and r.room_owner_id = auth.uid()
  )
)
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.rooms r
    where r.id = room_id and r.room_owner_id = auth.uid()
  )
);

drop policy if exists legal_evidence_items_delete_owner on public.legal_evidence_items;
create policy legal_evidence_items_delete_owner
on public.legal_evidence_items
for delete
to authenticated
using (
  owner_id = auth.uid()
  and exists (
    select 1 from public.rooms r
    where r.id = room_id and r.room_owner_id = auth.uid()
  )
);
