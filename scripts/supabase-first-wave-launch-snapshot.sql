-- RoyalCommandAI first-wave launch evidence snapshot
-- READ-ONLY / fail-closed. This script does not modify Hosted Supabase state.
-- First-wave countries: AU, US, CA, KR, JP, GB.
-- Intended use: psql/Supabase SQL runner against the explicitly selected project.

begin read only;

select jsonb_build_object(
  'latest_migrations', (
    select jsonb_agg(x order by x.version desc)
    from (
      select version, name
      from supabase_migrations.schema_migrations
      order by version desc
      limit 8
    ) x
  ),
  'migration_version_alignment', (
    select jsonb_agg(q order by q.expected_version)
    from (
      select
        expected.name,
        expected.expected_version,
        count(applied.*) filter (where applied.version = expected.expected_version)::int as exact_version_rows,
        count(applied.*) filter (where applied.version <> expected.expected_version)::int as same_name_other_version_rows,
        coalesce(
          jsonb_agg(applied.version order by applied.version) filter (where applied.version is not null),
          '[]'::jsonb
        ) as hosted_versions
      from (
        values
          ('atomic_room_factory_encounter_creation', '20260831084700'),
          ('scope_matter_staff_access', '20260831225500'),
          ('harden_room_factory_atomic_invoker', '20260901022500'),
          ('room_factory_atomic_non_encounter', '20260901025800'),
          ('layout_editor_trusted_devices_v1', '20260904193500'),
          ('harden_profile_role_authority', '20260904105500'),
          ('customer_room_designer_v1', '20260905055000')
      ) expected(name, expected_version)
      left join supabase_migrations.schema_migrations applied
        on applied.name = expected.name
      group by expected.name, expected.expected_version
    ) q
  ),
  'known_remote_history_anomalies', (
    select jsonb_agg(q order by q.name)
    from (
      select
        expected.name,
        expected.baseline_classification,
        count(applied.*)::int as hosted_rows,
        coalesce(
          jsonb_agg(applied.version order by applied.version) filter (where applied.version is not null),
          '[]'::jsonb
        ) as hosted_versions
      from (
        values
          ('allow_room_owner_delete', 'REMOTE_NAME_PRESENT_WITHOUT_MATCHING_FILE_ON_BASELINE')
      ) expected(name, baseline_classification)
      left join supabase_migrations.schema_migrations applied
        on applied.name = expected.name
      group by expected.name, expected.baseline_classification
    ) q
  ),
  'required_migration_counts', (
    select jsonb_object_agg(name, cnt)
    from (
      select required.name, count(applied.*)::int as cnt
      from (
        values
          ('scope_matter_staff_access'),
          ('room_factory_atomic_non_encounter'),
          ('harden_profile_role_authority')
      ) required(name)
      left join supabase_migrations.schema_migrations applied
        on applied.name = required.name
      group by required.name
    ) q
  ),
  'matters', (
    select jsonb_build_object(
      'total', count(*)::int,
      'assigned', count(*) filter (where assigned_staff_id is not null)::int,
      'unassigned', count(*) filter (where assigned_staff_id is null)::int
    )
    from public.matters
  ),
  'matter_isolation', jsonb_build_object(
    'client_id_updateable_by_authenticated',
      has_column_privilege('authenticated', 'public.matters', 'client_id', 'UPDATE'),
    'assigned_staff_id_updateable_by_authenticated',
      has_column_privilege('authenticated', 'public.matters', 'assigned_staff_id', 'UPDATE'),
    'private_is_admin_present', (
      select exists(
        select 1
        from pg_proc function
        join pg_namespace namespace on namespace.oid = function.pronamespace
        where namespace.nspname = 'private'
          and function.proname = 'is_admin'
      )
    ),
    'private_is_assigned_matter_staff_present', (
      select exists(
        select 1
        from pg_proc function
        join pg_namespace namespace on namespace.oid = function.pronamespace
        where namespace.nspname = 'private'
          and function.proname = 'is_assigned_matter_staff'
      )
    ),
    'set_matter_staff_assignment_present', (
      select exists(
        select 1
        from pg_proc function
        join pg_namespace namespace on namespace.oid = function.pronamespace
        where function.proname = 'set_matter_staff_assignment'
      )
    ),
    'policies_using_broad_staff_helper', (
      select count(*)::int
      from pg_policies
      where schemaname = 'public'
        and tablename = 'matters'
        and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ilike '%is_staff_or_admin%'
    ),
    'policies_using_assignment_helper', (
      select count(*)::int
      from pg_policies
      where schemaname = 'public'
        and tablename = 'matters'
        and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ilike '%is_assigned_matter_staff%'
    )
  ),
  'auth_consents', (
    select count(*)::int
    from public.auth_consents
  ),
  'room_factory_manifests', (
    select count(*)::int
    from public.room_factory_manifests
  ),
  'room_factory_hosted_semantics', jsonb_build_object(
    'private_atomic_function_present', (
      select exists(
        select 1
        from pg_proc function
        join pg_namespace namespace on namespace.oid = function.pronamespace
        where namespace.nspname = 'private'
          and function.proname = 'create_room_factory_room_atomic'
      )
    ),
    'rejects_null_encounter_session', (
      select coalesce(
        bool_or(pg_get_functiondef(function.oid) ilike '%encounterSessionId is required%'),
        false
      )
      from pg_proc function
      join pg_namespace namespace on namespace.oid = function.pronamespace
      where namespace.nspname = 'private'
        and function.proname = 'create_room_factory_room_atomic'
    )
  ),
  'service_connection_orders', (
    select count(*)::int
    from public.rc_service_connection_orders
  ),
  'first_wave_terms', (
    select jsonb_agg(q order by q.country_code)
    from (
      select
        country.country_code,
        country.currency,
        count(terms.*)::int as term_rows,
        count(terms.*) filter (
          where coalesce(terms.customer_price_minor, 0) > 0
            and coalesce(terms.availability_status, '') not in ('UNAVAILABLE', 'BLOCKED')
        )::int as positive_available_terms
      from (
        values
          ('AU', 'AUD'),
          ('US', 'USD'),
          ('CA', 'CAD'),
          ('KR', 'KRW'),
          ('JP', 'JPY'),
          ('GB', 'GBP')
      ) country(country_code, currency)
      left join public.rc_service_country_terms terms
        on terms.country_code = country.country_code
       and terms.currency = country.currency
      group by country.country_code, country.currency
    ) q
  ),
  'recording_review', (
    select jsonb_agg(q order by q.country_code)
    from (
      select
        country.country_code,
        count(policy.*)::int as policy_rows,
        count(policy.*) filter (
          where policy.review_status = 'APPROVED'
            and policy.reviewed_by is not null
            and policy.reviewed_at is not null
        )::int as reviewer_proven_approved_rows
      from (
        values ('AU'), ('US'), ('CA'), ('KR'), ('JP'), ('GB')
      ) country(country_code)
      left join public.communication_recording_policies policy
        on policy.country_code = country.country_code
      group by country.country_code
    ) q
  ),
  'auth_role_update_privilege',
    has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE'),
  'profiles_update_privilege',
    has_table_privilege('authenticated', 'public.profiles', 'UPDATE'),
  'role_guard_triggers', (
    select count(*)::int
    from pg_trigger trigger
    join pg_class relation on relation.oid = trigger.tgrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'profiles'
      and not trigger.tgisinternal
      and (
        pg_get_triggerdef(trigger.oid) ilike '%role%'
        or trigger.tgname ilike '%role%'
      )
  ),
  'handle_new_user_uses_role_metadata', (
    select coalesce(
      bool_or(pg_get_functiondef(function.oid) ilike '%raw_user_meta_data%role%'),
      false
    )
    from pg_proc function
    join pg_namespace namespace on namespace.oid = function.pronamespace
    where namespace.nspname = 'public'
      and function.proname = 'handle_new_user'
  ),
  'payment_named_tables', (
    select coalesce(jsonb_agg(table_name order by table_name), '[]'::jsonb)
    from information_schema.tables
    where table_schema = 'public'
      and (
        table_name ilike '%payment%'
        or table_name ilike '%checkout%'
        or table_name ilike '%refund%'
        or table_name ilike '%billing%'
        or table_name ilike '%ledger%'
        or table_name ilike '%webhook%'
      )
  )
) as launch_snapshot;

rollback;
