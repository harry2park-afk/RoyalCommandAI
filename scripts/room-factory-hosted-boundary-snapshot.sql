-- October rollout Room Factory Hosted boundary evidence.
--
-- SAFETY: READ ONLY. This script does not create a Room, alter grants/RLS,
-- apply migrations, or authorize Production/country promotion. Any missing or
-- unsafe result remains a launch blocker until controlled staging plus
-- authenticated negative tests prove the intended behavior.

begin read only;
set local statement_timeout = '15s';

with atomic_functions as (
  select n.nspname as schema_name,
         p.oid,
         p.prosecdef as security_definer,
         r.rolname as owner_name,
         pg_get_functiondef(p.oid) as definition,
         has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
         has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
         has_function_privilege('public', p.oid, 'EXECUTE') as public_execute
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_roles r on r.oid = p.proowner
   where n.nspname in ('private', 'public', 'room_factory_internal')
     and p.proname = 'create_room_factory_room_atomic'
     and pg_get_function_identity_arguments(p.oid) =
       'p_encounter_session_id uuid, p_household_id uuid, p_household_name text, p_room_name text, p_room_description text, p_language_pref text, p_factory_version text, p_template_id text, p_country_code text, p_language_tag text, p_country_profile_status text, p_manifest jsonb'
),
private_atomic as (
  select * from atomic_functions where schema_name = 'private'
),
public_wrapper as (
  select * from atomic_functions where schema_name = 'public'
),
internal_wrapper as (
  select * from atomic_functions where schema_name = 'room_factory_internal'
)
select json_build_object(
  'private_atomic_exists', exists (select 1 from private_atomic),
  'private_atomic_security_definer', coalesce((select security_definer from private_atomic), false),
  'private_atomic_owner', (select owner_name from private_atomic),
  'private_atomic_anon_execute', coalesce((select anon_execute from private_atomic), false),
  'private_atomic_authenticated_execute', coalesce((select authenticated_execute from private_atomic), false),
  'private_atomic_public_execute', coalesce((select public_execute from private_atomic), false),
  'private_atomic_rejects_null_encounter', coalesce((
    select position(
      'encounterSessionId is required for atomic Room creation.' in definition
    ) > 0 from private_atomic
  ), false),
  'private_atomic_non_encounter_validation_present', coalesce((
    select position(
      'Non-encounter Room creation must not persist an encounterSessionId.' in definition
    ) > 0 from private_atomic
  ), false),
  'private_atomic_non_encounter_candidate_semantics', coalesce((
    select security_definer
       and owner_name = 'postgres'
       and not anon_execute
       and not authenticated_execute
       and not public_execute
       and position(
         'encounterSessionId is required for atomic Room creation.' in definition
       ) = 0
       and position(
         'Non-encounter Room creation must not persist an encounterSessionId.' in definition
       ) > 0
      from private_atomic
  ), false),
  'public_wrapper_exists', exists (select 1 from public_wrapper),
  'public_wrapper_security_definer', coalesce((select security_definer from public_wrapper), false),
  'public_wrapper_anon_execute', coalesce((select anon_execute from public_wrapper), false),
  'public_wrapper_authenticated_execute', coalesce((select authenticated_execute from public_wrapper), false),
  'public_wrapper_public_execute', coalesce((select public_execute from public_wrapper), false),
  'internal_wrapper_exists', exists (select 1 from internal_wrapper),
  'internal_wrapper_security_definer', coalesce((select security_definer from internal_wrapper), false),
  'internal_wrapper_anon_execute', coalesce((select anon_execute from internal_wrapper), false),
  'internal_wrapper_authenticated_execute', coalesce((select authenticated_execute from internal_wrapper), false),
  'internal_wrapper_public_execute', coalesce((select public_execute from internal_wrapper), false),
  'manifest_rows', (select count(*) from public.room_factory_manifests),
  'manifest_anon_insert', has_table_privilege('anon', 'public.room_factory_manifests', 'INSERT'),
  'manifest_authenticated_insert', has_table_privilege('authenticated', 'public.room_factory_manifests', 'INSERT'),
  'manifest_authenticated_update', has_table_privilege('authenticated', 'public.room_factory_manifests', 'UPDATE'),
  'manifest_authenticated_delete', has_table_privilege('authenticated', 'public.room_factory_manifests', 'DELETE'),
  'manifest_authenticated_select', has_table_privilege('authenticated', 'public.room_factory_manifests', 'SELECT'),
  'direct_authenticated_insert_policy_exists', exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename = 'room_factory_manifests'
       and cmd = 'INSERT'
       and ('authenticated' = any(roles) or 'public' = any(roles))
  )
) as room_factory_hosted_boundary;

with required(name) as (
  values
    ('room_factory_atomic_non_encounter'),
    ('room_factory_manifest_atomic_only')
)
select r.name as required_migration,
       exists (
         select 1
           from supabase_migrations.schema_migrations sm
          where sm.name = r.name
       ) as present_in_hosted_history
  from required r
 order by r.name;

rollback;
