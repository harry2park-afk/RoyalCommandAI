-- October first-wave Hosted Supabase launch-readiness evidence.
--
-- SAFETY: read-only inspection only. This script does not authorize a migration,
-- production deployment, provider activation, payment activation, or country READY state.
-- Run against the intended Hosted project and retain the raw output with the exact
-- Git/Supabase project identity. Any missing/unsafe result is a launch blocker.
--
-- First wave: AU, US, CA, KR, JP, GB.

begin read only;
set local statement_timeout = '15s';

-- 1) Authentication / tenant isolation and Room Factory write boundary.
select json_build_object(
  'matters_total', (select count(*) from public.matters),
  'matters_assigned', (
    select count(*) from public.matters where assigned_staff_id is not null
  ),
  'profiles_role_update_authenticated',
    has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE'),
  'matters_client_id_update_authenticated',
    has_column_privilege('authenticated', 'public.matters', 'client_id', 'UPDATE'),
  'matters_assigned_staff_id_update_authenticated',
    has_column_privilege('authenticated', 'public.matters', 'assigned_staff_id', 'UPDATE'),
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

-- 2) Country commercial/provider readiness. Zero rows are BLOCKED, never READY.
select c.country_code,
       (select count(*)
          from public.rc_service_country_terms t
         where t.country_code = c.country_code) as terms_rows,
       (select count(*)
          from public.rc_service_country_terms t
         where t.country_code = c.country_code
           and t.active is true
           and t.review_status = 'APPROVED'
           and t.availability_status = 'AVAILABLE'
           and t.customer_price_minor > 0
           and t.reviewed_by is not null
           and t.reviewed_at is not null) as reviewed_positive_available_prices,
       (select count(*)
          from public.rc_service_provider_offers o
         where o.country_code = c.country_code) as provider_offers,
       (select count(*)
          from public.rc_service_provider_offers o
         where o.country_code = c.country_code
           and o.active is true
           and o.review_status = 'APPROVED'
           and o.reviewed_by is not null
           and o.reviewed_at is not null) as reviewed_active_provider_offers
  from (values ('AU'), ('US'), ('CA'), ('KR'), ('JP'), ('GB')) as c(country_code)
 order by c.country_code;

-- 3) Provider, recording/consent and payment-operational structure.
select json_build_object(
  'providers_total', (select count(*) from public.rc_service_providers),
  'providers_active_reviewed', (
    select count(*)
      from public.rc_service_providers
     where active is true
       and review_status = 'APPROVED'
       and reviewed_by is not null
       and reviewed_at is not null
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
       and approved_at is not null
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

-- 4) Critical migration-history reconciliation. Presence alone is not approval;
-- absence means linked inventory/dry-run and controlled staging remain mandatory.
with required(name) as (
  values
    ('scope_matter_staff_access'),
    ('room_factory_atomic_non_encounter'),
    ('room_factory_manifest_atomic_only'),
    ('harden_profile_role_authority'),
    ('country_compliance_evidence_registry'),
    ('payment_operational_safeguards')
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
