-- Royal Command October first-wave country database support matrix.
-- READ ONLY: this script must not mutate schema, data, Auth, payment, legal/compliance, or launch state.
-- First wave: Australia, United States, Canada, South Korea, Japan, United Kingdom.
--
-- This is deliberately a database-support gate, NOT a country launch gate.
-- PASS here does not replace jurisdiction-specific legal/tax/privacy review, Auth recovery E2E,
-- browser/localization/Web Speech smoke, payment-provider sandbox E2E, deployment protection,
-- security/regression evidence, or human release approval.
-- Missing evidence fails closed.

begin transaction read only;

with first_wave(country_code, expected_currency) as (
  values
    ('AU', 'AUD'),
    ('US', 'USD'),
    ('CA', 'CAD'),
    ('KR', 'KRW'),
    ('JP', 'JPY'),
    ('GB', 'GBP')
),
global_evidence as (
  select
    -- Matter isolation must match the reviewed source migration contract. The
    -- design uses public.matters.assigned_staff_id + an admin-only assignment
    -- RPC; it does NOT create a separate matter_staff_assignments table.
    exists (
      select 1
      from supabase_migrations.schema_migrations
      where version = '20260831225500'
    ) as matter_cutover_migration,

    to_regprocedure('public.set_matter_staff_assignment(uuid,uuid)') is not null
      as matter_assignment_rpc,

    to_regprocedure('private.is_assigned_matter_staff(uuid)') is not null
      as matter_assignment_helper,

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
        and (coalesce(p.qual, '') || ' ' || coalesce(p.with_check, ''))
          ilike '%is_staff_or_admin%'
    ) as matter_no_legacy_global_staff_policy,

    (
      select count(*)
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename in (
          'matters',
          'matter_documents',
          'matter_messages',
          'matter_chat_reads'
        )
        and (coalesce(p.qual, '') || ' ' || coalesce(p.with_check, ''))
          ilike '%is_assigned_matter_staff%'
    ) >= 8 as matter_assignment_policy_coverage,

    not has_column_privilege(
      'authenticated', 'public.matters', 'client_id', 'UPDATE'
    )
    and not has_column_privilege(
      'authenticated', 'public.matters', 'assigned_staff_id', 'UPDATE'
    ) as matter_sensitive_columns_protected,

    exists (
      select 1
      from supabase_migrations.schema_migrations
      where version = '20260901025800'
    ) as room_factory_non_encounter_migration,

    (
      select count(*)
      from public.auth_consents
      where user_id is not null
    ) > 0 as consent_capture_evidence,

    (
      select count(*)
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'rc_service_connection_orders'
        and column_name in (
          'amount_minor', 'currency', 'payment_status', 'payment_provider',
          'external_checkout_id', 'external_payment_id'
        )
    ) = 6 as payment_required_columns,

    exists (
      select 1
      from pg_constraint c
      where c.conrelid = to_regclass('public.rc_service_connection_orders')
        and c.contype = 'c'
        and pg_get_constraintdef(c.oid) ~* 'payment_status'
        and pg_get_constraintdef(c.oid) ~* 'not_required'
        and pg_get_constraintdef(c.oid) ~* 'pending'
        and pg_get_constraintdef(c.oid) ~* 'paid'
        and pg_get_constraintdef(c.oid) ~* 'failed'
        and pg_get_constraintdef(c.oid) ~* 'cancelled'
        and pg_get_constraintdef(c.oid) ~* 'refunded'
    ) as payment_lifecycle_constraint,

    -- Payment safeguards below are aligned to the reviewed additive candidate
    -- contract in PR #658. They verify schema/constraint presence only; actual
    -- provider activation, signed webhook delivery, refund/cancel behavior and
    -- reconciliation remain independent operational launch gates.
    to_regclass('public.rc_payment_provider_registry') is not null
      as payment_provider_registry,

    (
      select count(*)
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'rc_payment_provider_registry'
        and column_name in (
          'provider_key', 'environment', 'status',
          'supports_webhooks', 'supports_refunds', 'supports_cancellations',
          'reviewed_by', 'reviewed_at'
        )
    ) = 8 as payment_provider_registry_shape,

    exists (
      select 1
      from pg_constraint c
      where c.conrelid = to_regclass('public.rc_payment_provider_registry')
        and c.contype = 'c'
        and pg_get_constraintdef(c.oid) ~* 'production_ready'
        and pg_get_constraintdef(c.oid) ~* 'supports_webhooks'
        and pg_get_constraintdef(c.oid) ~* 'supports_refunds'
        and pg_get_constraintdef(c.oid) ~* 'supports_cancellations'
    ) as payment_provider_production_capability_constraint,

    exists (
      select 1
      from pg_constraint c
      where c.conrelid = to_regclass('public.rc_payment_provider_registry')
        and c.contype = 'c'
        and pg_get_constraintdef(c.oid) ~* 'reviewed_by'
        and pg_get_constraintdef(c.oid) ~* 'reviewed_at'
    ) as payment_provider_review_provenance_constraint,

    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'rc_service_connection_orders'
        and column_name = 'idempotency_key'
    ) as payment_idempotency_key,

    exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'rc_service_connection_orders'
        and indexdef ~* 'unique'
        and indexdef ~* 'owner_id'
        and indexdef ~* 'idempotency_key'
    ) as payment_owner_idempotency_unique,

    -- Do not infer runtime idempotency readiness from column/index presence.
    -- This aggregate emits no customer/order identifiers.
    (
      select count(*)
      from public.rc_service_connection_orders o
      where nullif(btrim(to_jsonb(o) ->> 'idempotency_key'), '') is not null
    ) > 0 as payment_runtime_idempotency_evidence,

    to_regclass('public.rc_payment_provider_events') is not null
      as payment_webhook_ledger,

    (
      select count(*)
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'rc_payment_provider_events'
        and column_name in (
          'provider_key', 'environment', 'external_event_id', 'event_type',
          'payload_sha256', 'signature_verified', 'processing_status',
          'received_at', 'processed_at'
        )
    ) = 9 as payment_webhook_ledger_shape,

    exists (
      select 1
      from pg_constraint c
      where c.conrelid = to_regclass('public.rc_payment_provider_events')
        and c.contype = 'u'
        and pg_get_constraintdef(c.oid) ~* 'provider_key'
        and pg_get_constraintdef(c.oid) ~* 'environment'
        and pg_get_constraintdef(c.oid) ~* 'external_event_id'
    ) as payment_webhook_replay_boundary,

    exists (
      select 1
      from pg_constraint c
      where c.conrelid = to_regclass('public.rc_payment_provider_events')
        and c.contype = 'c'
        and pg_get_constraintdef(c.oid) ~* 'signature_verified'
        and pg_get_constraintdef(c.oid) ~* 'processing'
        and pg_get_constraintdef(c.oid) ~* 'processed'
    ) as payment_signature_before_processing_constraint,

    exists (
      select 1
      from pg_constraint c
      where c.conrelid = to_regclass('public.rc_payment_provider_events')
        and c.contype = 'c'
        and pg_get_constraintdef(c.oid) ~* 'payload_sha256'
    ) as payment_payload_digest_constraint,

    exists (
      select 1
      from pg_constraint c
      where c.conrelid = to_regclass('public.rc_payment_provider_events')
        and c.contype = 'c'
        and pg_get_constraintdef(c.oid) ~* 'processed_at'
    ) as payment_processed_timestamp_constraint
),
evaluated as (
  select
    fw.country_code,
    fw.expected_currency,

    exists (
      select 1
      from public.rc_service_country_terms t
      where upper(t.country_code) = fw.country_code
        and upper(t.currency) = fw.expected_currency
        and lower(t.availability_status) not in ('blocked', 'unavailable', 'disabled')
    ) as country_terms_ok,

    exists (
      select 1
      from public.rc_service_catalog c
      where upper(c.currency) = fw.expected_currency
        and c.active
        and c.customer_selectable
        and c.price_status = 'fixed'
        and coalesce(c.price_minor, 0) > 0
    ) as fixed_positive_pricing_ok,

    -- A label alone is insufficient. Country recording evidence must be
    -- approved, non-blocked, reviewer-proven, timestamped and have a legal basis.
    exists (
      select 1
      from public.communication_recording_policies p
      where upper(p.country_code) = fw.country_code
        and p.region_code is null
        and p.review_status = 'approved'
        and p.recording_policy <> 'blocked'
        and p.reviewed_by is not null
        and p.reviewed_at is not null
        and length(btrim(coalesce(p.legal_basis, ''))) > 0
    ) as recording_policy_ok,

    ge.matter_cutover_migration
      and ge.matter_assignment_rpc
      and ge.matter_assignment_helper
      and ge.matter_no_legacy_global_staff_policy
      and ge.matter_assignment_policy_coverage
      and ge.matter_sensitive_columns_protected
      as matter_isolation_schema_ok,

    ge.room_factory_non_encounter_migration as room_factory_schema_ok,
    ge.consent_capture_evidence as consent_capture_evidence_ok,

    ge.payment_required_columns
      and ge.payment_lifecycle_constraint
      and ge.payment_provider_registry
      and ge.payment_provider_registry_shape
      and ge.payment_provider_production_capability_constraint
      and ge.payment_provider_review_provenance_constraint
      and ge.payment_idempotency_key
      and ge.payment_owner_idempotency_unique
      and ge.payment_runtime_idempotency_evidence
      and ge.payment_webhook_ledger
      and ge.payment_webhook_ledger_shape
      and ge.payment_webhook_replay_boundary
      and ge.payment_signature_before_processing_constraint
      and ge.payment_payload_digest_constraint
      and ge.payment_processed_timestamp_constraint
      as payment_operational_safeguards_ok
  from first_wave fw
  cross join global_evidence ge
)
select
  country_code,
  expected_currency,
  case when country_terms_ok then 'PASS' else 'BLOCKED' end as country_terms,
  case when fixed_positive_pricing_ok then 'PASS' else 'BLOCKED' end as fixed_positive_pricing,
  case when recording_policy_ok then 'PASS' else 'BLOCKED' end as reviewer_proven_recording,
  case when matter_isolation_schema_ok then 'PASS' else 'BLOCKED' end as matter_isolation_schema,
  case when room_factory_schema_ok then 'PASS' else 'BLOCKED' end as room_factory_schema,
  case when consent_capture_evidence_ok then 'PASS' else 'BLOCKED' end as consent_capture_evidence,
  case when payment_operational_safeguards_ok then 'PASS' else 'BLOCKED' end as payment_operational_safeguards,
  case
    when country_terms_ok
      and fixed_positive_pricing_ok
      and recording_policy_ok
      and matter_isolation_schema_ok
      and room_factory_schema_ok
      and consent_capture_evidence_ok
      and payment_operational_safeguards_ok
      then 'PASS'
    else 'BLOCKED'
  end as db_support_gate
from evaluated
order by country_code;

rollback;
