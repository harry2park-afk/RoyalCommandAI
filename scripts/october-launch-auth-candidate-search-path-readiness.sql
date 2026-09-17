-- October rollout Auth/Data Isolation candidate search-path evidence.
--
-- SAFETY: READ ONLY. This does not apply migrations, mutate Hosted data/Auth,
-- authorize Production deployment, or mark any country READY.
--
-- Purpose: independently verify the exact SECURITY DEFINER isolation contract
-- used by the current #691 authorization candidate before any controlled Hosted
-- staging is treated as satisfying the broader launch gate.

begin read only;
set local statement_timeout = '10s';

with candidate_functions as (
  select
    n.nspname as schema_name,
    p.proname as function_name,
    p.oid,
    p.prosecdef as security_definer,
    coalesce(array_to_string(p.proconfig, '|'), '') as function_config
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where (n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) in (
    ('private', 'guard_profile_role_change', ''),
    ('public', 'handle_new_user', '')
  )
),
guard_state as (
  select
    exists (
      select 1 from candidate_functions
      where schema_name = 'private'
        and function_name = 'guard_profile_role_change'
    ) as present,
    coalesce((
      select security_definer from candidate_functions
      where schema_name = 'private'
        and function_name = 'guard_profile_role_change'
    ), false) as security_definer,
    coalesce((
      select function_config = 'search_path=pg_catalog'
      from candidate_functions
      where schema_name = 'private'
        and function_name = 'guard_profile_role_change'
    ), false) as search_path_isolated,
    case
      when not exists (
        select 1 from candidate_functions
        where schema_name = 'private'
          and function_name = 'guard_profile_role_change'
      ) then false
      else not has_function_privilege(
        'anon',
        (select oid from candidate_functions where schema_name = 'private' and function_name = 'guard_profile_role_change'),
        'EXECUTE'
      ) and not has_function_privilege(
        'authenticated',
        (select oid from candidate_functions where schema_name = 'private' and function_name = 'guard_profile_role_change'),
        'EXECUTE'
      )
    end as end_user_execute_blocked
),
signup_state as (
  select
    exists (
      select 1 from candidate_functions
      where schema_name = 'public'
        and function_name = 'handle_new_user'
    ) as present,
    coalesce((
      select security_definer from candidate_functions
      where schema_name = 'public'
        and function_name = 'handle_new_user'
    ), false) as security_definer,
    coalesce((
      select function_config = 'search_path=pg_catalog'
      from candidate_functions
      where schema_name = 'public'
        and function_name = 'handle_new_user'
    ), false) as search_path_isolated,
    case
      when not exists (
        select 1 from candidate_functions
        where schema_name = 'public'
          and function_name = 'handle_new_user'
      ) then false
      else not has_function_privilege(
        'anon',
        (select oid from candidate_functions where schema_name = 'public' and function_name = 'handle_new_user'),
        'EXECUTE'
      ) and not has_function_privilege(
        'authenticated',
        (select oid from candidate_functions where schema_name = 'public' and function_name = 'handle_new_user'),
        'EXECUTE'
      )
    end as end_user_execute_blocked
),
migration_state as (
  select exists (
    select 1
    from supabase_migrations.schema_migrations
    where name = 'harden_profile_role_authority'
  ) as harden_profile_role_authority_recorded
)
select json_build_object(
  'contract_version', 1,
  'captured_at_utc', now(),
  'scope', 'AUTH_CANDIDATE_SEARCH_PATH_EVIDENCE_ONLY',
  'profile_guard', row_to_json(guard_state),
  'handle_new_user', row_to_json(signup_state),
  'migration_history', row_to_json(migration_state),
  'candidate_search_path_contract_ready', (
    guard_state.present
    and guard_state.security_definer
    and guard_state.search_path_isolated
    and guard_state.end_user_execute_blocked
    and signup_state.present
    and signup_state.security_definer
    and signup_state.search_path_isolated
    and signup_state.end_user_execute_blocked
    and migration_state.harden_profile_role_authority_recorded
  ),
  'overall_launch_approval', false,
  'overall_launch_approval_note',
    'This narrow function-isolation snapshot cannot approve Hosted staging or country launch; linked migration evidence, full Auth/Matter isolation, authenticated negative tests, legal/privacy, payments, QA, Preview and rollback remain separate gates.'
) as october_launch_auth_candidate_search_path_readiness
from guard_state
cross join signup_state
cross join migration_state;

rollback;
