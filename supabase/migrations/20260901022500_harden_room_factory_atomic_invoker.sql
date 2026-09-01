-- Work Queue Ticket: #546
-- Follow-up to the schema-first atomic Room Factory migration.
--
-- The public Data API entrypoint must not itself be SECURITY DEFINER. Keep the
-- already-proven privileged implementation behind a dedicated, non-exposed
-- schema and make the public function SECURITY INVOKER. Authenticated callers
-- receive only USAGE + EXECUTE on this single internal bridge; PostgREST must
-- continue to reject the internal schema itself.

create schema if not exists room_factory_internal;

revoke all on schema room_factory_internal from public, anon, service_role;
grant usage on schema room_factory_internal to authenticated;

create or replace function room_factory_internal.create_room_factory_room_atomic(
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
language sql
security definer
set search_path = ''
as $$
  select *
  from private.create_room_factory_room_atomic(
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
  );
$$;

revoke all on function room_factory_internal.create_room_factory_room_atomic(
  uuid, uuid, text, text, text, text, text, text, text, text, text, jsonb
) from public, anon, service_role;
grant execute on function room_factory_internal.create_room_factory_room_atomic(
  uuid, uuid, text, text, text, text, text, text, text, text, text, jsonb
) to authenticated;

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
language sql
security invoker
set search_path = ''
as $$
  select *
  from room_factory_internal.create_room_factory_room_atomic(
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
  );
$$;

revoke all on function public.create_room_factory_room_atomic(
  uuid, uuid, text, text, text, text, text, text, text, text, text, jsonb
) from public, anon, service_role;
grant execute on function public.create_room_factory_room_atomic(
  uuid, uuid, text, text, text, text, text, text, text, text, text, jsonb
) to authenticated;

comment on schema room_factory_internal is
  'Non-exposed bridge for privileged Room Factory transaction execution. Not an API schema.';

comment on function room_factory_internal.create_room_factory_room_atomic(
  uuid, uuid, text, text, text, text, text, text, text, text, text, jsonb
) is
  'Non-exposed SECURITY DEFINER bridge to the validated private Room Factory implementation. Authenticated role may execute only through database privileges; Data API exposure is forbidden and tested.';

comment on function public.create_room_factory_room_atomic(
  uuid, uuid, text, text, text, text, text, text, text, text, text, jsonb
) is
  'Authenticated SECURITY INVOKER Data API entrypoint. Delegates to a non-exposed internal SECURITY DEFINER bridge; the public function itself never elevates privileges.';
