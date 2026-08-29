create table if not exists public.legal_story_entries (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  raw_transcript text not null default '',
  ai_summary text not null default '',
  audio_document_id uuid null references public.documents(id) on delete set null,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists legal_story_entries_room_recorded_idx
  on public.legal_story_entries(room_id, recorded_at desc);

alter table public.legal_story_entries enable row level security;

drop policy if exists legal_story_entries_select_owner on public.legal_story_entries;
create policy legal_story_entries_select_owner on public.legal_story_entries
for select to authenticated
using (
  owner_id = auth.uid()
  and exists (
    select 1 from public.rooms r
    where r.id = legal_story_entries.room_id
      and r.room_owner_id = auth.uid()
  )
);

drop policy if exists legal_story_entries_insert_owner on public.legal_story_entries;
create policy legal_story_entries_insert_owner on public.legal_story_entries
for insert to authenticated
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.rooms r
    where r.id = legal_story_entries.room_id
      and r.room_owner_id = auth.uid()
  )
);

drop policy if exists legal_story_entries_update_owner on public.legal_story_entries;
create policy legal_story_entries_update_owner on public.legal_story_entries
for update to authenticated
using (
  owner_id = auth.uid()
  and exists (
    select 1 from public.rooms r
    where r.id = legal_story_entries.room_id
      and r.room_owner_id = auth.uid()
  )
)
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.rooms r
    where r.id = legal_story_entries.room_id
      and r.room_owner_id = auth.uid()
  )
);