-- October rollout Hosted Supabase payment/operational readiness snapshot.
--
-- SAFETY: READ ONLY. This script performs no DDL/DML/Auth/Storage mutation,
-- does not create checkout/payment/refund records, does not invoke providers,
-- and does not authorize Production deployment, payment/provider activation,
-- or any Country/Compliance READY transition.
--
-- Purpose:
-- 1. Verify the existing service-order payment boundary without treating a
--    payment-status column as proof of production payment readiness.
-- 2. Fail closed on provider registry, webhook/event replay, idempotency,
--    refund/cancel runtime safeguards and first-wave commercial offer evidence.
-- 3. Keep AU/US/CA/KR/JP/GB blocked until database shape AND separate sandbox,
--    webhook, reconciliation, monitoring and human commercial evidence exist.
--
-- Passing this database snapshot is never launch approval. Runtime provider
-- sandbox, signed webhook/replay, idempotency, refund/cancel, reconciliation,
-- monitoring, QA/security, Preview smoke and protected promotion remain separate.

begin read only;
set local statement_timeout = '15s';

with
first_wave(country_code, currency) as (
  values
    ('AU', 'AUD'),
    ('US', 'USD'),
    ('CA', 'CAD'),
    ('KR', 'KRW'),
    ('JP', 'JPY'),
    ('GB', 'GBP')
),
relations as (
  select c.relname, c.relrowsecurity
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
),
order_state as (
  select
    exists (
      select 1 from relations where relname = 'rc_service_connection_orders'
    ) as order_table_exists,
    coalesce((
      select relrowsecurity
      from relations
      where relname = 'rc_service_connection_orders'
    ), false) as order_rls_enabled,
    has_table_privilege('authenticated', 'public.rc_service_connection_orders', 'SELECT') as authenticated_select,
    has_table_privilege('authenticated', 'public.rc_service_connection_orders', 'INSERT') as authenticated_insert,
    has_table_privilege('authenticated', 'public.rc_service_connection_orders', 'UPDATE') as authenticated_update,
    has_table_privilege('authenticated', 'public.rc_service_connection_orders', 'DELETE') as authenticated_delete,
    exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'rc_service_connection_orders'
        and cmd = 'INSERT'
        and 'authenticated' = any(roles)
        and with_check ilike '%payment_status = ''pending''%'
        and with_check ilike '%payment_provider IS NULL%'
        and with_check ilike '%external_checkout_id IS NULL%'
        and with_check ilike '%external_payment_id IS NULL%'
        and with_check ilike '%paid_at IS NULL%'
    ) as owner_pending_insert_policy_hardened,
    exists (
      select 1
      from pg_constraint
      where conrelid = 'public.rc_service_connection_orders'::regclass
        and contype = 'c'
        and pg_get_constraintdef(oid) ilike '%cancelled%'
        and pg_get_constraintdef(oid) ilike '%refunded%'
    ) as refund_cancel_state_model_present,
    exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'rc_service_connection_orders'
        and indexdef ilike 'CREATE UNIQUE INDEX%'
        and (
          indexdef ilike '%external_checkout_id%'
          or indexdef ilike '%external_payment_id%'
          or indexdef ilike '%idempot%'
        )
    ) as service_order_external_idempotency_unique_guard
),
runtime_state as (
  select
    exists (
      select 1
      from relations
      where relname in (
        'rc_payment_provider_registry',
        'payment_provider_registry',
        'rc_payment_providers'
      )
    ) as payment_provider_registry_exists,
    exists (
      select 1
      from relations
      where relname in (
        'rc_payment_event_ledger',
        'payment_event_ledger',
        'rc_payment_events',
        'payment_events'
      )
    ) as payment_event_ledger_exists,
    exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'private')
        and (
          p.proname ilike '%webhook%'
          or p.proname ilike '%payment_event%'
          or p.proname ilike '%refund%'
          or p.proname ilike '%cancel_payment%'
        )
    ) as payment_runtime_db_function_exists,
    exists (
      select 1
      from information_schema.triggers
      where event_object_schema = 'public'
        and event_object_table = 'rc_service_connection_orders'
        and (
          trigger_name ilike '%payment%'
          or trigger_name ilike '%refund%'
          or trigger_name ilike '%webhook%'
        )
    ) as payment_runtime_trigger_exists
),
country_state as (
  select
    f.country_code,
    f.currency,
    count(o.id) filter (where o.active) as active_offer_rows,
    count(o.id) filter (
      where o.active
        and lower(o.connection_status) = 'available'
        and upper(o.currency) = f.currency
        and coalesce(o.customer_price_minor, 0) > 0
        and lower(o.review_status) = 'approved'
    ) as approved_available_local_currency_offers
  from first_wave f
  left join public.rc_service_provider_offers o
    on upper(o.country_code) = f.country_code
  group by f.country_code, f.currency
),
counts as (
  select
    (select count(*) from public.rc_service_connection_orders) as service_order_count,
    (select count(*) from public.rc_service_providers) as provider_count,
    (select count(*) from public.rc_service_providers where active) as active_provider_count,
    (select count(*) from public.rc_service_provider_offers) as provider_offer_count
),
migration_state as (
  select exists (
    select 1
    from supabase_migrations.schema_migrations
    where lower(name) = 'payment_operational_safeguards'
  ) as payment_operational_safeguards_migration_present
)
select json_build_object(
  'contract_version', 1,
  'captured_at_utc', now(),
  'scope', 'PAYMENT_OPERATIONAL_READINESS_ONLY',
  'base_order_boundary', to_jsonb(order_state),
  'runtime_safeguards', to_jsonb(runtime_state),
  'counts', to_jsonb(counts),
  'first_wave', (
    select json_agg(json_build_object(
      'country', country_code,
      'currency', currency,
      'active_offer_rows', active_offer_rows,
      'approved_available_local_currency_offers', approved_available_local_currency_offers,
      'commercial_offer_ready', (approved_available_local_currency_offers > 0)
    ) order by country_code)
    from country_state
  ),
  'migration', to_jsonb(migration_state),
  'payment_database_readiness', (
    order_table_exists
    and order_rls_enabled
    and authenticated_select
    and authenticated_insert
    and not authenticated_update
    and not authenticated_delete
    and owner_pending_insert_policy_hardened
    and refund_cancel_state_model_present
    and service_order_external_idempotency_unique_guard
    and payment_provider_registry_exists
    and payment_event_ledger_exists
    and payment_operational_safeguards_migration_present
    and (select bool_and(approved_available_local_currency_offers > 0) from country_state)
  ),
  'runtime_sandbox_webhook_refund_cancel_verified', false,
  'overall_launch_approval', false,
  'note',
    'Database shape evidence cannot substitute for provider sandbox, signed webhook/replay, runtime idempotency, refund/cancel, reconciliation, monitoring, or human commercial approval.'
) as october_launch_payment_readiness
from order_state
cross join runtime_state
cross join counts
cross join migration_state;

rollback;
