-- RoyalCommandAI auth/data-isolation rollout evidence snapshot
-- READ-ONLY / fail-closed evidence only. No Hosted mutation and no launch-state transition.
-- Covers the current launch-critical identity/tenant surfaces: profiles, matters, Room Factory manifests,
-- and the signup profile bootstrap function.

begin read only;

with function_evidence as (
  select
    p.oid,
    p.prosecdef as security_definer,
    coalesce(p.proconfig, array[]::text[]) as config,
    pg_get_functiondef(p.oid) ilike '%raw_user_meta_data%role%' as uses_role_metadata,
    has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'handle_new_user'
  order by p.oid
  limit 1
), table_evidence as (
  select
    t.table_name,
    c.relrowsecurity as rls_enabled,
    (
      select count(*)::int
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = t.table_name
    ) as policy_count,
    has_table_privilege('anon', format('public.%I', t.table_name), 'INSERT') as anon_insert,
    has_table_privilege('anon', format('public.%I', t.table_name), 'UPDATE') as anon_update,
    has_table_privilege('anon', format('public.%I', t.table_name), 'DELETE') as anon_delete,
    has_table_privilege('anon', format('public.%I', t.table_name), 'TRUNCATE') as anon_truncate,
    has_table_privilege('authenticated', format('public.%I', t.table_name), 'INSERT') as authenticated_insert,
    has_table_privilege('authenticated', format('public.%I', t.table_name), 'UPDATE') as authenticated_update,
    has_table_privilege('authenticated', format('public.%I', t.table_name), 'DELETE') as authenticated_delete,
    has_table_privilege('authenticated', format('public.%I', t.table_name), 'TRUNCATE') as authenticated_truncate
  from (values ('profiles'), ('matters'), ('room_factory_manifests')) t(table_name)
  join pg_class c on c.relname = t.table_name
  join pg_namespace n on n.oid = c.relnamespace
    and n.nspname = 'public'
)
select jsonb_build_object(
  'critical_table_acl', (
    select jsonb_agg(to_jsonb(table_evidence) order by table_name)
    from table_evidence
  ),
  'sensitive_column_acl', jsonb_build_object(
    'profiles_role_anon_update',
      has_column_privilege('anon', 'public.profiles', 'role', 'UPDATE'),
    'profiles_role_authenticated_update',
      has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE'),
    'matters_client_id_anon_update',
      has_column_privilege('anon', 'public.matters', 'client_id', 'UPDATE'),
    'matters_client_id_authenticated_update',
      has_column_privilege('authenticated', 'public.matters', 'client_id', 'UPDATE'),
    'matters_assigned_staff_id_anon_update',
      has_column_privilege('anon', 'public.matters', 'assigned_staff_id', 'UPDATE'),
    'matters_assigned_staff_id_authenticated_update',
      has_column_privilege('authenticated', 'public.matters', 'assigned_staff_id', 'UPDATE')
  ),
  'live_row_shape', jsonb_build_object(
    'profiles_total', (select count(*)::int from public.profiles),
    'matters_total', (select count(*)::int from public.matters),
    'matters_assigned', (
      select count(*)::int
      from public.matters
      where assigned_staff_id is not null
    ),
    'room_factory_manifests_total', (select count(*)::int from public.room_factory_manifests),
    'room_factory_manifests_null_encounter', (
      select count(*)::int
      from public.room_factory_manifests
      where encounter_session_id is null
    )
  ),
  'handle_new_user', coalesce(
    (
      select jsonb_build_object(
        'present', true,
        'security_definer', security_definer,
        'config', to_jsonb(config),
        'uses_role_metadata', uses_role_metadata,
        'anon_execute', anon_execute,
        'authenticated_execute', authenticated_execute,
        'hardened_search_path', ('search_path=pg_catalog' = any(config))
      )
      from function_evidence
    ),
    jsonb_build_object('present', false)
  ),
  'candidate_migrations_applied', jsonb_build_object(
    'harden_profile_role_authority', (
      select count(*)::int
      from supabase_migrations.schema_migrations
      where name = 'harden_profile_role_authority'
    ),
    'scope_matter_staff_access', (
      select count(*)::int
      from supabase_migrations.schema_migrations
      where name = 'scope_matter_staff_access'
    ),
    'room_factory_manifest_acl_hardening', (
      select count(*)::int
      from supabase_migrations.schema_migrations
      where name = 'room_factory_manifest_acl_hardening'
    )
  ),
  'launch_isolation_gate', jsonb_build_object(
    'profile_role_direct_update_blocked',
      not has_column_privilege('anon', 'public.profiles', 'role', 'UPDATE')
      and not has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE'),
    'matter_identity_assignment_direct_update_blocked',
      not has_column_privilege('anon', 'public.matters', 'client_id', 'UPDATE')
      and not has_column_privilege('anon', 'public.matters', 'assigned_staff_id', 'UPDATE')
      and not has_column_privilege('authenticated', 'public.matters', 'client_id', 'UPDATE')
      and not has_column_privilege('authenticated', 'public.matters', 'assigned_staff_id', 'UPDATE'),
    'manifest_direct_write_blocked_for_clients',
      not has_table_privilege('anon', 'public.room_factory_manifests', 'INSERT,UPDATE,DELETE,TRUNCATE')
      and not has_table_privilege('authenticated', 'public.room_factory_manifests', 'INSERT,UPDATE,DELETE,TRUNCATE'),
    'signup_role_metadata_path_blocked',
      coalesce((select not uses_role_metadata from function_evidence), false),
    'signup_security_definer_search_path_hardened',
      coalesce(
        (
          select security_definer
            and ('search_path=pg_catalog' = any(config))
          from function_evidence
        ),
        false
      )
  )
) as auth_data_isolation_wave_snapshot;

rollback;
