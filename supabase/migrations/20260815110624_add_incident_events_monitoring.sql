create table if not exists public.incident_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  severity text not null default 'P2' check (severity in ('P1','P2','P3')),
  source text not null,
  event_type text not null,
  room_id uuid null,
  request_id text null,
  url text null,
  message text not null,
  error_name text null,
  stack text null,
  user_agent text null,
  deployment_id text null,
  commit_sha text null,
  metadata jsonb not null default '{}'::jsonb,
  resolved boolean not null default false,
  resolved_at timestamptz null
);

create index if not exists incident_events_created_at_idx on public.incident_events (created_at desc);
create index if not exists incident_events_room_id_idx on public.incident_events (room_id, created_at desc);
create index if not exists incident_events_severity_idx on public.incident_events (severity, created_at desc);

alter table public.incident_events enable row level security;

create policy "authenticated users can insert incident events"
on public.incident_events
for insert
to authenticated
with check (true);

create policy "authenticated users can view incident events"
on public.incident_events
for select
to authenticated
using (true);