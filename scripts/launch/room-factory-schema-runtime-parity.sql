-- Royal Command Room Factory schema/runtime parity preflight.
-- READ ONLY: this script must not mutate schema, data, Auth, Room state, or launch state.
--
-- Purpose:
-- The #609 runtime candidate sends a NULL encounter key for ordinary non-encounter
-- Room creation. The hosted private atomic function must therefore support NULL
-- encounters before that runtime can be deployed. Checking only the migration
-- version is not sufficient evidence because function drift is also possible.

begin transaction read only;

with target_function as (
  select
    p.oid,
    pg_get_functiondef(p.oid) as definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private'
    and p.proname = 'create_room_factory_room_atomic'
    and pg_get_function_identity_arguments(p.oid) =
      'p_encounter_session_id uuid, p_household_id uuid, p_household_name text, p_room_name text, p_room_description text, p_language_pref text, p_factory_version text, p_template_id text, p_country_code text, p_language_tag text, p_country_profile_status text, p_manifest jsonb'
), facts as (
  select
    exists (
      select 1
      from supabase_migrations.schema_migrations
      where version = '20260901025800'
    ) as migration_present,
    (select count(*) from target_function) as function_count,
    coalesce((select definition from target_function limit 1), '') as definition
)
select
  'room_factory.schema.migration_20260901025800'::text as metric,
  case when migration_present then 'PASS' else 'BLOCKED' end as status,
  case when migration_present
    then 'hosted migration version present'
    else 'hosted migration version absent'
  end as detail
from facts

union all

select
  'room_factory.runtime.private_atomic_function',
  case when function_count = 1 then 'PASS' else 'BLOCKED' end,
  'matching_function_count=' || function_count::text
from facts

union all

select
  'room_factory.runtime.null_encounter_supported',
  case
    when function_count = 1
      and definition not ilike '%encounterSessionId is required for atomic Room creation.%'
      and definition ilike '%if p_encounter_session_id is null then%'
      and definition ilike '%Non-encounter Room creation must not persist an encounterSessionId.%'
    then 'PASS'
    else 'BLOCKED'
  end,
  case
    when definition ilike '%encounterSessionId is required for atomic Room creation.%'
      then 'hosted function still rejects NULL encounter keys'
    when function_count <> 1
      then 'expected private atomic function not uniquely resolved'
    when definition not ilike '%Non-encounter Room creation must not persist an encounterSessionId.%'
      then 'candidate non-encounter manifest guard not verified'
    else 'NULL encounter semantics verified'
  end
from facts

union all

select
  'room_factory.runtime.encounter_reuse_guard',
  case
    when function_count = 1
      and definition ilike '%if p_encounter_session_id is not null then%'
    then 'PASS'
    else 'BLOCKED'
  end,
  case
    when definition ilike '%if p_encounter_session_id is not null then%'
      then 'reuse lookup is guarded to encounter-backed creation'
    else 'non-null encounter reuse guard not verified'
  end
from facts

union all

select
  'room_factory.runtime.function_fingerprint',
  'INFO',
  case when function_count = 1
    then 'md5=' || md5(definition)
    else 'function unavailable'
  end
from facts

order by metric;

rollback;
