-- RoyalCommandAI October first-wave launch readiness preflight.
-- READ-ONLY evidence only. This script must never change Country READY/CONNECTED state.
-- Even if every DB check below passes, the result remains NEEDS_NON_DB_REVIEW until
-- provider sandbox, legal/tax/privacy, Auth recovery, localization/browser and deployment
-- evidence are independently verified.

begin transaction read only;

with first_wave(country_code, currency) as (
  values
    ('AU'::text, 'AUD'::text),
    ('US', 'USD'),
    ('CA', 'CAD'),
    ('KR', 'KRW'),
    ('JP', 'JPY'),
    ('GB', 'GBP')
),
shared as (
  select
    (select count(*) from public.matters) as matters_total,
    (select count(*) from public.matters where assigned_staff_id is not null) as matters_assigned,
    (select count(*) from public.room_factory_manifests) as room_factory_manifests,
    (select count(*) from public.auth_consents) as auth_consents,
    (select count(*) from public.rc_service_connection_orders) as service_orders,
    exists (
      select 1 from supabase_migrations.schema_migrations
      where name = 'scope_matter_staff_access'
    ) as matter_isolation_migration_recorded,
    exists (
      select 1 from supabase_migrations.schema_migrations
      where name = 'room_factory_atomic_non_encounter'
    ) as room_factory_non_encounter_migration_recorded,
    to_regclass('public.rc_payment_provider_registry') is not null as payment_provider_registry_present,
    to_regclass('public.rc_payment_provider_events') is not null as payment_provider_events_present,
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'rc_service_connection_orders'
        and column_name = 'idempotency_key'
    ) as payment_idempotency_column_present,
    exists (
      select 1 from pg_indexes
      where schemaname = 'public'
        and tablename = 'rc_service_connection_orders'
        and indexdef ilike 'create unique index%'
        and indexdef ilike '%external_checkout_id%'
    ) as unique_external_checkout_id_present,
    exists (
      select 1 from pg_indexes
      where schemaname = 'public'
        and tablename = 'rc_service_connection_orders'
        and indexdef ilike 'create unique index%'
        and indexdef ilike '%external_payment_id%'
    ) as unique_external_payment_id_present
),
country_evidence as (
  select
    fw.country_code,
    fw.currency,
    (select count(*)
       from public.rc_service_country_terms t
      where upper(t.country_code) = fw.country_code
        and upper(t.currency) = fw.currency) as country_terms_rows,
    (select count(*)
       from public.rc_service_catalog c
      where c.active is true
        and c.customer_selectable is true
        and c.price_status = 'fixed'
        and c.price_minor > 0
        and upper(c.currency) = fw.currency) as fixed_positive_selectable_services,
    (select count(*)
       from public.communication_recording_policies p
      where upper(p.country_code) = fw.country_code
        and p.review_status = 'approved'
        and p.recording_policy <> 'blocked'
        and p.reviewed_by is not null
        and p.reviewed_at is not null
        and coalesce(btrim(p.legal_basis), '') <> '') as reviewer_proven_recording_rows
  from first_wave fw
)
select
  ce.country_code,
  ce.currency,
  ce.country_terms_rows,
  ce.fixed_positive_selectable_services,
  ce.reviewer_proven_recording_rows,
  s.matters_total,
  s.matters_assigned,
  s.room_factory_manifests,
  s.auth_consents,
  s.service_orders,
  s.matter_isolation_migration_recorded,
  s.room_factory_non_encounter_migration_recorded,
  s.payment_provider_registry_present,
  s.payment_provider_events_present,
  s.payment_idempotency_column_present,
  s.unique_external_checkout_id_present,
  s.unique_external_payment_id_present,
  array_remove(array[
    case when ce.country_terms_rows = 0 then 'COUNTRY_TERMS_MISSING' end,
    case when ce.fixed_positive_selectable_services = 0 then 'LOCAL_FIXED_PRICE_MISSING' end,
    case when ce.reviewer_proven_recording_rows = 0 then 'RECORDING_REVIEW_PROVENANCE_MISSING' end,
    case when s.matters_total > 0 and s.matters_assigned < s.matters_total then 'MATTER_ASSIGNMENT_INCOMPLETE' end,
    case when not s.matter_isolation_migration_recorded then 'MATTER_ISOLATION_MIGRATION_NOT_RECORDED' end,
    case when not s.room_factory_non_encounter_migration_recorded then 'ROOM_FACTORY_NON_ENCOUNTER_MIGRATION_NOT_RECORDED' end,
    case when s.auth_consents = 0 then 'AUTH_CONSENT_EVIDENCE_MISSING' end,
    case when not s.payment_provider_registry_present then 'PAYMENT_PROVIDER_REGISTRY_MISSING' end,
    case when not s.payment_provider_events_present then 'PAYMENT_EVENT_LEDGER_MISSING' end,
    case when not s.payment_idempotency_column_present then 'PAYMENT_IDEMPOTENCY_COLUMN_MISSING' end,
    case when not s.unique_external_checkout_id_present then 'UNIQUE_EXTERNAL_CHECKOUT_ID_MISSING' end,
    case when not s.unique_external_payment_id_present then 'UNIQUE_EXTERNAL_PAYMENT_ID_MISSING' end
  ], null) as db_blockers,
  case
    when cardinality(array_remove(array[
      case when ce.country_terms_rows = 0 then 'x' end,
      case when ce.fixed_positive_selectable_services = 0 then 'x' end,
      case when ce.reviewer_proven_recording_rows = 0 then 'x' end,
      case when s.matters_total > 0 and s.matters_assigned < s.matters_total then 'x' end,
      case when not s.matter_isolation_migration_recorded then 'x' end,
      case when not s.room_factory_non_encounter_migration_recorded then 'x' end,
      case when s.auth_consents = 0 then 'x' end,
      case when not s.payment_provider_registry_present then 'x' end,
      case when not s.payment_provider_events_present then 'x' end,
      case when not s.payment_idempotency_column_present then 'x' end,
      case when not s.unique_external_checkout_id_present then 'x' end,
      case when not s.unique_external_payment_id_present then 'x' end
    ], null)) > 0 then 'BLOCKED'
    else 'NEEDS_NON_DB_REVIEW'
  end as preflight_status
from country_evidence ce
cross join shared s
order by ce.country_code;

rollback;
