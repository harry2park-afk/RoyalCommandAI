-- Royal Command October first-wave payment operational readiness preflight.
-- READ ONLY: this script must not mutate schema, data, Auth, payment-provider state, or launch state.
-- First wave: Australia, United States, Canada, South Korea, Japan, United Kingdom.
-- PASS means only that the individual database evidence below is present.
-- Provider checkout/webhook/refund E2E evidence remains independently required before any country is READY.

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
checks as (
  select
    'payment.required_tables'::text as metric,
    case when
      to_regclass('public.rc_service_catalog') is not null
      and to_regclass('public.rc_service_country_terms') is not null
      and to_regclass('public.rc_service_connection_orders') is not null
    then 'PASS' else 'BLOCKED' end as status,
    'catalog=' || coalesce(to_regclass('public.rc_service_catalog')::text, 'missing')
      || ', terms=' || coalesce(to_regclass('public.rc_service_country_terms')::text, 'missing')
      || ', orders=' || coalesce(to_regclass('public.rc_service_connection_orders')::text, 'missing') as detail

  union all

  select
    'payment.orders_rls_enabled',
    case when exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'rc_service_connection_orders'
        and c.relrowsecurity
    ) then 'PASS' else 'BLOCKED' end,
    'RLS must remain enabled for customer payment-order data'

  union all

  select
    'payment.order_owner_policy_shape',
    case when
      exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'rc_service_connection_orders'
          and cmd = 'SELECT'
          and coalesce(qual, '') ~* 'auth[.]uid[(][)]'
          and coalesce(qual, '') ~* 'owner_id'
      )
      and exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'rc_service_connection_orders'
          and cmd = 'INSERT'
          and coalesce(with_check, '') ~* 'auth[.]uid[(][)]'
          and coalesce(with_check, '') ~* 'owner_id'
      )
    then 'PASS' else 'BLOCKED' end,
    'authenticated SELECT/INSERT must remain owner-scoped; behavioral negative tests are still required'

  union all

  select
    'payment.customer_update_delete_surface',
    case when not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'rc_service_connection_orders'
        and cmd in ('UPDATE', 'DELETE')
        and 'authenticated' = any(roles)
    ) then 'PASS' else 'BLOCKED' end,
    'customer UPDATE/DELETE RLS policies must be absent; provider lifecycle writes belong to controlled server paths'

  union all

  select
    'payment.lifecycle_status_constraint',
    case when exists (
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
    ) then 'PASS' else 'BLOCKED' end,
    'expected states: not_required, pending, paid, failed, cancelled, refunded'

  union all

  select
    'payment.provider_value_constraint',
    case when exists (
      select 1
      from pg_constraint c
      where c.conrelid = to_regclass('public.rc_service_connection_orders')
        and c.contype = 'c'
        and pg_get_constraintdef(c.oid) ~* 'payment_provider'
    ) then 'PASS' else 'BLOCKED' end,
    'payment_provider has no database allow-list unless a CHECK constraint is present'

  union all

  select
    'payment.external_checkout_id_unique',
    case when exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'rc_service_connection_orders'
        and indexdef ~* 'unique'
        and indexdef ~* 'external_checkout_id'
    ) then 'PASS' else 'BLOCKED' end,
    'provider checkout replay protection requires a verified uniqueness/idempotency strategy'

  union all

  select
    'payment.external_payment_id_unique',
    case when exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'rc_service_connection_orders'
        and indexdef ~* 'unique'
        and indexdef ~* 'external_payment_id'
    ) then 'PASS' else 'BLOCKED' end,
    'provider payment replay protection requires a verified uniqueness/idempotency strategy'

  union all

  select
    'payment.explicit_idempotency_key',
    case when exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'rc_service_connection_orders'
        and column_name = 'idempotency_key'
    ) then 'PASS' else 'BLOCKED' end,
    'an explicit key is one acceptable strategy; equivalent provider-event uniqueness may satisfy this gate after review'

  union all

  select
    'payment.provider_event_ledger',
    case when exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and (
          table_name ~* '(payment|stripe).*(event|webhook)'
          or table_name ~* '(event|webhook).*(payment|stripe)'
        )
    ) then 'PASS' else 'BLOCKED' end,
    'durable provider-event deduplication/audit storage must be verified before webhook READY'

  union all

  select
    'payment.first_wave_terms_currency_coverage',
    case when (
      select count(*)
      from first_wave fw
      where exists (
        select 1
        from public.rc_service_country_terms t
        where upper(t.country_code) = fw.country_code
          and upper(t.currency) = fw.expected_currency
          and lower(t.availability_status) not in ('blocked', 'unavailable', 'disabled')
      )
    ) = 6 then 'PASS' else 'BLOCKED' end,
    'expected-currency country terms with non-blocked availability=' || (
      select count(*)::text
      from first_wave fw
      where exists (
        select 1
        from public.rc_service_country_terms t
        where upper(t.country_code) = fw.country_code
          and upper(t.currency) = fw.expected_currency
          and lower(t.availability_status) not in ('blocked', 'unavailable', 'disabled')
      )
    ) || '/6'

  union all

  select
    'payment.first_wave_positive_catalog_currency_coverage',
    case when (
      select count(*)
      from first_wave fw
      where exists (
        select 1
        from public.rc_service_catalog c
        where c.active
          and c.customer_selectable
          and c.price_status = 'fixed'
          and coalesce(c.price_minor, 0) > 0
          and upper(c.currency) = fw.expected_currency
      )
    ) = 6 then 'PASS' else 'BLOCKED' end,
    'expected currencies with >=1 active/selectable fixed positive service=' || (
      select count(*)::text
      from first_wave fw
      where exists (
        select 1
        from public.rc_service_catalog c
        where c.active
          and c.customer_selectable
          and c.price_status = 'fixed'
          and coalesce(c.price_minor, 0) > 0
          and upper(c.currency) = fw.expected_currency
      )
    ) || '/6'

  union all

  select
    'payment.orders_current_state',
    'INFO',
    'orders=' || count(*)::text
      || ', paid=' || count(*) filter (where payment_status = 'paid')::text
      || ', failed=' || count(*) filter (where payment_status = 'failed')::text
      || ', cancelled=' || count(*) filter (where payment_status = 'cancelled')::text
      || ', refunded=' || count(*) filter (where payment_status = 'refunded')::text
    from public.rc_service_connection_orders
)
select metric, status, detail
from checks
order by metric;

-- Aggregate-only inventory. No order IDs, customer IDs, provider IDs, or other customer data are emitted.
select
  payment_status,
  coalesce(payment_provider, 'unset') as payment_provider,
  upper(coalesce(currency, 'unset')) as currency,
  count(*) as order_count
from public.rc_service_connection_orders
group by payment_status, payment_provider, upper(coalesce(currency, 'unset'))
order by payment_status, payment_provider, currency;

rollback;
