-- RoyalCommandAI migration-drift semantic evidence snapshot
-- READ-ONLY / fail-closed. This script does not modify Hosted Supabase state.
--
-- Purpose: satisfy the schema-state portion of launch blocker #662 acceptance
-- without pretending that semantic presence resolves timestamp history drift.
-- Same-name/different-version migrations still require exact linked CLI
-- `supabase migration list --linked` and `supabase db push --linked --dry-run`
-- evidence before any Hosted schema staging or migration-history repair.

begin read only;

select jsonb_build_object(
  'atomic_room_factory_encounter_creation', jsonb_build_object(
    'encounter_column_present', exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'room_factory_manifests'
        and column_name = 'encounter_session_id'
    ),
    'owner_encounter_unique_index_present', exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'room_factory_manifests'
        and indexname = 'room_factory_manifests_owner_encounter_uidx'
        and indexdef ilike '%(owner_id, encounter_session_id)%'
        and indexdef ilike '%WHERE (encounter_session_id IS NOT NULL)%'
    ),
    'encounter_consistency_constraint_present', exists (
      select 1
      from pg_constraint constraint_row
      join pg_class relation on relation.oid = constraint_row.conrelid
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relname = 'room_factory_manifests'
        and constraint_row.conname = 'room_factory_manifests_encounter_consistency'
    ),
    'private_atomic_present', exists (
      select 1
      from pg_proc function_row
      join pg_namespace namespace on namespace.oid = function_row.pronamespace
      where namespace.nspname = 'private'
        and function_row.proname = 'create_room_factory_room_atomic'
        and function_row.pronargs = 12
    ),
    'private_atomic_rejects_null_encounter', exists (
      select 1
      from pg_proc function_row
      join pg_namespace namespace on namespace.oid = function_row.pronamespace
      where namespace.nspname = 'private'
        and function_row.proname = 'create_room_factory_room_atomic'
        and function_row.pronargs = 12
        and pg_get_functiondef(function_row.oid)
          ilike '%encounterSessionId is required for atomic Room creation%'
    )
  ),
  'harden_room_factory_atomic_invoker', jsonb_build_object(
    'public_entrypoint_security_invoker', coalesce((
      select not function_row.prosecdef
      from pg_proc function_row
      join pg_namespace namespace on namespace.oid = function_row.pronamespace
      where namespace.nspname = 'public'
        and function_row.proname = 'create_room_factory_room_atomic'
        and function_row.pronargs = 12
      limit 1
    ), false),
    'internal_bridge_security_definer', coalesce((
      select function_row.prosecdef
      from pg_proc function_row
      join pg_namespace namespace on namespace.oid = function_row.pronamespace
      where namespace.nspname = 'room_factory_internal'
        and function_row.proname = 'create_room_factory_room_atomic'
        and function_row.pronargs = 12
      limit 1
    ), false),
    'authenticated_internal_schema_usage',
      has_schema_privilege('authenticated', 'room_factory_internal', 'USAGE'),
    'anon_internal_schema_usage',
      has_schema_privilege('anon', 'room_factory_internal', 'USAGE')
  ),
  'layout_editor_trusted_devices_v1', jsonb_build_object(
    'four_tables_present', (
      select count(*) = 4
      from information_schema.tables
      where table_schema = 'public'
        and table_name in (
          'layout_editor_trusted_devices',
          'layout_editor_sessions',
          'layout_editor_enrollment_codes',
          'layout_editor_audit_log'
        )
    ),
    'four_tables_rls_enabled', (
      select count(*) = 4
      from pg_class relation
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relname in (
          'layout_editor_trusted_devices',
          'layout_editor_sessions',
          'layout_editor_enrollment_codes',
          'layout_editor_audit_log'
        )
        and relation.relrowsecurity
    ),
    'anon_or_authenticated_table_grants', (
      select count(*)
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name in (
          'layout_editor_trusted_devices',
          'layout_editor_sessions',
          'layout_editor_enrollment_codes',
          'layout_editor_audit_log'
        )
        and grantee in ('anon', 'authenticated')
    ),
    'expected_indexes_present', (
      select count(*) = 2
      from pg_indexes
      where schemaname = 'public'
        and indexname in (
          'layout_editor_trusted_devices_user_active_idx',
          'layout_editor_sessions_user_expiry_idx'
        )
    )
  ),
  'customer_room_designer_v1', jsonb_build_object(
    'room_ui_designs_present', exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = 'room_ui_designs'
    ),
    'rls_enabled', coalesce((
      select relation.relrowsecurity
      from pg_class relation
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relname = 'room_ui_designs'
    ), false),
    'expected_policy_count', (
      select count(*)
      from pg_policies
      where schemaname = 'public'
        and tablename = 'room_ui_designs'
        and policyname in (
          'room_ui_designs_select_member',
          'room_ui_designs_insert_owner',
          'room_ui_designs_update_owner',
          'room_ui_designs_delete_owner'
        )
    ),
    'authenticated_select_insert_update_delete', (
      has_table_privilege('authenticated', 'public.room_ui_designs', 'SELECT')
      and has_table_privilege('authenticated', 'public.room_ui_designs', 'INSERT')
      and has_table_privilege('authenticated', 'public.room_ui_designs', 'UPDATE')
      and has_table_privilege('authenticated', 'public.room_ui_designs', 'DELETE')
    )
  ),
  'allow_room_owner_delete_remote_anomaly', jsonb_build_object(
    'migration_history_present', exists (
      select 1
      from supabase_migrations.schema_migrations
      where name = 'allow_room_owner_delete'
    ),
    'rooms_delete_owner_policy_present', exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'rooms'
        and policyname = 'rooms_delete_owner'
    ),
    'rooms_delete_owner_policy_qual', coalesce((
      select qual
      from pg_policies
      where schemaname = 'public'
        and tablename = 'rooms'
        and policyname = 'rooms_delete_owner'
      limit 1
    ), 'ABSENT')
  ),
  'harden_room_household_insert_history_drift', jsonb_build_object(
    'remote_history', coalesce((
      select jsonb_agg(
        jsonb_build_object('version', version, 'name', name)
        order by version
      )
      from supabase_migrations.schema_migrations
      where name in (
        'harden_room_household_insert_rls',
        'align_room_household_insert_policy'
      )
    ), '[]'::jsonb),
    'rooms_insert_policy_present', exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'rooms'
        and policyname = 'rooms_insert'
    ),
    'rooms_insert_policy_roles', coalesce((
      select to_jsonb(roles)
      from pg_policies
      where schemaname = 'public'
        and tablename = 'rooms'
        and policyname = 'rooms_insert'
      limit 1
    ), '[]'::jsonb),
    'rooms_insert_policy_with_check', coalesce((
      select with_check
      from pg_policies
      where schemaname = 'public'
        and tablename = 'rooms'
        and policyname = 'rooms_insert'
      limit 1
    ), 'ABSENT'),
    'household_member_helper_present',
      to_regprocedure('private.is_household_member(uuid)') is not null,
    'household_member_helper_definition', coalesce((
      select pg_get_functiondef(function_row.oid)
      from pg_proc function_row
      join pg_namespace namespace on namespace.oid = function_row.pronamespace
      where namespace.nspname = 'private'
        and function_row.proname = 'is_household_member'
        and pg_get_function_identity_arguments(function_row.oid) = 'h_id uuid'
      limit 1
    ), 'ABSENT'),
    'anon_table_insert_privilege',
      has_table_privilege('anon', 'public.rooms', 'INSERT'),
    'authenticated_table_insert_privilege',
      has_table_privilege('authenticated', 'public.rooms', 'INSERT')
  ),
  'scope_matter_staff_access_local_only', jsonb_build_object(
    'migration_history_present', exists (
      select 1
      from supabase_migrations.schema_migrations
      where name = 'scope_matter_staff_access'
    ),
    'assignment_rpc_present', exists (
      select 1
      from pg_proc function_row
      join pg_namespace namespace on namespace.oid = function_row.pronamespace
      where namespace.nspname = 'public'
        and function_row.proname = 'set_matter_staff_assignment'
    ),
    'assignment_helper_present', exists (
      select 1
      from pg_proc function_row
      join pg_namespace namespace on namespace.oid = function_row.pronamespace
      where namespace.nspname = 'private'
        and function_row.proname = 'is_assigned_matter_staff'
    ),
    'authenticated_can_update_client_id',
      has_column_privilege('authenticated', 'public.matters', 'client_id', 'UPDATE'),
    'authenticated_can_update_assigned_staff_id',
      has_column_privilege('authenticated', 'public.matters', 'assigned_staff_id', 'UPDATE'),
    'matter_total', (
      select count(*)
      from public.matters
    ),
    'matter_assigned', (
      select count(*)
      from public.matters
      where assigned_staff_id is not null
    )
  )
) as migration_drift_semantic_snapshot;

rollback;
