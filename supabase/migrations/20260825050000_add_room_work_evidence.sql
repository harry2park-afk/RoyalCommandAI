alter table public.room_work_records
  add column if not exists builder_model text,
  add column if not exists evidence jsonb not null default '{}'::jsonb;

create index if not exists room_work_records_status_updated_idx
  on public.room_work_records (status, updated_at desc);
