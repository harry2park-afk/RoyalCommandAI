-- October rollout Hosted Supabase database gate.
--
-- SAFETY: READ ONLY. This evidence script does not mutate Hosted schema/data/Auth/Storage,
-- run migrations, activate providers/payments, deploy Production, or mark any country READY.
-- `database_ready` means only that the database-side prerequisites checked here are present.
-- Human legal/privacy review, authenticated browser/localization regression, provider sandbox
-- behavior, QA/security, and controlled deployment remain independent launch gates.

begin read only;
set local statement_timeout = '15s';

with
first_wave(country_code, expected_currency) as (
  values
    ('AU', 'AUD'),
    ('US', 'USD'),
    ('CA', 'CAD'),
    ('KR', 'KRW'),
    ('JP', 'JPY'),
    ('GB', 'GBP')
),
country_db as (
  select
    c.country_code,
    c.expected_currency,
    (select count(*) from public.rc_service_country_terms t
      where t.country_code = c.country_code) as terms_rows,
    (select count(*) from public.rc_service_country_terms t
      where t.country_code = c.country_code
        and t.currency = c.expected_currency
        and t.availability_status = 'AVAILABLE'
        and t.customer_price_minor > 0) as positive_available_local_prices,
    (select count(*) from public.rc_service_provider_offers o
      where o.country_code = c.country_code
        and o.currency = c.expected_currency
        and o.active is true
        and o.review_status = 'APPROVED') as approved_active_local_currency_offers,
    (select count(*) from public.communication_recording_policies rp
      where rp.country_code = c.country_code
        and rp.review_status = 'APPROVED'
        and rp.reviewed_by is not null
        and rp.reviewed_at is not null) as reviewer_proven_recording_approvals
  from first_wave c
),
required_migrations(name) as (
  values
    ('scope_matter_staff_access'),
    ('room_factory_atomic_non_encounter'),
    ('room_factory_manifest_atomic_only'),
    ('harden_profile_role_authority'),
    ('country_compliance_evidence_registry'),
    ('payment_operational_safeguards')
),
private_atomic as (
  select
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
  where n.nspname = 'private'
    and p.proname = 'create_room_factory_room_atomic'
    and pg_get_function_identity_arguments(p.oid) =
      'p_encounter_session_id uuid, p_household_id uuid, p_household_name text, p_room_name text, p_room_description text, p_language_pref text, p_factory_version text, p_template_id text, p_country_code text, p_language_tag text, p_country_profile_status text, p_manifest jsonb'
),
gates as (
  select
    (
      not has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE')
      and to_regprocedure('private.guard_profile_role_change()') is not null
      and exists (
        select 1
        from pg_trigger tg
        join pg_class c on c.oid = tg.tgrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname = 'profiles'
          and tg.tgname = 'guard_profile_role_change'
          and not tg.tgisinternal
      )
      and case
        when to_regprocedure('public.handle_new_user()') is null then false
        else position(
          'raw_user_meta_data->>''role'''
          in pg_get_functiondef(to_regprocedure('public.handle_new_user()'))
        ) = 0
      end
      and not has_column_privilege('authenticated', 'public.matters', 'client_id', 'UPDATE')
      and not has_column_privilege('authenticated', 'public.matters', 'assigned_staff_id', 'UPDATE')
      and to_regprocedure('private.is_admin()') is not null
      and to_regprocedure('private.is_assigned_matter_staff(uuid)') is not null
      and to_regprocedure('public.set_matter_staff_assignment(uuid,uuid)') is not null
    ) as auth_data_isolation_ready,
    (
      (select count(*) = 1 from private_atomic)
      and coalesce((select security_definer from private_atomic), false)
      and coalesce((select owner_name = 'postgres' from private_atomic), false)
      and not coalesce((select anon_execute from private_atomic), true)
      and not coalesce((select authenticated_execute from private_atomic), true)
      and not coalesce((select public_execute from private_atomic), true)
      and not coalesce((
        select position('encounterSessionId is required for atomic Room creation.' in definition) > 0
        from private_atomic
      ), true)
      and not has_table_privilege('anon', 'public.room_factory_manifests', 'INSERT')
      and not has_table_privilege('authenticated', 'public.room_factory_manifests', 'INSERT')
      and not has_table_privilege('authenticated', 'public.room_factory_manifests', 'UPDATE')
      and not has_table_privilege('authenticated', 'public.room_factory_manifests', 'DELETE')
      and has_table_privilege('authenticated', 'public.room_factory_manifests', 'SELECT')
      and not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'room_factory_manifests'
          and cmd = 'INSERT'
          and ('authenticated' = any(roles) or 'public' = any(roles))
      )
    ) as room_factory_db_boundary_ready,
    (
      select count(*) = 6
      from country_db
      where terms_rows > 0
        and positive_available_local_prices > 0
        and approved_active_local_currency_offers > 0
        and reviewer_proven_recording_approvals > 0
    ) as first_wave_country_db_rows_ready,
    (
      to_regclass('public.country_compliance_evidence') is not null
      and (
        select count(*) = 3
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'rc_service_country_terms'
          and column_name in ('review_status', 'reviewed_by', 'reviewed_at')
      )
      and (
        select count(*) = 2
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'rc_service_provider_offers'
          and column_name in ('reviewed_by', 'reviewed_at')
      )
    ) as compliance_provenance_schema_ready,
    (
      to_regclass('public.rc_payment_provider_registry') is not null
      and to_regclass('public.rc_payment_provider_events') is not null
      and exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'rc_service_connection_orders'
          and column_name = 'idempotency_key'
      )
    ) as payment_safeguard_schema_ready,
    (
      select count(*) = 6
      from required_migrations r
      where exists (
        select 1
        from supabase_migrations.schema_migrations sm
        where sm.name = r.name
      )
    ) as required_migrations_present
)
select json_build_object(
  'contract_version', 1,
  'captured_at_utc', now(),
  'scope', 'DATABASE_ONLY',
  'first_wave', (
    select json_agg(json_build_object(
      'country_code', country_code,
      'currency', expected_currency,
      'terms_rows', terms_rows,
      'positive_available_local_prices', positive_available_local_prices,
      'approved_active_local_currency_offers', approved_active_local_currency_offers,
      'reviewer_proven_recording_approvals', reviewer_proven_recording_approvals,
      'country_db_rows_ready', (
        terms_rows > 0
        and positive_available_local_prices > 0
        and approved_active_local_currency_offers > 0
        and reviewer_proven_recording_approvals > 0
      )
    ) order by country_code)
    from country_db
  ),
  'gates', json_build_object(
    'auth_data_isolation_ready', auth_data_isolation_ready,
    'room_factory_db_boundary_ready', room_factory_db_boundary_ready,
    'first_wave_country_db_rows_ready', first_wave_country_db_rows_ready,
    'compliance_provenance_schema_ready', compliance_provenance_schema_ready,
    'payment_safeguard_schema_ready', payment_safeguard_schema_ready,
    'required_migrations_present', required_migrations_present
  ),
  'database_ready', (
    auth_data_isolation_ready
    and room_factory_db_boundary_ready
    and first_wave_country_db_rows_ready
    and compliance_provenance_schema_ready
    and payment_safeguard_schema_ready
    and required_migrations_present
  ),
  'overall_launch_approval', false,
  'overall_launch_approval_note',
    'Database evidence alone cannot approve launch; external legal/privacy, payment sandbox/runtime, QA/security, authenticated localization/browser, and protected deployment evidence remain required.'
) as october_launch_hosted_db_gate
from gates;

rollback;
