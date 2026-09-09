-- October rollout Hosted Supabase authentication/data-isolation readiness.
--
-- SAFETY: READ ONLY. This script performs no DDL/DML/Auth/Storage mutation,
-- does not run or repair migrations, and cannot authorize Production deployment,
-- Matter/profile mutation, provider/payment activation, or Country READY.
--
-- Purpose:
-- 1. Verify RLS exists on the launch-critical Legal Matter/profile surfaces.
-- 2. Distinguish raw SQL grants from reachable end-user authority.
-- 3. Fail closed until profile role authority is server-controlled and signup
--    metadata cannot mint privileged roles.
-- 4. Fail closed until Matter client ownership/staff assignment are removed from
--    ordinary authenticated UPDATE and staff access is assignment-scoped.
-- 5. Verify security-critical helper/trigger definitions, not merely their names,
--    so a placeholder or weakened function cannot satisfy this database gate.
--
-- Passing this database snapshot is not launch approval. Exact linked migration
-- safety, controlled Hosted staging/read-back, authenticated negative tests,
-- legal/privacy/recording review, payments, QA/security, Preview, rollback and
-- protected promotion remain separate gates.

begin read only;
set local statement_timeout = '15s';

with
rls_state as (
  select
    c.relname as table_name,
    c.relrowsecurity as rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in (
      'profiles',
      'matters',
      'matter_documents',
      'matter_messages',
      'matter_chat_reads'
    )
),
profile_policy_state as (
  select
    exists (
      select 1
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = 'profiles'
        and p.cmd in ('UPDATE', 'ALL')
        and ('authenticated' = any(p.roles) or 'public' = any(p.roles))
    ) as authenticated_or_public_update_policy_exists,
    not exists (
      select 1
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = 'profiles'
        and p.cmd in ('UPDATE', 'ALL')
        and ('anon' = any(p.roles) or 'public' = any(p.roles))
        and (
          p.qual is null
          or p.qual not ilike '%auth.uid()%'
        )
    ) as anon_update_policies_uid_scoped
),
profile_guard_function as (
  select
    p.oid,
    p.prosecdef,
    coalesce(array_to_string(p.proconfig, '|'), '') as function_config,
    regexp_replace(lower(pg_get_functiondef(p.oid)), '\s+', ' ', 'g') as function_def
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private'
    and p.proname = 'guard_profile_role_change'
    and pg_get_function_identity_arguments(p.oid) = ''
  limit 1
),
profile_guard_trigger as (
  select
    regexp_replace(lower(pg_get_triggerdef(tg.oid)), '\s+', ' ', 'g') as trigger_def
  from pg_trigger tg
  join pg_class c on c.oid = tg.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'profiles'
    and tg.tgname = 'guard_profile_role_change'
    and not tg.tgisinternal
    and tg.tgenabled <> 'D'
  limit 1
),
handle_new_user_function as (
  select
    p.oid,
    p.prosecdef,
    coalesce(array_to_string(p.proconfig, '|'), '') as function_config,
    regexp_replace(lower(pg_get_functiondef(p.oid)), '\s+', ' ', 'g') as function_def
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'handle_new_user'
    and pg_get_function_identity_arguments(p.oid) = ''
  limit 1
),
profile_role_state as (
  select
    exists (select 1 from profile_guard_trigger) as guard_trigger_present,
    exists (
      select 1
      from profile_guard_trigger
      where trigger_def like '%before insert or update of role on public.profiles%'
        and trigger_def like '%for each row execute function private.guard_profile_role_change()%'
    ) as guard_trigger_role_scope_verified,
    exists (select 1 from profile_guard_function) as guard_function_present,
    coalesce((select prosecdef from profile_guard_function), false)
      as guard_security_definer,
    coalesce((
      select function_config like '%search_path=pg_catalog, auth, public, private%'
      from profile_guard_function
    ), false) as guard_search_path_locked,
    coalesce((
      select
        function_def like '%auth.uid() is not null%'
        and function_def like '%tg_op = ''insert''%'
        and function_def like '%new.role is distinct from ''client''%'
        and function_def like '%tg_op = ''update''%'
        and function_def like '%new.role is distinct from old.role%'
      from profile_guard_function
    ), false) as guard_role_semantics_verified,
    case
      when not exists (select 1 from profile_guard_function) then false
      else not has_function_privilege(
        'anon',
        (select oid from profile_guard_function),
        'EXECUTE'
      )
    end as guard_anon_execute_blocked,
    case
      when not exists (select 1 from profile_guard_function) then false
      else not has_function_privilege(
        'authenticated',
        (select oid from profile_guard_function),
        'EXECUTE'
      )
    end as guard_authenticated_execute_blocked,
    exists (select 1 from handle_new_user_function) as handle_new_user_present,
    coalesce((select prosecdef from handle_new_user_function), false)
      as handle_new_user_security_definer,
    coalesce((
      select function_config like '%search_path=public%'
      from handle_new_user_function
    ), false) as handle_new_user_search_path_locked,
    case
      when not exists (select 1 from handle_new_user_function) then false
      else not has_function_privilege(
        'anon',
        (select oid from handle_new_user_function),
        'EXECUTE'
      )
    end as handle_new_user_anon_execute_blocked,
    case
      when not exists (select 1 from handle_new_user_function) then false
      else not has_function_privilege(
        'authenticated',
        (select oid from handle_new_user_function),
        'EXECUTE'
      )
    end as handle_new_user_authenticated_execute_blocked,
    coalesce((
      select function_def not like '%raw_user_meta_data->>''role''%'
      from handle_new_user_function
    ), false) as signup_role_metadata_not_consumed,
    coalesce((
      select
        function_def like '%''client''%'
        and function_def not like '%''staff''%'
        and function_def not like '%''admin''%'
      from handle_new_user_function
    ), false) as signup_fixed_nonprivileged_role,
    coalesce((
      select
        position(
          'role ='
          in split_part(function_def, 'on conflict (id) do update set', 2)
        ) = 0
      from handle_new_user_function
    ), false) as signup_upsert_preserves_existing_role,
    has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE')
      as authenticated_role_update_grant,
    has_column_privilege('anon', 'public.profiles', 'role', 'UPDATE')
      as anon_role_update_grant
),
is_admin_function as (
  select
    p.oid,
    p.prosecdef,
    coalesce(array_to_string(p.proconfig, '|'), '') as function_config,
    regexp_replace(lower(pg_get_functiondef(p.oid)), '\s+', ' ', 'g') as function_def
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private'
    and p.proname = 'is_admin'
    and pg_get_function_identity_arguments(p.oid) = ''
  limit 1
),
is_assigned_staff_function as (
  select
    p.oid,
    p.prosecdef,
    coalesce(array_to_string(p.proconfig, '|'), '') as function_config,
    regexp_replace(lower(pg_get_functiondef(p.oid)), '\s+', ' ', 'g') as function_def
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private'
    and p.proname = 'is_assigned_matter_staff'
    and pg_get_function_identity_arguments(p.oid) = 'm_id uuid'
  limit 1
),
assignment_rpc_function as (
  select
    p.oid,
    p.prosecdef,
    coalesce(array_to_string(p.proconfig, '|'), '') as function_config,
    regexp_replace(lower(pg_get_functiondef(p.oid)), '\s+', ' ', 'g') as function_def
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'set_matter_staff_assignment'
    and pg_get_function_identity_arguments(p.oid) = 'p_matter_id uuid, p_staff_id uuid'
  limit 1
),
matter_contract_state as (
  select
    not has_column_privilege(
      'authenticated', 'public.matters', 'client_id', 'UPDATE'
    ) as authenticated_client_id_update_blocked,
    not has_column_privilege(
      'authenticated', 'public.matters', 'assigned_staff_id', 'UPDATE'
    ) as authenticated_assignment_update_blocked,
    not exists (
      select 1
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = 'matters'
        and p.cmd in ('UPDATE', 'ALL')
        and ('anon' = any(p.roles) or 'public' = any(p.roles))
    ) as anon_matter_update_policy_absent,
    exists (select 1 from is_admin_function) as scoped_admin_helper_present,
    coalesce((select prosecdef from is_admin_function), false)
      as scoped_admin_helper_security_definer,
    coalesce((
      select function_config like '%search_path=%'
      from is_admin_function
    ), false) as scoped_admin_helper_search_path_locked,
    coalesce((
      select
        function_def like '%p.id = auth.uid()%'
        and function_def like '%p.role = ''admin''%'
      from is_admin_function
    ), false) as scoped_admin_helper_semantics_verified,
    case
      when not exists (select 1 from is_admin_function) then false
      else has_function_privilege(
        'authenticated',
        (select oid from is_admin_function),
        'EXECUTE'
      ) and not has_function_privilege(
        'anon',
        (select oid from is_admin_function),
        'EXECUTE'
      )
    end as scoped_admin_helper_execute_boundary_verified,
    exists (select 1 from is_assigned_staff_function)
      as assigned_staff_helper_present,
    coalesce((select prosecdef from is_assigned_staff_function), false)
      as assigned_staff_helper_security_definer,
    coalesce((
      select function_config like '%search_path=%'
      from is_assigned_staff_function
    ), false) as assigned_staff_helper_search_path_locked,
    coalesce((
      select
        function_def like '%m.id = m_id%'
        and function_def like '%m.assigned_staff_id = auth.uid()%'
        and function_def like '%p.id = auth.uid()%'
        and function_def like '%p.role = ''staff''%'
      from is_assigned_staff_function
    ), false) as assigned_staff_helper_semantics_verified,
    case
      when not exists (select 1 from is_assigned_staff_function) then false
      else has_function_privilege(
        'authenticated',
        (select oid from is_assigned_staff_function),
        'EXECUTE'
      ) and not has_function_privilege(
        'anon',
        (select oid from is_assigned_staff_function),
        'EXECUTE'
      )
    end as assigned_staff_helper_execute_boundary_verified,
    exists (select 1 from assignment_rpc_function) as assignment_rpc_present,
    coalesce((select prosecdef from assignment_rpc_function), false)
      as assignment_rpc_security_definer,
    coalesce((
      select function_config like '%search_path=%'
      from assignment_rpc_function
    ), false) as assignment_rpc_search_path_locked,
    coalesce((
      select
        function_def like '%auth.uid() is null%'
        and function_def like '%p.role = ''admin''%'
        and function_def like '%p.role = ''staff''%'
        and function_def like '%set assigned_staff_id = p_staff_id%'
        and function_def not like '%set client_id =%'
      from assignment_rpc_function
    ), false) as assignment_rpc_semantics_verified,
    case
      when not exists (select 1 from assignment_rpc_function) then false
      else has_function_privilege(
        'authenticated',
        (select oid from assignment_rpc_function),
        'EXECUTE'
      ) and not has_function_privilege(
        'anon',
        (select oid from assignment_rpc_function),
        'EXECUTE'
      )
    end as assignment_rpc_execute_boundary_verified,
    not exists (
      select 1
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename in (
          'matters',
          'matter_documents',
          'matter_messages',
          'matter_chat_reads'
        )
        and (
          coalesce(p.qual, '') ilike '%is_staff_or_admin%'
          or coalesce(p.with_check, '') ilike '%is_staff_or_admin%'
        )
    ) as broad_staff_policy_removed,
    exists (
      select 1
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename in (
          'matters',
          'matter_documents',
          'matter_messages',
          'matter_chat_reads'
        )
        and (
          coalesce(p.qual, '') ilike '%is_assigned_matter_staff%'
          or coalesce(p.with_check, '') ilike '%is_assigned_matter_staff%'
        )
    ) as assigned_staff_policy_present,
    exists (
      select 1
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = 'matters'
        and p.cmd in ('UPDATE', 'ALL')
        and p.with_check is not null
        and coalesce(p.qual, '') ilike '%is_assigned_matter_staff%'
        and coalesce(p.with_check, '') ilike '%is_assigned_matter_staff%'
    ) as matter_update_with_check_scoped
),
policy_inventory as (
  select
    p.tablename,
    p.policyname,
    p.cmd,
    p.roles,
    p.qual,
    p.with_check
  from pg_policies p
  where p.schemaname = 'public'
    and p.tablename in (
      'profiles',
      'matters',
      'matter_documents',
      'matter_messages',
      'matter_chat_reads'
    )
),
migration_state as (
  select
    exists (
      select 1
      from supabase_migrations.schema_migrations
      where name = 'scope_matter_staff_access'
    ) as scope_matter_staff_access_recorded,
    exists (
      select 1
      from supabase_migrations.schema_migrations
      where name = 'harden_profile_role_authority'
    ) as harden_profile_role_authority_recorded
),
aggregates as (
  select
    (select count(*) from public.profiles) as profiles_total,
    (select count(*) from public.matters) as matters_total,
    (
      select count(*)
      from public.matters
      where assigned_staff_id is not null
    ) as matters_assigned
)
select json_build_object(
  'contract_version', 2,
  'captured_at_utc', now(),
  'scope', 'AUTH_DATA_ISOLATION_DATABASE_EVIDENCE_ONLY',
  'rls', json_build_object(
    'tables', (
      select json_agg(
        json_build_object(
          'table', table_name,
          'rls_enabled', rls_enabled
        )
        order by table_name
      )
      from rls_state
    ),
    'all_required_tables_rls_enabled', (
      select count(*) = 5 and bool_and(rls_enabled)
      from rls_state
    )
  ),
  'profile_role_authority', json_build_object(
    'guard_trigger_present', guard_trigger_present,
    'guard_trigger_role_scope_verified', guard_trigger_role_scope_verified,
    'guard_function_present', guard_function_present,
    'guard_security_definer', guard_security_definer,
    'guard_search_path_locked', guard_search_path_locked,
    'guard_role_semantics_verified', guard_role_semantics_verified,
    'guard_anon_execute_blocked', guard_anon_execute_blocked,
    'guard_authenticated_execute_blocked', guard_authenticated_execute_blocked,
    'handle_new_user_present', handle_new_user_present,
    'handle_new_user_security_definer', handle_new_user_security_definer,
    'handle_new_user_search_path_locked', handle_new_user_search_path_locked,
    'handle_new_user_anon_execute_blocked', handle_new_user_anon_execute_blocked,
    'handle_new_user_authenticated_execute_blocked',
      handle_new_user_authenticated_execute_blocked,
    'signup_role_metadata_not_consumed', signup_role_metadata_not_consumed,
    'signup_fixed_nonprivileged_role', signup_fixed_nonprivileged_role,
    'signup_upsert_preserves_existing_role', signup_upsert_preserves_existing_role,
    'authenticated_role_update_grant', authenticated_role_update_grant,
    'anon_role_update_grant', anon_role_update_grant,
    'authenticated_or_public_update_policy_exists',
      authenticated_or_public_update_policy_exists,
    'anon_update_policies_uid_scoped', anon_update_policies_uid_scoped,
    'profile_role_authority_ready', (
      anon_update_policies_uid_scoped
      and guard_trigger_role_scope_verified
      and guard_function_present
      and guard_security_definer
      and guard_search_path_locked
      and guard_role_semantics_verified
      and guard_anon_execute_blocked
      and guard_authenticated_execute_blocked
      and handle_new_user_present
      and handle_new_user_security_definer
      and handle_new_user_search_path_locked
      and handle_new_user_anon_execute_blocked
      and handle_new_user_authenticated_execute_blocked
      and signup_role_metadata_not_consumed
      and signup_fixed_nonprivileged_role
      and signup_upsert_preserves_existing_role
      and (
        not authenticated_role_update_grant
        or not authenticated_or_public_update_policy_exists
        or guard_trigger_role_scope_verified
      )
    )
  ),
  'matter_authority', json_build_object(
    'authenticated_client_id_update_blocked',
      authenticated_client_id_update_blocked,
    'authenticated_assignment_update_blocked',
      authenticated_assignment_update_blocked,
    'anon_matter_update_policy_absent', anon_matter_update_policy_absent,
    'scoped_admin_helper_present', scoped_admin_helper_present,
    'scoped_admin_helper_security_definer', scoped_admin_helper_security_definer,
    'scoped_admin_helper_search_path_locked', scoped_admin_helper_search_path_locked,
    'scoped_admin_helper_semantics_verified', scoped_admin_helper_semantics_verified,
    'scoped_admin_helper_execute_boundary_verified',
      scoped_admin_helper_execute_boundary_verified,
    'assigned_staff_helper_present', assigned_staff_helper_present,
    'assigned_staff_helper_security_definer', assigned_staff_helper_security_definer,
    'assigned_staff_helper_search_path_locked', assigned_staff_helper_search_path_locked,
    'assigned_staff_helper_semantics_verified', assigned_staff_helper_semantics_verified,
    'assigned_staff_helper_execute_boundary_verified',
      assigned_staff_helper_execute_boundary_verified,
    'assignment_rpc_present', assignment_rpc_present,
    'assignment_rpc_security_definer', assignment_rpc_security_definer,
    'assignment_rpc_search_path_locked', assignment_rpc_search_path_locked,
    'assignment_rpc_semantics_verified', assignment_rpc_semantics_verified,
    'assignment_rpc_execute_boundary_verified', assignment_rpc_execute_boundary_verified,
    'broad_staff_policy_removed', broad_staff_policy_removed,
    'assigned_staff_policy_present', assigned_staff_policy_present,
    'matter_update_with_check_scoped', matter_update_with_check_scoped,
    'matter_authority_ready', (
      authenticated_client_id_update_blocked
      and authenticated_assignment_update_blocked
      and anon_matter_update_policy_absent
      and scoped_admin_helper_present
      and scoped_admin_helper_security_definer
      and scoped_admin_helper_search_path_locked
      and scoped_admin_helper_semantics_verified
      and scoped_admin_helper_execute_boundary_verified
      and assigned_staff_helper_present
      and assigned_staff_helper_security_definer
      and assigned_staff_helper_search_path_locked
      and assigned_staff_helper_semantics_verified
      and assigned_staff_helper_execute_boundary_verified
      and assignment_rpc_present
      and assignment_rpc_security_definer
      and assignment_rpc_search_path_locked
      and assignment_rpc_semantics_verified
      and assignment_rpc_execute_boundary_verified
      and broad_staff_policy_removed
      and assigned_staff_policy_present
      and matter_update_with_check_scoped
    )
  ),
  'policy_inventory', (
    select coalesce(
      json_agg(to_jsonb(policy_inventory) order by tablename, policyname),
      '[]'::json
    )
    from policy_inventory
  ),
  'migration_history', (
    select row_to_json(migration_state)
    from migration_state
  ),
  'aggregate_counts', (
    select row_to_json(aggregates)
    from aggregates
  ),
  'auth_data_isolation_database_ready', (
    (select count(*) = 5 and bool_and(rls_enabled) from rls_state)
    and anon_update_policies_uid_scoped
    and guard_trigger_role_scope_verified
    and guard_function_present
    and guard_security_definer
    and guard_search_path_locked
    and guard_role_semantics_verified
    and guard_anon_execute_blocked
    and guard_authenticated_execute_blocked
    and handle_new_user_present
    and handle_new_user_security_definer
    and handle_new_user_search_path_locked
    and handle_new_user_anon_execute_blocked
    and handle_new_user_authenticated_execute_blocked
    and signup_role_metadata_not_consumed
    and signup_fixed_nonprivileged_role
    and signup_upsert_preserves_existing_role
    and (
      not authenticated_role_update_grant
      or not authenticated_or_public_update_policy_exists
      or guard_trigger_role_scope_verified
    )
    and authenticated_client_id_update_blocked
    and authenticated_assignment_update_blocked
    and anon_matter_update_policy_absent
    and scoped_admin_helper_present
    and scoped_admin_helper_security_definer
    and scoped_admin_helper_search_path_locked
    and scoped_admin_helper_semantics_verified
    and scoped_admin_helper_execute_boundary_verified
    and assigned_staff_helper_present
    and assigned_staff_helper_security_definer
    and assigned_staff_helper_search_path_locked
    and assigned_staff_helper_semantics_verified
    and assigned_staff_helper_execute_boundary_verified
    and assignment_rpc_present
    and assignment_rpc_security_definer
    and assignment_rpc_search_path_locked
    and assignment_rpc_semantics_verified
    and assignment_rpc_execute_boundary_verified
    and broad_staff_policy_removed
    and assigned_staff_policy_present
    and matter_update_with_check_scoped
  ),
  'overall_launch_approval', false,
  'overall_launch_approval_note',
    'Database auth/data-isolation evidence cannot approve country launch; linked migration safety, authenticated negative tests, legal/privacy, payments, QA, Preview and rollback remain separate gates.'
) as october_launch_auth_data_isolation_readiness
from profile_role_state
cross join profile_policy_state
cross join matter_contract_state;

rollback;
