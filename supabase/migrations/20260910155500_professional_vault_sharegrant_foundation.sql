-- Professional Room Vault / ShareGrant persistence foundation.
--
-- SAFETY / SCOPE:
-- - additive schema only; seeds no customer, vault, object, grant or invalidation rows;
-- - Room-scoped tenant authority is the existing rooms.household_id boundary;
-- - Legal and Accounting vault storage stays physically distinct by domain;
-- - no virtual_bridge vault domain exists: bridge_la remains a ShareGrant Virtual View concept;
-- - all new tables are server-only with RLS enabled and anon/authenticated privileges revoked;
-- - this migration does not expose UI/runtime, enable payments, approve jurisdictions or authorize Production.

create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.professional_vaults (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.households(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  domain text not null check (domain in ('legal', 'accounting')),
  authority_user_id uuid references public.profiles(id) on delete set null,
  policy_version text not null check (char_length(trim(policy_version)) between 1 and 120),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, domain)
);

create index if not exists professional_vaults_tenant_room_idx
  on public.professional_vaults(tenant_id, room_id);

create table if not exists public.professional_vault_objects (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references public.professional_vaults(id) on delete cascade,
  tenant_id uuid not null references public.households(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  object_key text not null check (char_length(trim(object_key)) between 1 and 240),
  object_type text not null check (char_length(trim(object_type)) between 1 and 120),
  classification text not null default 'professional' check (char_length(trim(classification)) between 1 and 120),
  payload_ref text not null check (char_length(trim(payload_ref)) between 1 and 1024),
  payload_sha256 text check (payload_sha256 is null or payload_sha256 ~ '^[0-9a-f]{64}$'),
  source_system text,
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (vault_id, object_key)
);

create index if not exists professional_vault_objects_tenant_room_idx
  on public.professional_vault_objects(tenant_id, room_id, vault_id);

create table if not exists public.professional_share_grants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.households(id) on delete cascade,
  source_vault_id uuid not null references public.professional_vaults(id) on delete cascade,
  source_object_id uuid not null references public.professional_vault_objects(id) on delete cascade,
  source_room_id uuid not null references public.rooms(id) on delete cascade,
  destination_room_id uuid not null references public.rooms(id) on delete cascade,
  destination_domain text not null check (destination_domain in ('legal', 'accounting')),
  grantor_user_id uuid references public.profiles(id) on delete set null,
  action text not null default 'read' check (action = 'read'),
  field_scope text[] not null default array['*']::text[] check (cardinality(field_scope) > 0),
  purpose text not null check (char_length(trim(purpose)) between 1 and 240),
  policy_version text not null check (char_length(trim(policy_version)) between 1 and 120),
  idempotency_key text not null check (char_length(trim(idempotency_key)) between 1 and 240),
  status text not null default 'active' check (status in ('active', 'revoked')),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint professional_share_grants_expiry_after_create
    check (expires_at > created_at),
  constraint professional_share_grants_revocation_shape
    check (
      (status = 'active' and revoked_at is null and revocation_reason is null)
      or
      (status = 'revoked' and revoked_at is not null and nullif(trim(revocation_reason), '') is not null)
    ),
  unique (tenant_id, idempotency_key)
);

create index if not exists professional_share_grants_lookup_idx
  on public.professional_share_grants(tenant_id, destination_room_id, status, expires_at);

create table if not exists public.professional_share_invalidation_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.households(id) on delete cascade,
  grant_id uuid not null references public.professional_share_grants(id) on delete cascade,
  target text not null check (
    target in (
      'vector_db',
      'embeddings',
      'search_index',
      'cache',
      'prompt_context',
      'ai_memory',
      'derived_copy',
      'active_session'
    )
  ),
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  evidence_ref text,
  last_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (grant_id, target)
);

create index if not exists professional_share_invalidation_pending_idx
  on public.professional_share_invalidation_events(status, created_at)
  where status <> 'succeeded';

create or replace function private.guard_professional_vault_boundary()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if not exists (
    select 1
    from public.rooms r
    where r.id = new.room_id
      and r.household_id = new.tenant_id
  ) then
    raise exception 'Professional vault Room/tenant boundary mismatch';
  end if;

  if new.authority_user_id is not null and not exists (
    select 1
    from public.rooms r
    where r.id = new.room_id
      and (
        r.room_owner_id = new.authority_user_id
        or exists (
          select 1
          from public.room_members rm
          where rm.room_id = r.id
            and rm.user_id = new.authority_user_id
        )
      )
  ) then
    raise exception 'Professional vault authority is outside the Room boundary';
  end if;

  return new;
end;
$$;

create or replace function private.guard_professional_vault_object_boundary()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if not exists (
    select 1
    from public.professional_vaults v
    where v.id = new.vault_id
      and v.tenant_id = new.tenant_id
      and v.room_id = new.room_id
      and v.status = 'active'
  ) then
    raise exception 'Professional object Vault/Room/tenant boundary mismatch or inactive vault';
  end if;

  return new;
end;
$$;

create or replace function private.guard_professional_share_grant_boundary()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  source_domain text;
begin
  if tg_op = 'UPDATE' then
    if old.status = 'revoked' and new.status <> 'revoked' then
      raise exception 'Revoked ShareGrant cannot be reactivated';
    end if;

    if row(
      new.tenant_id,
      new.source_vault_id,
      new.source_object_id,
      new.source_room_id,
      new.destination_room_id,
      new.destination_domain,
      new.grantor_user_id,
      new.action,
      new.field_scope,
      new.purpose,
      new.policy_version,
      new.idempotency_key,
      new.expires_at,
      new.created_at
    ) is distinct from row(
      old.tenant_id,
      old.source_vault_id,
      old.source_object_id,
      old.source_room_id,
      old.destination_room_id,
      old.destination_domain,
      old.grantor_user_id,
      old.action,
      old.field_scope,
      old.purpose,
      old.policy_version,
      old.idempotency_key,
      old.expires_at,
      old.created_at
    ) then
      raise exception 'ShareGrant authority/scope is immutable; issue a new grant instead';
    end if;
  end if;

  select v.domain
    into source_domain
  from public.professional_vaults v
  join public.professional_vault_objects o
    on o.vault_id = v.id
   and o.id = new.source_object_id
  where v.id = new.source_vault_id
    and v.tenant_id = new.tenant_id
    and v.room_id = new.source_room_id
    and v.status = 'active'
    and o.tenant_id = new.tenant_id
    and o.room_id = new.source_room_id
    and o.deleted_at is null;

  if source_domain is null then
    raise exception 'ShareGrant source object/Vault/Room/tenant authority mismatch';
  end if;

  if source_domain = new.destination_domain then
    raise exception 'ShareGrant Virtual View must cross Legal/Accounting vault domains';
  end if;

  if not exists (
    select 1
    from public.rooms r
    where r.id = new.destination_room_id
      and r.household_id = new.tenant_id
  ) then
    raise exception 'ShareGrant destination Room is outside the source tenant';
  end if;

  if new.grantor_user_id is not null and not exists (
    select 1
    from public.rooms r
    where r.id = new.source_room_id
      and (
        r.room_owner_id = new.grantor_user_id
        or exists (
          select 1
          from public.room_members rm
          where rm.room_id = r.id
            and rm.user_id = new.grantor_user_id
        )
      )
  ) then
    raise exception 'ShareGrant grantor is outside the source Room boundary';
  end if;

  if new.status = 'active' and new.expires_at <= now() then
    raise exception 'Active ShareGrant must not already be expired';
  end if;

  return new;
end;
$$;

create or replace function private.guard_professional_share_invalidation_boundary()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if not exists (
    select 1
    from public.professional_share_grants g
    where g.id = new.grant_id
      and g.tenant_id = new.tenant_id
  ) then
    raise exception 'ShareGrant invalidation event tenant mismatch';
  end if;

  return new;
end;
$$;

create or replace function private.professional_share_grant_is_active(p_grant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select exists (
    select 1
    from public.professional_share_grants g
    join public.professional_vaults v
      on v.id = g.source_vault_id
     and v.tenant_id = g.tenant_id
     and v.room_id = g.source_room_id
    join public.professional_vault_objects o
      on o.id = g.source_object_id
     and o.vault_id = v.id
     and o.tenant_id = g.tenant_id
     and o.room_id = g.source_room_id
    join public.rooms d
      on d.id = g.destination_room_id
     and d.household_id = g.tenant_id
    where g.id = p_grant_id
      and g.status = 'active'
      and g.revoked_at is null
      and g.expires_at > now()
      and v.status = 'active'
      and o.deleted_at is null
  );
$$;

drop trigger if exists professional_vaults_boundary_guard on public.professional_vaults;
create trigger professional_vaults_boundary_guard
before insert or update on public.professional_vaults
for each row execute function private.guard_professional_vault_boundary();

drop trigger if exists professional_vault_objects_boundary_guard on public.professional_vault_objects;
create trigger professional_vault_objects_boundary_guard
before insert or update on public.professional_vault_objects
for each row execute function private.guard_professional_vault_object_boundary();

drop trigger if exists professional_share_grants_boundary_guard on public.professional_share_grants;
create trigger professional_share_grants_boundary_guard
before insert or update on public.professional_share_grants
for each row execute function private.guard_professional_share_grant_boundary();

drop trigger if exists professional_share_invalidation_boundary_guard on public.professional_share_invalidation_events;
create trigger professional_share_invalidation_boundary_guard
before insert or update on public.professional_share_invalidation_events
for each row execute function private.guard_professional_share_invalidation_boundary();

alter table public.professional_vaults enable row level security;
alter table public.professional_vault_objects enable row level security;
alter table public.professional_share_grants enable row level security;
alter table public.professional_share_invalidation_events enable row level security;

revoke all on public.professional_vaults from anon, authenticated;
revoke all on public.professional_vault_objects from anon, authenticated;
revoke all on public.professional_share_grants from anon, authenticated;
revoke all on public.professional_share_invalidation_events from anon, authenticated;

grant select, insert, update, delete on public.professional_vaults to service_role;
grant select, insert, update, delete on public.professional_vault_objects to service_role;
grant select, insert, update, delete on public.professional_share_grants to service_role;
grant select, insert, update, delete on public.professional_share_invalidation_events to service_role;

revoke all on function private.guard_professional_vault_boundary() from public, anon, authenticated;
revoke all on function private.guard_professional_vault_object_boundary() from public, anon, authenticated;
revoke all on function private.guard_professional_share_grant_boundary() from public, anon, authenticated;
revoke all on function private.guard_professional_share_invalidation_boundary() from public, anon, authenticated;
revoke all on function private.professional_share_grant_is_active(uuid) from public, anon, authenticated;

grant execute on function private.professional_share_grant_is_active(uuid) to service_role;
