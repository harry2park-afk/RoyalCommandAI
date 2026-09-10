-- October country-rollout Hosted Supabase launch-readiness evidence.
--
-- SAFETY: read-only inspection only. This script does not authorize a migration,
-- production deployment, provider activation, payment activation, or country READY state.
-- Run against the intended Hosted project and retain the raw output with the exact
-- Git/Supabase project identity. Any missing/unsafe result is a launch blocker.
--
-- First wave: AU/AUD, US/USD, CA/CAD, KR/KRW, JP/JPY, GB/GBP.
-- Next priority (inventory only, never launch approval): SG/SGD, CN/CNY, HK/HKD,
-- TW/TWD, IN/INR.

begin read only;
set local statement_timeout = '15s';

-- 1) Authentication / tenant isolation and Room Factory write boundary.
-- These structural checks mirror the narrow reviewed Matter/Profile hardening
-- candidates. Missing helpers/triggers are blockers; their presence alone is not
-- sufficient without authenticated negative tests after controlled staging.
select json_build_object(
  'matters_total', (select count(*) from public.matters),
  'matters_assigned', (
    select count(*) from public.matters where assigned_staff_id is not null
  ),
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
  'handle_new_user_exists',
    to_regprocedure('public.handle_new_user()') is not null,
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
    to_regprocedure('public.set_matter_staff_assignment(uuid,uuid)') is not null,
  'room_factory_manifest_rows', (select count(*) from public.room_factory_manifests),
  'room_factory_manifest_insert_anon',
    has_table_privilege('anon', 'public.room_factory_manifests', 'INSERT'),
  'room_factory_manifest_insert_authenticated',
    has_table_privilege('authenticated', 'public.room_factory_manifests', 'INSERT'),
  'room_factory_manifest_update_authenticated',
    has_table_privilege('authenticated', 'public.room_factory_manifests', 'UPDATE'),
  'room_factory_manifest_delete_authenticated',
    has_table_privilege('authenticated', 'public.room_factory_manifests', 'DELETE')
) as auth_room_factory_boundary;

-- 2) First-wave country commercial/provider readiness. These are inventory checks only.
-- Review provenance is checked through to_jsonb so this read-only evidence still runs
-- fail-closed on Hosted schemas where the provenance columns have not yet been staged.
select c.country_code,
       c.expected_currency,
       (select count(*)
          from public.rc_service_country_terms t
         where t.country_code = c.country_code) as terms_rows,
       (select count(*)
          from public.rc_service_country_terms t
         where t.country_code = c.country_code
           and t.currency = c.expected_currency
           and t.availability_status = 'AVAILABLE'
           and t.customer_price_minor > 0) as positive_available_local_prices,
       (select count(*)
          from public.rc_service_provider_offers o
         where o.country_code = c.country_code) as provider_offers,
       (select count(*)
          from public.rc_service_provider_offers o
         where o.country_code = c.country_code
           and o.currency = c.expected_currency
           and o.active is true
           and o.review_status = 'APPROVED'
           and nullif(trim(coalesce(to_jsonb(o)->>'reviewed_by', '')), '') is not null
           and nullif(trim(coalesce(to_jsonb(o)->>'reviewed_at', '')), '') is not null
       ) as approved_active_local_currency_provider_offers
  from (values
    ('AU', 'AUD'),
    ('US', 'USD'),
    ('CA', 'CAD'),
    ('KR', 'KRW'),
    ('JP', 'JPY'),
    ('GB', 'GBP')
  ) as c(country_code, expected_currency)
 order by c.country_code;

-- 3) Next-priority expansion inventory. This section intentionally does not feed
-- the first-wave launch gate. It records the same commercial/recording prerequisites
-- early so SG/CN/HK/TW/IN cannot later be mistaken for READY merely because a Room
-- Factory locale preset exists.
select c.country_code,
       c.expected_currency,
       (select count(*)
          from public.rc_service_country_terms t
         where t.country_code = c.country_code) as terms_rows,
       (select count(*)
          from public.rc_service_country_terms t
         where t.country_code = c.country_code
           and t.currency = c.expected_currency
           and t.availability_status = 'AVAILABLE'
           and t.customer_price_minor > 0) as positive_available_local_prices,
       (select count(*)
          from public.rc_service_provider_offers o
         where o.country_code = c.country_code) as provider_offers,
       (select count(*)
          from public.communication_recording_policies rp
         where rp.country_code = c.country_code) as recording_policy_rows,
       (select count(*)
          from public.communication_recording_policies rp
         where rp.country_code = c.country_code
           and rp.review_status = 'APPROVED'
           and rp.reviewed_by is not null
           and rp.reviewed_at is not null
           and nullif(trim(coalesce(rp.legal_basis, '')), '') is not null
       ) as recording_reviewer_proven_approved
  from (values
    ('SG', 'SGD'),
    ('CN', 'CNY'),
    ('HK', 'HKD'),
    ('TW', 'TWD'),
    ('IN', 'INR')
  ) as c(country_code, expected_currency)
 order by c.country_code;

-- 4) Provider, recording/consent, review-provenance schema, and payment structure.
select json_build_object(
  'providers_total', (select count(*) from public.rc_service_providers),
  'providers_active', (
    select count(*) from public.rc_service_providers where active is true
  ),
  'country_terms_review_provenance_columns_exist', (
    select count(*) = 3
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'rc_service_country_terms'
       and column_name in ('review_status', 'reviewed_by', 'reviewed_at')
  ),
  'provider_offers_reviewer_provenance_columns_exist', (
    select count(*) = 2
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'rc_service_provider_offers'
       and column_name in ('reviewed_by', 'reviewed_at')
  ),
  'recording_legal_basis_column_exists', exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'communication_recording_policies'
       and column_name = 'legal_basis'
  ),
  'first_wave_recording_policy_rows', (
    select count(*)
      from public.communication_recording_policies
     where country_code in ('AU', 'US', 'CA', 'KR', 'JP', 'GB')
  ),
  'first_wave_recording_reviewer_proven_approved', (
    select count(*)
      from public.communication_recording_policies
     where country_code in ('AU', 'US', 'CA', 'KR', 'JP', 'GB')
       and review_status = 'APPROVED'
       and reviewed_by is not null
       and reviewed_at is not null
       and nullif(trim(coalesce(legal_basis, '')), '') is not null
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
) as operational_readiness;

-- 5) Critical migration-history reconciliation. Keep this list aligned with
-- october-launch-critical-migration-coverage.sql. Presence alone is not approval;
-- absence means linked inventory/dry-run and controlled staging remain mandatory.
with required(name) as (
  values
    ('scope_matter_staff_access'),
    ('harden_profile_role_authority'),
    ('country_compliance_evidence_registry'),
    ('harden_commercial_review_provenance'),
    ('payment_operational_safeguards'),
    ('room_factory_atomic_non_encounter'),
    ('room_factory_manifest_atomic_only'),
    ('harden_incident_event_client_boundary')
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
