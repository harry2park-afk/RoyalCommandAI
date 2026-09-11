-- Machine-readable October rollout Hosted Supabase readiness snapshot.
--
-- SAFETY: READ ONLY. This script performs no DDL/DML/Auth/Storage mutation and
-- does not authorize migrations, Production deployment, provider/payment activation,
-- or Country/Compliance READY. Any unsafe/missing field remains a blocker.
--
-- First wave: AU/AUD, US/USD, CA/CAD, KR/KRW, JP/JPY, GB/GBP.
-- Next priority is inventory only: SG/SGD, CN/CNY, HK/HKD, TW/TWD, IN/INR.

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
next_priority(country_code, expected_currency) as (
  values
    ('SG', 'SGD'),
    ('CN', 'CNY'),
    ('HK', 'HKD'),
    ('TW', 'TWD'),
    ('IN', 'INR')
),
atomic_functions as (
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
required_migrations(name) as (
  values
    ('scope_matter_staff_access'),
    ('room_factory_atomic_non_encounter'),
    ('room_factory_manifest_atomic_only'),
    ('harden_profile_role_authority'),
    ('country_compliance_evidence_registry'),
    ('harden_commercial_review_provenance'),
    ('payment_operational_safeguards'),
    ('harden_incident_event_client_boundary')
)
select json_build_object(
  'snapshot_contract_version', 4,
  'captured_at_utc', now(),
  'auth_and_isolation', json_build_object(
    'matters_total', (select count(*) from public.matters),
    'matters_assigned', (select count(*) from public.matters where assigned_staff_id is not null),
    'profiles_role_update_authenticated',
      has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE'),
    'profile_role_guard_function_exists',
      to_regprocedure('private.guard_profile_role_change()') is not null,
    'profile_role_guard_trigger_exists', exists (
      select 1
        from pg_trigger tg
        join pg_class c on c.oid = tg.tgrelid
        join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public'
         and c.relname = 'profiles'
         and tg.tgname = 'guard_profile_role_change'
         and not tg.tgisinternal
    ),
    'handle_new_user_reads_role_metadata', case
      when to_regprocedure('public.handle_new_user()') is null then null
      else position(
        'raw_user_meta_data->>''role'''
        in pg_get_functiondef(to_regprocedure('public.handle_new_user()'))
      ) > 0
    end,
    'matters_client_id_update_authenticated',
      has_column_privilege('authenticated', 'public.matters', 'client_id', 'UPDATE'),
    'matters_assigned_staff_id_update_authenticated',
      has_column_privilege('authenticated', 'public.matters', 'assigned_staff_id', 'UPDATE'),
    'matter_is_admin_helper_exists',
      to_regprocedure('private.is_admin()') is not null,
    'matter_assigned_staff_helper_exists',
      to_regprocedure('private.is_assigned_matter_staff(uuid)') is not null,
    'matter_assignment_rpc_exists',
      to_regprocedure('public.set_matter_staff_assignment(uuid,uuid)') is not null
  ),
  'room_factory', json_build_object(
    'private_atomic_exists', exists (select 1 from private_atomic),
    'private_atomic_security_definer', coalesce((select security_definer from private_atomic), false),
    'private_atomic_owner', (select owner_name from private_atomic),
    'private_atomic_anon_execute', coalesce((select anon_execute from private_atomic), false),
    'private_atomic_authenticated_execute', coalesce((select authenticated_execute from private_atomic), false),
    'private_atomic_public_execute', coalesce((select public_execute from private_atomic), false),
    'private_atomic_rejects_null_encounter', coalesce((
      select position('encounterSessionId is required for atomic Room creation.' in definition) > 0
        from private_atomic
    ), false),
    'manifest_rows', (select count(*) from public.room_factory_manifests),
    'manifest_anon_insert',
      has_table_privilege('anon', 'public.room_factory_manifests', 'INSERT'),
    'manifest_authenticated_insert',
      has_table_privilege('authenticated', 'public.room_factory_manifests', 'INSERT'),
    'manifest_authenticated_update',
      has_table_privilege('authenticated', 'public.room_factory_manifests', 'UPDATE'),
    'manifest_authenticated_delete',
      has_table_privilege('authenticated', 'public.room_factory_manifests', 'DELETE'),
    'manifest_authenticated_select',
      has_table_privilege('authenticated', 'public.room_factory_manifests', 'SELECT'),
    'direct_authenticated_insert_policy_exists', exists (
      select 1
        from pg_policies
       where schemaname = 'public'
         and tablename = 'room_factory_manifests'
         and cmd = 'INSERT'
         and ('authenticated' = any(roles) or 'public' = any(roles))
    )
  ),
  'first_wave', (
    select json_agg(json_build_object(
      'country_code', c.country_code,
      'currency', c.expected_currency,
      'terms_rows', (
        select count(*) from public.rc_service_country_terms t
         where t.country_code = c.country_code
      ),
      'positive_available_local_prices', (
        select count(*) from public.rc_service_country_terms t
         where t.country_code = c.country_code
           and t.currency = c.expected_currency
           and upper(coalesce(to_jsonb(t)->>'availability_status', '')) = 'AVAILABLE'
           and t.customer_price_minor > 0
      ),
      'reviewer_proven_terms', (
        select count(*) from public.rc_service_country_terms t
         where t.country_code = c.country_code
           and t.currency = c.expected_currency
           and upper(coalesce(to_jsonb(t)->>'availability_status', '')) = 'AVAILABLE'
           and t.customer_price_minor > 0
           and upper(coalesce(to_jsonb(t)->>'review_status', '')) = 'APPROVED'
           and nullif(trim(coalesce(to_jsonb(t)->>'reviewed_by', '')), '') is not null
           and nullif(trim(coalesce(to_jsonb(t)->>'reviewed_at', '')), '') is not null
      ),
      'provider_offers', (
        select count(*) from public.rc_service_provider_offers o
         where o.country_code = c.country_code
      ),
      'approved_active_local_currency_provider_offers', (
        select count(*) from public.rc_service_provider_offers o
         where o.country_code = c.country_code
           and o.currency = c.expected_currency
           and o.active is true
           and upper(coalesce(to_jsonb(o)->>'review_status', '')) = 'APPROVED'
      ),
      'reviewer_proven_provider_offers', (
        select count(*) from public.rc_service_provider_offers o
         where o.country_code = c.country_code
           and o.currency = c.expected_currency
           and o.active is true
           and upper(coalesce(to_jsonb(o)->>'review_status', '')) = 'APPROVED'
           and nullif(trim(coalesce(to_jsonb(o)->>'reviewed_by', '')), '') is not null
           and nullif(trim(coalesce(to_jsonb(o)->>'reviewed_at', '')), '') is not null
      ),
      'recording_policy_rows', (
        select count(*) from public.communication_recording_policies rp
         where rp.country_code = c.country_code
      ),
      'recording_reviewer_proven_approved', (
        select count(*) from public.communication_recording_policies rp
         where rp.country_code = c.country_code
           and rp.review_status = 'APPROVED'
           and rp.reviewed_by is not null
           and rp.reviewed_at is not null
           and nullif(trim(coalesce(rp.legal_basis, '')), '') is not null
      )
    ) order by c.country_code)
      from first_wave c
  ),
  'next_priority_inventory', (
    select json_agg(json_build_object(
      'country_code', c.country_code,
      'currency', c.expected_currency,
      'terms_rows', (
        select count(*) from public.rc_service_country_terms t
         where t.country_code = c.country_code
      ),
      'positive_available_local_prices', (
        select count(*) from public.rc_service_country_terms t
         where t.country_code = c.country_code
           and t.currency = c.expected_currency
           and upper(coalesce(to_jsonb(t)->>'availability_status', '')) = 'AVAILABLE'
           and t.customer_price_minor > 0
      ),
      'provider_offers', (
        select count(*) from public.rc_service_provider_offers o
         where o.country_code = c.country_code
      ),
      'recording_policy_rows', (
        select count(*) from public.communication_recording_policies rp
         where rp.country_code = c.country_code
      ),
      'recording_reviewer_proven_approved', (
        select count(*) from public.communication_recording_policies rp
         where rp.country_code = c.country_code
           and rp.review_status = 'APPROVED'
           and rp.reviewed_by is not null
           and rp.reviewed_at is not null
           and nullif(trim(coalesce(rp.legal_basis, '')), '') is not null
      )
    ) order by c.country_code)
      from next_priority c
  ),
  'operations', json_build_object(
    'providers_total', (select count(*) from public.rc_service_providers),
    'providers_active', (select count(*) from public.rc_service_providers where active is true),
    'country_terms_review_provenance_columns_exist', (
      select count(*) = 3
        from information_schema.columns
       where table_schema = 'public'
         and table_name = 'rc_service_country_terms'
         and column_name in ('review_status', 'reviewed_by', 'reviewed_at')
    ),
    'provider_offers_reviewer_provenance_columns_exist', (
      select count(*) = 3
        from information_schema.columns
       where table_schema = 'public'
         and table_name = 'rc_service_provider_offers'
         and column_name in ('review_status', 'reviewed_by', 'reviewed_at')
    ),
    'recording_legal_basis_column_exists', exists (
      select 1
        from information_schema.columns
       where table_schema = 'public'
         and table_name = 'communication_recording_policies'
         and column_name = 'legal_basis'
    ),
    'service_connection_orders', (select count(*) from public.rc_service_connection_orders),
    'payment_provider_registry_exists',
      to_regclass('public.rc_payment_provider_registry') is not null,
    'payment_event_ledger_exists',
      to_regclass('public.rc_payment_provider_events') is not null,
    'service_order_idempotency_key_exists', exists (
      select 1
        from information_schema.columns
       where table_schema = 'public'
         and table_name = 'rc_service_connection_orders'
         and column_name = 'idempotency_key'
    )
  ),
  'required_migrations', (
    select json_object_agg(
      r.name,
      exists (
        select 1
          from supabase_migrations.schema_migrations sm
         where sm.name = r.name
      )
    )
      from required_migrations r
  )
) as launch_snapshot;

rollback;
