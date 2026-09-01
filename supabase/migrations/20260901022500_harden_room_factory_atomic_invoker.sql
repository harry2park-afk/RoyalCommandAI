-- Work Queue Ticket: #546
-- Follow-up to the schema-first atomic Room Factory migration.
--
-- Supabase Security Advisor flags exposed SECURITY DEFINER functions that are
-- executable by authenticated users. The First Meeting route does not need
-- privilege elevation: all required Household/Room/manifest writes already
-- have owner/member RLS policies. Keep the same one-transaction/idempotency
-- behavior, but execute it with the caller's authenticated privileges so RLS
-- remains authoritative end-to-end.

create or replace function public.create_room_factory_room_atomic(
  p_encounter_session_id uuid,
  p_household_id uuid,
  p_household_name text,
  p_room_name text,
  p_room_description text,
  p_language_pref text,
  p_factory_version text,
  p_template_id text,
  p_country_code text,
  p_language_tag text,
  p_country_profile_status text,
  p_manifest jsonb
)
returns table (
  room_data jsonb,
  manifest_data jsonb,
  reused boolean
)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_household_id uuid;
  v_room public.rooms%rowtype;
  v_manifest public.room_factory_manifests%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  if p_encounter_session_id is null then
    raise exception using errcode = '22023', message = 'encounterSessionId is required for atomic Room creation.';
  end if;

  if jsonb_typeof(p_manifest) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'Room Factory manifest must be a JSON object.';
  end if;

  if nullif(p_manifest->>'encounterSessionId', '')::uuid is distinct from p_encounter_session_id then
    raise exception using errcode = '22023', message = 'Manifest encounterSessionId does not match the authoritative encounter key.';
  end if;

  if length(btrim(coalesce(p_room_name, ''))) < 1 or length(p_room_name) > 120 then
    raise exception using errcode = '22023', message = 'Room name must contain 1 to 120 characters.';
  end if;

  if length(btrim(coalesce(p_factory_version, ''))) < 1
     or length(btrim(coalesce(p_template_id, ''))) < 1
     or length(btrim(coalesce(p_country_code, ''))) < 1
     or length(btrim(coalesce(p_language_tag, ''))) < 1 then
    raise exception using errcode = '22023', message = 'Room Factory metadata is incomplete.';
  end if;

  if p_country_profile_status not in ('registered', 'custom-profile-required') then
    raise exception using errcode = '22023', message = 'Invalid country profile status.';
  end if;

  -- Serialize Room Factory creation per owner. SECURITY INVOKER means every
  -- table operation below remains subject to the caller's existing RLS policy.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('room-factory-owner:' || v_user_id::text, 0)
  );

  select m.*
  into v_manifest
  from public.room_factory_manifests m
  where m.owner_id = v_user_id
    and m.encounter_session_id = p_encounter_session_id
  limit 1;

  if v_manifest.id is not null then
    select r.*
    into v_room
    from public.rooms r
    where r.id = v_manifest.room_id
      and r.room_owner_id = v_user_id
    limit 1;

    if v_room.id is null then
      raise exception 'Room Factory integrity error: encounter manifest has no owned Room.';
    end if;

    return query select to_jsonb(v_room), to_jsonb(v_manifest), true;
    return;
  end if;

  if p_household_id is not null then
    select h.id
    into v_household_id
    from public.households h
    where h.id = p_household_id
      and (
        h.owner_id = v_user_id
        or exists (
          select 1
          from public.household_members hm
          where hm.household_id = h.id
            and hm.user_id = v_user_id
        )
      )
    limit 1;

    if v_household_id is null then
      raise exception using errcode = '42501', message = 'Household access denied.';
    end if;
  else
    select hm.household_id
    into v_household_id
    from public.household_members hm
    where hm.user_id = v_user_id
    order by hm.created_at asc
    limit 1;
  end if;

  if v_household_id is null then
    insert into public.households (owner_id, name, household_type)
    values (
      v_user_id,
      left(coalesce(nullif(btrim(p_household_name), ''), 'My Household'), 200),
      'individual'
    )
    returning id into v_household_id;

    insert into public.household_members (household_id, user_id, role)
    values (v_household_id, v_user_id, 'sovereign');
  end if;

  insert into public.rooms (
    household_id,
    room_owner_id,
    name,
    description,
    status
  ) values (
    v_household_id,
    v_user_id,
    btrim(p_room_name),
    left(p_room_description, 2000),
    'active'
  )
  returning * into v_room;

  insert into public.room_members (
    room_id,
    user_id,
    role,
    language_pref
  ) values (
    v_room.id,
    v_user_id,
    'owner',
    nullif(btrim(coalesce(p_language_pref, '')), '')
  );

  insert into public.room_factory_manifests (
    room_id,
    owner_id,
    encounter_session_id,
    factory_version,
    template_id,
    country_code,
    language_tag,
    country_profile_status,
    manifest
  ) values (
    v_room.id,
    v_user_id,
    p_encounter_session_id,
    btrim(p_factory_version),
    btrim(p_template_id),
    btrim(p_country_code),
    btrim(p_language_tag),
    p_country_profile_status,
    p_manifest
  )
  returning * into v_manifest;

  return query select to_jsonb(v_room), to_jsonb(v_manifest), false;
end;
$$;

-- The route uses an authenticated user-scoped Supabase client. Do not expose
-- this entrypoint to anon, PUBLIC, or service_role; service-role callers would
-- unnecessarily bypass RLS under SECURITY INVOKER.
revoke all on function public.create_room_factory_room_atomic(
  uuid, uuid, text, text, text, text, text, text, text, text, text, jsonb
) from public, anon, service_role;
grant execute on function public.create_room_factory_room_atomic(
  uuid, uuid, text, text, text, text, text, text, text, text, text, jsonb
) to authenticated;

comment on function public.create_room_factory_room_atomic(
  uuid, uuid, text, text, text, text, text, text, text, text, text, jsonb
) is
  'Authenticated SECURITY INVOKER atomic/idempotent First Meeting Room creation. Existing RLS remains authoritative for every Household, Room, membership and manifest operation.';
