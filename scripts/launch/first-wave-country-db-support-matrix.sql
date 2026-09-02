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
    exists (
      select 1
      from supabase_migrations.schema_migrations
      where version = '20260831225500'
    ) as matter_cutover_migration,

    to_regclass('public.matter_staff_assignments') is not null
      as matter_assignment_table,

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

    exists (
      select 1
      from pg_constraint c
      where c.conrelid = to_regclass('public.rc_service_connection_orders')
        and c.contype = 'c'
        and pg_get_constraintdef(c.oid) ~* 'payment_provider'
    ) as payment_provider_allowlist,

    exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'rc_service_connection_orders'
        and indexdef ~* 'unique'
        and indexdef ~* 'external_checkout_id'
    ) as payment_checkout_unique,

    exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'rc_service_connection_orders'
        and indexdef ~* 'unique'
        and indexdef ~* 'external_payment_id'
    ) as payment_id_unique,

    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'rc_service_connection_orders'
        and column_name ~* 'idempot'
    ) as payment_idempotency_key,

    exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and (
          table_name ~* '(payment|stripe).*(event|webhook)'
          or table_name ~* '(event|webhook).*(payment|stripe)'
        )
    ) as payment_webhook_ledger
)
select
  fw.country_code,
  fw.expected_currency,

  case
    when exists (
      select 1
      from public.rc_service_country_terms t
      where upper(t.country_code) = fw.country_code
        and upper(t.currency) = fw.expected_currency
        and lower(t.availability_status) not in ('blocked', 'unavailable', 'disabled')
    ) then 'PASS'
    else 'BLOCKED'
  end as country_terms,

  case
    when exists (
      select 1
      from public.rc_service_catalog c
      where upper(c.currency) = fw.expected_currency
        and c.active
        and c.customer_selectable
        and c.price_status = 'fixed'
        and coalesce(c.price_minor, 0) > 0
    ) then 'PASS'
    else 'BLOCKED'
  end as fixed_positive_pricing,

  case
    when exists (
      select 1
      from public.communication_recording_policies p
      where upper(p.country_code) = fw.country_code
        and p.region_code is null
        and p.review_status = 'approved'
        and p.recording_policy <> 'blocked'
    ) then 'PASS'
    else 'BLOCKED'
  end as recording_policy,

  case
    when ge.matter_cutover_migration
      and ge.matter_assignment_table then 'PASS'
    else 'BLOCKED'
  end as matter_isolation_schema,

  case
    when ge.room_factory_non_encounter_migration then 'PASS'
    else 'BLOCKED'
  end as room_factory_schema,

  case
    when ge.consent_capture_evidence then 'PASS'
    else 'BLOCKED'
  end as consent_capture_evidence,

  case
    when ge.payment_required_columns
      and ge.payment_lifecycle_constraint
      and ge.payment_provider_allowlist
      and (
        ge.payment_idempotency_key
        or (ge.payment_checkout_unique and ge.payment_id_unique)
      )
      and ge.payment_webhook_ledger then 'PASS'
    else 'BLOCKED'
  end as payment_operational_safeguards,

  case
    when exists (
      select 1
      from public.rc_service_country_terms t
      where upper(t.country_code) = fw.country_code
        and upper(t.currency) = fw.expected_currency
        and lower(t.availability_status) not in ('blocked', 'unavailable', 'disabled')
    )
      and exists (
        select 1
        from public.rc_service_catalog c
        where upper(c.currency) = fw.expected_currency
          and c.active
          and c.customer_selectable
          and c.price_status = 'fixed'
          and coalesce(c.price_minor, 0) > 0
      )
      and exists (
        select 1
        from public.communication_recording_policies p
        where upper(p.country_code) = fw.country_code
          and p.region_code is null
          and p.review_status = 'approved'
          and p.recording_policy <> 'blocked'
      )
      and ge.matter_cutover_migration
      and ge.matter_assignment_table
      and ge.room_factory_non_encounter_migration
      and ge.consent_capture_evidence
      and ge.payment_required_columns
      and ge.payment_lifecycle_constraint
      and ge.payment_provider_allowlist
      and (
        ge.payment_idempotency_key
        or (ge.payment_checkout_unique and ge.payment_id_unique)
      )
      and ge.payment_webhook_ledger then 'PASS'
    else 'BLOCKED'
  end as db_support_gate

from first_wave fw
cross join global_evidence ge
order by fw.country_code;

rollback;
