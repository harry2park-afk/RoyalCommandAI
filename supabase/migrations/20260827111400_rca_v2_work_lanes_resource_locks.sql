-- RCA V2 persistent BUILD state.
-- IMPORTANT: repository migration draft only in this task. Do not apply to live DB until separately reviewed/approved.
-- Reuses public.room_work_records as the authoritative parent Work record.

-- Composite uniqueness lets child tables prove that a Work record belongs to the same Room.
create unique index if not exists room_work_records_id_room_idx
  on public.room_work_records (id, room_id);

create table if not exists public.room_work_lanes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  work_record_id uuid not null,
  lane_id text not null,
  title text not null,
  writer_provider text not null,
  reviewer_providers text[] not null default '{}'::text[],
  resources text[] not null default '{}'::text[],
  depends_on text[] not null default '{}'::text[],
  parallel_group text,
  required_evidence text[] not null default '{}'::text[],
  evidence jsonb not null default '{}'::jsonb,
  reviewer_verdict jsonb not null default '{}'::jsonb,
  rework_round integer not null default 0 check (rework_round between 0 and 2),
  status text not null default 'planned'
    check (status in (
      'planned',
      'ready',
      'running',
      'awaiting_review',
      'fix_required',
      'passed',
      'blocked',
      'failed'
    )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (work_record_id, lane_id),
  unique (id, work_record_id, room_id),
  foreign key (work_record_id, room_id)
    references public.room_work_records(id, room_id) on delete cascade
);

create index if not exists room_work_lanes_room_work_idx
  on public.room_work_lanes (room_id, work_record_id, created_at);

create index if not exists room_work_lanes_status_idx
  on public.room_work_lanes (room_id, status, updated_at desc);

alter table public.room_work_lanes enable row level security;

-- Authenticated room members may inspect BUILD state, but client-side mutation is intentionally not granted.
-- Future Host Executor/service-role code will own lane state transitions.
drop policy if exists "room_work_lanes_select" on public.room_work_lanes;
create policy "room_work_lanes_select" on public.room_work_lanes
  for select
  to authenticated
  using (private.is_room_member(room_id));

create table if not exists public.room_resource_locks (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  work_record_id uuid not null,
  work_lane_id uuid not null,
  resource_key text not null,
  owner_provider text not null,
  lock_token uuid not null default gen_random_uuid(),
  state text not null default 'planned'
    check (state in ('planned', 'acquired', 'released', 'expired')),
  acquired_at timestamptz,
  lease_expires_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (work_lane_id, work_record_id, room_id)
    references public.room_work_lanes(id, work_record_id, room_id) on delete cascade,
  check (length(btrim(resource_key)) > 0),
  check (
    (state <> 'acquired')
    or (acquired_at is not null and lease_expires_at is not null and lease_expires_at > acquired_at)
  )
);

create index if not exists room_resource_locks_work_idx
  on public.room_resource_locks (room_id, work_record_id, created_at);

create index if not exists room_resource_locks_lease_idx
  on public.room_resource_locks (state, lease_expires_at)
  where state = 'acquired';

-- Database-level single active Writer lock per Room/resource.
-- lower(btrim(resource_key)) prevents case/whitespace variants from bypassing the lock.
create unique index if not exists room_resource_locks_one_active_resource_idx
  on public.room_resource_locks (room_id, lower(btrim(resource_key)))
  where state = 'acquired';

alter table public.room_resource_locks enable row level security;

-- Room members may inspect lock ownership. No authenticated INSERT/UPDATE/DELETE policy is created.
-- Future Host Executor/service-role code will acquire/release leases server-side.
drop policy if exists "room_resource_locks_select" on public.room_resource_locks;
create policy "room_resource_locks_select" on public.room_resource_locks
  for select
  to authenticated
  using (private.is_room_member(room_id));

comment on table public.room_work_lanes is
  'RCA V2 per-Work execution lanes. Mutations are reserved for the future Host Executor.';

comment on table public.room_resource_locks is
  'RCA V2 server-owned resource leases enforcing one active Writer per Room/resource.';
