-- Royal Command pre-launch recovery baseline candidate.
--
-- PURPOSE
-- This file exists only to reconstruct a disposable / recovery database from a
-- blank Supabase stack when the earlier hosted migration lineage is not present
-- in this repository. It is intentionally OUTSIDE supabase/migrations so normal
-- hosted migration deployment cannot apply it accidentally.
--
-- SOURCE OF TRUTH
-- Definitions below are limited to prerequisites that were verified read-only
-- against the current hosted RoyalCommand schema or are required by checked-in
-- migrations that otherwise run before their dependencies exist.
--
-- SAFETY
-- Do not apply this file to Production. CI copies it into the disposable local
-- migration directory as 003_recovery_prelaunch_baseline.sql after 001_init.sql
-- and 002_rls.sql. Existing historical migrations remain unchanged.

-- Production profiles contain these columns, but their original hosted
-- migrations are not present in the checked-in clean-replay sequence.
alter table public.profiles
  add column if not exists role text not null default 'client';

alter table public.profiles
  add column if not exists ui_preferences jsonb not null default '{}'::jsonb;

-- Production moved trusted membership/matter helpers into a private schema.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.is_household_member(h_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = h_id
      and user_id = auth.uid()
  );
$$;

create or replace function private.is_room_member(r_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.room_members
    where room_id = r_id
      and user_id = auth.uid()
  );
$$;

revoke all on function private.is_household_member(uuid) from public, anon;
revoke all on function private.is_room_member(uuid) from public, anon;
grant execute on function private.is_household_member(uuid) to authenticated, service_role;
grant execute on function private.is_room_member(uuid) to authenticated, service_role;

-- Matter foundation exists in Production before the checked-in
-- 20260829075000_harden_matter_auth_policies.sql migration. The original table
-- creation migration is missing from this repository, so the recovery baseline
-- restores only the read-only-verified table/constraint/index shape needed by
-- the later policy migrations.
create table if not exists public.matters (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  service_line text not null check (service_line in ('legal', 'accounting')),
  title text not null,
  summary text not null default '',
  status text not null default 'open'
    check (status in ('draft', 'open', 'in_progress', 'waiting_client', 'waiting_staff', 'closed')),
  assigned_staff_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists matters_client_idx on public.matters (client_id);
create index if not exists matters_service_line_idx on public.matters (service_line);
create index if not exists matters_staff_idx on public.matters (assigned_staff_id);

create table if not exists public.matter_documents (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  filename text not null,
  mime_type text,
  size_bytes bigint not null default 0,
  category text not null default 'other'
    check (category in ('identity', 'contract', 'tax', 'financial', 'correspondence', 'other')),
  review_status text not null default 'pending'
    check (review_status in ('pending', 'in_review', 'approved', 'needs_changes', 'rejected')),
  review_note text,
  storage_path text,
  created_at timestamptz not null default now()
);

create index if not exists matter_documents_matter_idx
  on public.matter_documents (matter_id);

create table if not exists public.matter_messages (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 8000),
  created_at timestamptz not null default now()
);

create index if not exists matter_messages_matter_created_idx
  on public.matter_messages (matter_id, created_at);

create table if not exists public.matter_chat_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  matter_id uuid not null references public.matters(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, matter_id)
);

alter table public.matters enable row level security;
alter table public.matter_documents enable row level security;
alter table public.matter_messages enable row level security;
alter table public.matter_chat_reads enable row level security;

grant select, insert, update, delete on public.matters to authenticated, service_role;
grant select, insert, update, delete on public.matter_documents to authenticated, service_role;
grant select, insert, update, delete on public.matter_messages to authenticated, service_role;
grant select, insert, update, delete on public.matter_chat_reads to authenticated, service_role;

create or replace function private.is_matter_client(m_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.matters
    where id = m_id
      and client_id = auth.uid()
  );
$$;

create or replace function private.is_staff_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('staff', 'admin')
  );
$$;

-- Legacy public helpers must exist because the checked-in hardening migration
-- explicitly revokes their RPC access after switching RLS to private helpers.
create or replace function public.is_matter_client(m_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_matter_client(m_id);
$$;

create or replace function public.is_staff_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_staff_or_admin();
$$;

revoke all on function private.is_matter_client(uuid) from public, anon;
revoke all on function private.is_staff_or_admin() from public, anon;
grant execute on function private.is_matter_client(uuid) to authenticated, service_role;
grant execute on function private.is_staff_or_admin() to authenticated, service_role;

-- The checked-in insert-policy migration is timestamped before the checked-in
-- table-creation migration. Pre-creating the Production-verified manifest table
-- makes that historical ordering replayable; the later CREATE TABLE IF NOT EXISTS
-- remains a no-op and then adds its index/select policy as designed.
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

-- Production also contains the service-catalog foundation from a hosted
-- migration that is missing from this repository. Later checked-in migrations
-- reference these tables before any checked-in CREATE TABLE for them.
create table if not exists public.rc_service_catalog (
  service_key text primary key,
  category text not null,
  name_ko text not null,
  name_en text not null,
  summary_ko text not null,
  summary_en text not null,
  details_ko text,
  details_en text,
  pricing_type text not null
    check (pricing_type in ('free', 'monthly', 'one_time', 'usage', 'custom')),
  currency text not null default 'AUD',
  price_minor bigint,
  price_status text not null default 'tbd'
    check (price_status in ('fixed', 'tbd', 'quote')),
  parent_service_key text references public.rc_service_catalog(service_key) on delete cascade,
  tier_rank integer not null default 0,
  default_included boolean not null default false,
  customer_selectable boolean not null default true,
  sort_order integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rc_service_catalog enable row level security;
drop policy if exists rc_service_catalog_read_active on public.rc_service_catalog;
create policy rc_service_catalog_read_active
on public.rc_service_catalog
for select
to authenticated
using (active = true);

grant select on public.rc_service_catalog to authenticated, service_role;
grant insert, update, delete on public.rc_service_catalog to service_role;

create table if not exists public.rc_room_service_selections (
  room_id uuid not null references public.rooms(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  service_key text not null references public.rc_service_catalog(service_key) on delete restrict,
  selection_status text not null default 'selected'
    check (selection_status in ('selected', 'pending_payment', 'active', 'paused', 'cancelled')),
  selected_at timestamptz not null default now(),
  activated_at timestamptz,
  cancelled_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (room_id, service_key)
);

alter table public.rc_room_service_selections enable row level security;
drop policy if exists rc_room_service_selections_owner_all on public.rc_room_service_selections;
create policy rc_room_service_selections_owner_all
on public.rc_room_service_selections
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

grant select, insert, update, delete on public.rc_room_service_selections
to authenticated, service_role;
