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
profile_role_state as (
  select
    exists (
      select 1
      from pg_trigger tg
      join pg_class c on c.oid = tg.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'profiles'
        and tg.tgname = 'guard_profile_role_change'
        and not tg.tgisinternal
        and tg.tgenabled <> 'D'
    ) as guard_trigger_present,
    to_regprocedure('private.guard_profile_role_change()') is not null
      as guard_function_present,
    case
      when to_regprocedure('private.guard_profile_role_change()') is null then false
      else not has_function_privilege(
        'anon',
        to_regprocedure('private.guard_profile_role_change()'),
        'EXECUTE'
      )
    end as guard_anon_execute_blocked,
    case
      when to_regprocedure('private.guard_profile_role_change()') is null then false
      else not has_function_privilege(
        'authenticated',
        to_regprocedure('private.guard_profile_role_change()'),
        'EXECUTE'
      )
    end as guard_authenticated_execute_blocked,
    position(
      'raw_user_meta_data->>''role'''
      in lower(pg_get_functiondef('public.handle_new_user()'::regprocedure))
    ) = 0 as signup_role_metadata_not_consumed,
    has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE')
      as authenticated_role_update_grant,
    has_column_privilege('anon', 'public.profiles', 'role', 'UPDATE')
      as anon_role_update_grant
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
    to_regprocedure('private.is_admin()') is not null
      as scoped_admin_helper_present,
    to_regprocedure('private.is_assigned_matter_staff(uuid)') is not null
      as assigned_staff_helper_present,
    to_regprocedure('public.set_matter_staff_assignment(uuid,uuid)') is not null
      as assignment_rpc_present,
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
  'contract_version', 1,
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
    'guard_function_present', guard_function_present,
    'guard_anon_execute_blocked', guard_anon_execute_blocked,
    'guard_authenticated_execute_blocked', guard_authenticated_execute_blocked,
    'signup_role_metadata_not_consumed', signup_role_metadata_not_consumed,
    'authenticated_role_update_grant', authenticated_role_update_grant,
    'anon_role_update_grant', anon_role_update_grant,
    'authenticated_or_public_update_policy_exists',
      authenticated_or_public_update_policy_exists,
    'anon_update_policies_uid_scoped', anon_update_policies_uid_scoped,
    'profile_role_authority_ready', (
      anon_update_policies_uid_scoped
      and signup_role_metadata_not_consumed
      and (
        not authenticated_role_update_grant
        or not authenticated_or_public_update_policy_exists
        or (
          guard_trigger_present
          and guard_function_present
          and guard_anon_execute_blocked
          and guard_authenticated_execute_blocked
        )
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
    'assigned_staff_helper_present', assigned_staff_helper_present,
    'assignment_rpc_present', assignment_rpc_present,
    'broad_staff_policy_removed', broad_staff_policy_removed,
    'assigned_staff_policy_present', assigned_staff_policy_present,
    'matter_update_with_check_scoped', matter_update_with_check_scoped,
    'matter_authority_ready', (
      authenticated_client_id_update_blocked
      and authenticated_assignment_update_blocked
      and anon_matter_update_policy_absent
      and scoped_admin_helper_present
      and assigned_staff_helper_present
      and assignment_rpc_present
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
    and signup_role_metadata_not_consumed
    and (
      not authenticated_role_update_grant
      or not authenticated_or_public_update_policy_exists
      or (
        guard_trigger_present
        and guard_function_present
        and guard_anon_execute_blocked
        and guard_authenticated_execute_blocked
      )
    )
    and authenticated_client_id_update_blocked
    and authenticated_assignment_update_blocked
    and anon_matter_update_policy_absent
    and scoped_admin_helper_present
    and assigned_staff_helper_present
    and assignment_rpc_present
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
