-- October rollout Room Factory Hosted boundary evidence.
--
-- SAFETY: READ ONLY. This script does not create a Room, alter grants/RLS,
-- apply migrations, or authorize Production/country promotion. Any missing or
-- unsafe result remains a launch blocker until controlled staging plus
-- authenticated negative tests prove the intended behavior.
--
-- IMPORTANT: raw SQL table/function grants and effective RLS policy surfaces
-- are reported separately. A raw table grant alone does not prove that RLS
-- permits a client mutation, while a client write policy still blocks the
-- intended atomic-only Room Factory boundary.

begin read only;
set local statement_timeout = '15s';

with atomic_functions as (
  select n.nspname as schema_name,
         p.oid,
         p.prosecdef as security_definer,
         r.rolname as owner_name,
         pg_get_functiondef(p.oid) as definition,
         has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute_grant,
         has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute_grant,
         has_function_privilege('public', p.oid, 'EXECUTE') as public_execute_grant,
         has_schema_privilege('anon', n.oid, 'USAGE') as anon_schema_usage,
         has_schema_privilege('authenticated', n.oid, 'USAGE') as authenticated_schema_usage
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
),
manifest_relation as (
  select c.relrowsecurity as rls_enabled
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname = 'room_factory_manifests'
),
manifest_policy as (
  select policyname, cmd, roles, qual, with_check
    from pg_policies
   where schemaname = 'public'
     and tablename = 'room_factory_manifests'
),
manifest_inventory as (
  select count(*) as manifest_rows,
         count(*) filter (where encounter_session_id is null) as null_encounter_rows,
         count(*) filter (where encounter_session_id is not null) as encounter_rows,
         count(distinct template_id) as distinct_template_ids,
         count(distinct country_code) as distinct_country_codes
    from public.room_factory_manifests
)
select json_build_object(
  'contract_version', 2,
  'scope', 'ROOM_FACTORY_HOSTED_BOUNDARY_ONLY',
  'private_atomic_exists', exists (select 1 from private_atomic),
  'private_atomic_security_definer', coalesce((select security_definer from private_atomic), false),
  'private_atomic_owner', (select owner_name from private_atomic),
  'private_atomic_anon_execute_grant', coalesce((select anon_execute_grant from private_atomic), false),
  'private_atomic_authenticated_execute_grant', coalesce((select authenticated_execute_grant from private_atomic), false),
  'private_atomic_public_execute_grant', coalesce((select public_execute_grant from private_atomic), false),
  'private_atomic_authenticated_schema_usage', coalesce((select authenticated_schema_usage from private_atomic), false),
  'private_atomic_rejects_null_encounter', coalesce((
    select position('encounterSessionId is required for atomic Room creation.' in definition) > 0
      from private_atomic
  ), false),
  'private_atomic_non_encounter_validation_present', coalesce((
    select position('Non-encounter Room creation must not persist an encounterSessionId.' in definition) > 0
      from private_atomic
  ), false),
  'public_wrapper', json_build_object(
    'exists', exists (select 1 from public_wrapper),
    'security_definer', coalesce((select security_definer from public_wrapper), false),
    'authenticated_execute_grant', coalesce((select authenticated_execute_grant from public_wrapper), false),
    'authenticated_schema_usage', coalesce((select authenticated_schema_usage from public_wrapper), false),
    'anon_execute_grant', coalesce((select anon_execute_grant from public_wrapper), false)
  ),
  'internal_wrapper', json_build_object(
    'exists', exists (select 1 from internal_wrapper),
    'security_definer', coalesce((select security_definer from internal_wrapper), false),
    'owner', (select owner_name from internal_wrapper),
    'authenticated_execute_grant', coalesce((select authenticated_execute_grant from internal_wrapper), false),
    'authenticated_schema_usage', coalesce((select authenticated_schema_usage from internal_wrapper), false),
    'anon_execute_grant', coalesce((select anon_execute_grant from internal_wrapper), false)
  ),
  'manifest', json_build_object(
    'rls_enabled', coalesce((select rls_enabled from manifest_relation), false),
    'rows', (select manifest_rows from manifest_inventory),
    'encounter_rows', (select encounter_rows from manifest_inventory),
    'null_encounter_rows', (select null_encounter_rows from manifest_inventory),
    'distinct_template_ids', (select distinct_template_ids from manifest_inventory),
    'distinct_country_codes', (select distinct_country_codes from manifest_inventory),
    'anon_insert_grant', has_table_privilege('anon', 'public.room_factory_manifests', 'INSERT'),
    'authenticated_insert_grant', has_table_privilege('authenticated', 'public.room_factory_manifests', 'INSERT'),
    'authenticated_update_grant', has_table_privilege('authenticated', 'public.room_factory_manifests', 'UPDATE'),
    'authenticated_delete_grant', has_table_privilege('authenticated', 'public.room_factory_manifests', 'DELETE'),
    'authenticated_select_grant', has_table_privilege('authenticated', 'public.room_factory_manifests', 'SELECT'),
    'anon_insert_policy_exists', exists (
      select 1 from manifest_policy
       where cmd in ('INSERT', 'ALL')
         and ('anon' = any(roles) or 'public' = any(roles))
    ),
    'authenticated_insert_policy_exists', exists (
      select 1 from manifest_policy
       where cmd in ('INSERT', 'ALL')
         and ('authenticated' = any(roles) or 'public' = any(roles))
    ),
    'authenticated_update_policy_exists', exists (
      select 1 from manifest_policy
       where cmd in ('UPDATE', 'ALL')
         and ('authenticated' = any(roles) or 'public' = any(roles))
    ),
    'authenticated_delete_policy_exists', exists (
      select 1 from manifest_policy
       where cmd in ('DELETE', 'ALL')
         and ('authenticated' = any(roles) or 'public' = any(roles))
    ),
    'policy_inventory', coalesce((
      select json_agg(json_build_object(
        'name', policyname,
        'command', cmd,
        'roles', roles
      ) order by policyname)
        from manifest_policy
    ), '[]'::json)
  ),
  'gates', json_build_object(
    'non_encounter_candidate_present', coalesce((
      select security_definer
         and owner_name = 'postgres'
         and not anon_execute_grant
         and not authenticated_execute_grant
         and not public_execute_grant
         and position('encounterSessionId is required for atomic Room creation.' in definition) = 0
         and position('Non-encounter Room creation must not persist an encounterSessionId.' in definition) > 0
        from private_atomic
    ), false),
    'manifest_atomic_only_boundary_present', (
      coalesce((select rls_enabled from manifest_relation), false)
      and not exists (
        select 1 from manifest_policy
         where cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
           and ('anon' = any(roles) or 'authenticated' = any(roles) or 'public' = any(roles))
      )
    )
  ),
  'overall_launch_approval', false,
  'overall_launch_approval_note',
    'This read-only snapshot separates raw SQL grants from effective RLS write-policy surfaces. It cannot approve launch or authorize Hosted mutation.'
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
