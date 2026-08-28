-- RCA Room Factory V1 persistent manifests.
-- A manifest records the host-compiled Room structure and safety policy.
-- Customer content, Room Memory, credentials and secrets are never stored here.

create table if not exists public.room_factory_manifests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null unique references public.rooms(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  factory_version text not null,
  template_id text not null,
  country_code text not null,
  language_tag text not null,
  country_profile_status text not null
    check (country_profile_status in ('registered', 'custom-profile-required')),
  manifest jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(manifest) = 'object')
);

create index if not exists room_factory_manifests_owner_created_idx
  on public.room_factory_manifests (owner_id, created_at desc);

alter table public.room_factory_manifests enable row level security;

drop policy if exists "room_factory_manifests_select" on public.room_factory_manifests;
create policy "room_factory_manifests_select" on public.room_factory_manifests
  for select
  to authenticated
  using (private.is_room_member(room_id));

-- Client-side insert/update/delete is intentionally not granted.
-- The authenticated RCA server route creates the host-compiled manifest together with the Room.

comment on table public.room_factory_manifests is
  'Host-compiled RCA Room Factory manifests. Structure and safety policy only; never customer memory, credentials or secrets.';
