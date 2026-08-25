-- Durable Royal Command Work records: one authoritative Work ID per Room request context.
create table if not exists public.room_work_records (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  request_key text not null,
  work_id text not null,
  revision integer not null default 1 check (revision >= 1),
  parent_revision integer,
  title text,
  status text not null default 'received'
    check (status in ('received', 'planning', 'tools_running', 'awaiting_evidence', 'reportable', 'awaiting_user_approval', 'approved', 'done', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, request_key),
  unique (room_id, work_id, revision)
);

create index if not exists room_work_records_room_created_idx
  on public.room_work_records (room_id, created_at desc);

alter table public.room_work_records enable row level security;

drop policy if exists "room_work_records_select" on public.room_work_records;
create policy "room_work_records_select" on public.room_work_records
  for select
  to authenticated
  using (private.is_room_member(room_id));

drop policy if exists "room_work_records_insert" on public.room_work_records;
create policy "room_work_records_insert" on public.room_work_records
  for insert
  to authenticated
  with check (private.is_room_member(room_id));

drop policy if exists "room_work_records_update" on public.room_work_records;
create policy "room_work_records_update" on public.room_work_records
  for update
  to authenticated
  using (private.is_room_member(room_id))
  with check (private.is_room_member(room_id));
