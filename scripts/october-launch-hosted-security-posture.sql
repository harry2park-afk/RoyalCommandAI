-- October rollout Hosted Supabase security-posture snapshot.
--
-- SAFETY: READ ONLY. This script performs no DDL/DML/Auth/Storage mutation,
-- does not run migrations, and does not authorize Production deployment,
-- provider/payment activation, or any Country/Compliance READY transition.
--
-- Purpose:
-- 1. Distinguish intentional RLS default-deny/service-role-only catalog tables
--    from client-accessible tables that require policy review.
-- 2. Fail closed on the launch-critical client write boundaries for profile role,
--    Matter ownership/assignment, and Room Factory manifests.
--
-- Passing this database-security snapshot is not launch approval. Human legal,
-- privacy/recording review, exact linked migration safety, payment sandbox/runtime,
-- authenticated browser/localization regression, QA/security, Preview smoke,
-- rollback, and protected promotion remain separate gates.

begin read only;
set local statement_timeout = '15s';

with
service_role_only_catalog(table_name) as (
  values
    ('communication_recording_policies'),
    ('rc_service_providers'),
    ('rc_service_provider_offers')
),
catalog_state as (
  select
    t.table_name,
    c.relrowsecurity as rls_enabled,
    has_table_privilege('anon', format('public.%I', t.table_name), 'SELECT') as anon_select,
    has_table_privilege('anon', format('public.%I', t.table_name), 'INSERT') as anon_insert,
    has_table_privilege('anon', format('public.%I', t.table_name), 'UPDATE') as anon_update,
    has_table_privilege('anon', format('public.%I', t.table_name), 'DELETE') as anon_delete,
    has_table_privilege('authenticated', format('public.%I', t.table_name), 'SELECT') as authenticated_select,
    has_table_privilege('authenticated', format('public.%I', t.table_name), 'INSERT') as authenticated_insert,
    has_table_privilege('authenticated', format('public.%I', t.table_name), 'UPDATE') as authenticated_update,
    has_table_privilege('authenticated', format('public.%I', t.table_name), 'DELETE') as authenticated_delete,
    has_table_privilege('service_role', format('public.%I', t.table_name), 'SELECT') as service_role_select,
    exists (
      select 1
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = t.table_name
        and (
          'anon' = any(p.roles)
          or 'authenticated' = any(p.roles)
          or 'public' = any(p.roles)
        )
    ) as client_policy_exists
  from service_role_only_catalog t
  join pg_class c on c.relname = t.table_name
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
),
catalog_gate as (
  select bool_and(
    rls_enabled
    and not anon_select
    and not anon_insert
    and not anon_update
    and not anon_delete
    and not authenticated_select
    and not authenticated_insert
    and not authenticated_update
    and not authenticated_delete
    and service_role_select
    and not client_policy_exists
  ) as service_role_only_catalog_ready
  from catalog_state
),
boundary_gate as (
  select
    (
      not has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE')
      and not has_column_privilege('anon', 'public.profiles', 'role', 'UPDATE')
    ) as profile_role_client_write_blocked,
    (
      not has_column_privilege('authenticated', 'public.matters', 'client_id', 'UPDATE')
      and not has_column_privilege('authenticated', 'public.matters', 'assigned_staff_id', 'UPDATE')
      and not has_column_privilege('anon', 'public.matters', 'client_id', 'UPDATE')
      and not has_column_privilege('anon', 'public.matters', 'assigned_staff_id', 'UPDATE')
    ) as matter_authority_client_write_blocked,
    (
      not has_table_privilege('anon', 'public.room_factory_manifests', 'INSERT')
      and not has_table_privilege('anon', 'public.room_factory_manifests', 'UPDATE')
      and not has_table_privilege('anon', 'public.room_factory_manifests', 'DELETE')
      and not has_table_privilege('authenticated', 'public.room_factory_manifests', 'INSERT')
      and not has_table_privilege('authenticated', 'public.room_factory_manifests', 'UPDATE')
      and not has_table_privilege('authenticated', 'public.room_factory_manifests', 'DELETE')
      and not exists (
        select 1
        from pg_policies p
        where p.schemaname = 'public'
          and p.tablename = 'room_factory_manifests'
          and p.cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
          and (
            'anon' = any(p.roles)
            or 'authenticated' = any(p.roles)
            or 'public' = any(p.roles)
          )
      )
    ) as room_factory_manifest_client_write_blocked
)
select json_build_object(
  'contract_version', 1,
  'captured_at_utc', now(),
  'scope', 'DATABASE_SECURITY_POSTURE_ONLY',
  'service_role_only_catalog', (
    select json_agg(json_build_object(
      'table', table_name,
      'rls_enabled', rls_enabled,
      'anon_select', anon_select,
      'anon_insert', anon_insert,
      'anon_update', anon_update,
      'anon_delete', anon_delete,
      'authenticated_select', authenticated_select,
      'authenticated_insert', authenticated_insert,
      'authenticated_update', authenticated_update,
      'authenticated_delete', authenticated_delete,
      'service_role_select', service_role_select,
      'client_policy_exists', client_policy_exists,
      'service_role_only_default_deny_ready', (
        rls_enabled
        and not anon_select
        and not anon_insert
        and not anon_update
        and not anon_delete
        and not authenticated_select
        and not authenticated_insert
        and not authenticated_update
        and not authenticated_delete
        and service_role_select
        and not client_policy_exists
      )
    ) order by table_name)
    from catalog_state
  ),
  'launch_critical_boundaries', json_build_object(
    'profile_role_client_write_blocked', profile_role_client_write_blocked,
    'matter_authority_client_write_blocked', matter_authority_client_write_blocked,
    'room_factory_manifest_client_write_blocked', room_factory_manifest_client_write_blocked
  ),
  'gates', json_build_object(
    'service_role_only_catalog_ready', service_role_only_catalog_ready,
    'launch_critical_client_write_boundaries_ready', (
      profile_role_client_write_blocked
      and matter_authority_client_write_blocked
      and room_factory_manifest_client_write_blocked
    )
  ),
  'database_security_posture_ready', (
    service_role_only_catalog_ready
    and profile_role_client_write_blocked
    and matter_authority_client_write_blocked
    and room_factory_manifest_client_write_blocked
  ),
  'overall_launch_approval', false,
  'overall_launch_approval_note',
    'This snapshot covers only selected Hosted database security boundaries. It cannot approve country launch.'
) as october_launch_hosted_security_posture
from catalog_gate
cross join boundary_gate;

rollback;
