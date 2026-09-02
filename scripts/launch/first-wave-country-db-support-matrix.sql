-- Royal Command October first-wave country database support matrix.
-- READ ONLY: this script must not mutate schema, data, Auth, payment, legal/compliance, or launch state.
-- First wave: Australia, United States, Canada, South Korea, Japan, United Kingdom.
--
-- This is deliberately a database-support gate, NOT a country launch gate.
-- PASS here does not replace jurisdiction-specific legal/tax/privacy review, Auth recovery E2E,
-- browser/localization/Web Speech smoke, payment-provider sandbox E2E, deployment protection,
-- security/regression evidence, or human release approval.
-- Missing evidence fails closed.

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

    exists (
      select 1
      from pg_constraint c
      join pg_class cl on cl.oid = c.conrelid
      join pg_namespace n on n.oid = cl.relnamespace
      where n.nspname = 'public'
        and cl.relname = 'rc_service_connection_orders'
        and pg_get_constraintdef(c.oid) ~* 'payment_provider'
    ) as payment_provider_allowlist,

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
        and table_name ~* '(webhook|payment_event|provider_event)'
    ) as payment_webhook_ledger
)
select
  fw.country_code,
  fw.expected_currency,

  case
    when exists (
      select 1
      from public.rc_service_country_terms t
      where t.country_code = fw.country_code
        and t.currency = fw.expected_currency
    ) then 'PASS'
    else 'BLOCKED'
  end as country_terms,

  case
    when exists (
      select 1
      from public.rc_service_catalog c
      where c.currency = fw.expected_currency
        and c.active
        and c.customer_selectable
        and c.price_status = 'confirmed'
        and c.price_minor > 0
    ) then 'PASS'
    else 'BLOCKED'
  end as confirmed_pricing,

  case
    when exists (
      select 1
      from public.communication_recording_policies p
      where p.country_code = fw.country_code
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
    when ge.payment_provider_allowlist
      and ge.payment_idempotency_key
      and ge.payment_webhook_ledger then 'PASS'
    else 'BLOCKED'
  end as payment_operational_safeguards,

  case
    when exists (
      select 1
      from public.rc_service_country_terms t
      where t.country_code = fw.country_code
        and t.currency = fw.expected_currency
    )
      and exists (
        select 1
        from public.rc_service_catalog c
        where c.currency = fw.expected_currency
          and c.active
          and c.customer_selectable
          and c.price_status = 'confirmed'
          and c.price_minor > 0
      )
      and exists (
        select 1
        from public.communication_recording_policies p
        where p.country_code = fw.country_code
          and p.region_code is null
          and p.review_status = 'approved'
          and p.recording_policy <> 'blocked'
      )
      and ge.matter_cutover_migration
      and ge.matter_assignment_table
      and ge.room_factory_non_encounter_migration
      and ge.consent_capture_evidence
      and ge.payment_provider_allowlist
      and ge.payment_idempotency_key
      and ge.payment_webhook_ledger then 'PASS'
    else 'BLOCKED'
  end as db_support_gate

from first_wave fw
cross join global_evidence ge
order by fw.country_code;
