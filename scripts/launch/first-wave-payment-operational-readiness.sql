-- Royal Command October first-wave payment operational readiness preflight.
-- READ ONLY: this script must not mutate schema, data, Auth, payment-provider state, or launch state.
-- First wave: Australia, United States, Canada, South Korea, Japan, United Kingdom.
-- PASS means only that the individual database evidence below is present.
-- Provider checkout/signed-webhook/refund/cancel/reconciliation E2E remains independently required.

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
          and coalesce(qual, '') ~* '(owner_id.*auth[.]uid|auth[.]uid.*owner_id)'
      )
      and exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'rc_service_connection_orders'
          and cmd = 'INSERT'
          and coalesce(with_check, '') ~* '(owner_id.*auth[.]uid|auth[.]uid.*owner_id)'
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
    'customer UPDATE/DELETE policies must be absent; provider lifecycle writes belong to controlled server paths'

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
    'payment.provider_registry_schema',
    case when
      to_regclass('public.rc_payment_provider_registry') is not null
      and (
        select count(*)
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'rc_payment_provider_registry'
          and column_name in (
            'provider_key','environment','status','supports_webhooks',
            'supports_refunds','supports_cancellations','reviewed_by','reviewed_at'
          )
      ) = 8
    then 'PASS' else 'BLOCKED' end,
    'reviewed additive safeguard contract from PR #658; no provider activation is inferred'

  union all

  select
    'payment.provider_review_provenance_constraint',
    case when exists (
      select 1
      from pg_constraint c
      where c.conrelid = to_regclass('public.rc_payment_provider_registry')
        and c.contype = 'c'
        and pg_get_constraintdef(c.oid) ~* 'reviewed_by'
        and pg_get_constraintdef(c.oid) ~* 'reviewed_at'
    ) then 'PASS' else 'BLOCKED' end,
    'non-disabled provider readiness must require reviewer provenance'

  union all

  select
    'payment.provider_production_capability_constraint',
    case when exists (
      select 1
      from pg_constraint c
      where c.conrelid = to_regclass('public.rc_payment_provider_registry')
        and c.contype = 'c'
        and pg_get_constraintdef(c.oid) ~* 'production_ready'
        and pg_get_constraintdef(c.oid) ~* 'supports_webhooks'
        and pg_get_constraintdef(c.oid) ~* 'supports_refunds'
        and pg_get_constraintdef(c.oid) ~* 'supports_cancellations'
    ) then 'PASS' else 'BLOCKED' end,
    'production_ready must require webhook/refund/cancellation capability flags'

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
    'schema presence alone is not runtime idempotency evidence'

  union all

  select
    'payment.owner_idempotency_unique',
    case when exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'rc_service_connection_orders'
        and indexdef ~* 'unique'
        and indexdef ~* 'owner_id'
        and indexdef ~* 'idempotency_key'
    ) then 'PASS' else 'BLOCKED' end,
    'expected partial unique owner/idempotency boundary'

  union all

  select
    'payment.runtime_idempotency_evidence',
    case when (
      select count(*)
      from public.rc_service_connection_orders o
      where nullif(btrim(to_jsonb(o) ->> 'idempotency_key'), '') is not null
    ) > 0 then 'PASS' else 'BLOCKED' end,
    'orders_with_nonempty_idempotency_key=' || (
      select count(*)::text
      from public.rc_service_connection_orders o
      where nullif(btrim(to_jsonb(o) ->> 'idempotency_key'), '') is not null
    ) || '; no identifiers emitted'

  union all

  select
    'payment.provider_event_ledger_schema',
    case when
      to_regclass('public.rc_payment_provider_events') is not null
      and (
        select count(*)
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'rc_payment_provider_events'
          and column_name in (
            'provider_key','environment','external_event_id','event_type',
            'payload_sha256','signature_verified','processing_status',
            'received_at','processed_at'
          )
      ) = 9
    then 'PASS' else 'BLOCKED' end,
    'event ledger must store a payload digest, not raw webhook payloads'

  union all

  select
    'payment.provider_event_replay_boundary',
    case when exists (
      select 1
      from pg_constraint c
      where c.conrelid = to_regclass('public.rc_payment_provider_events')
        and c.contype = 'u'
        and pg_get_constraintdef(c.oid) ~* 'provider_key'
        and pg_get_constraintdef(c.oid) ~* 'environment'
        and pg_get_constraintdef(c.oid) ~* 'external_event_id'
    ) then 'PASS' else 'BLOCKED' end,
    'provider/environment/external-event uniqueness must reject duplicate webhook replay'

  union all

  select
    'payment.signature_before_processing_constraint',
    case when exists (
      select 1
      from pg_constraint c
      where c.conrelid = to_regclass('public.rc_payment_provider_events')
        and c.contype = 'c'
        and pg_get_constraintdef(c.oid) ~* 'signature_verified'
        and pg_get_constraintdef(c.oid) ~* 'processing'
        and pg_get_constraintdef(c.oid) ~* 'processed'
    ) then 'PASS' else 'BLOCKED' end,
    'processing/processed states must require recorded signature verification'

  union all

  select
    'payment.payload_digest_constraint',
    case when exists (
      select 1
      from pg_constraint c
      where c.conrelid = to_regclass('public.rc_payment_provider_events')
        and c.contype = 'c'
        and pg_get_constraintdef(c.oid) ~* 'payload_sha256'
    ) then 'PASS' else 'BLOCKED' end,
    'payload digest constraint must be present'

  union all

  select
    'payment.processed_timestamp_constraint',
    case when exists (
      select 1
      from pg_constraint c
      where c.conrelid = to_regclass('public.rc_payment_provider_events')
        and c.contype = 'c'
        and pg_get_constraintdef(c.oid) ~* 'processed_at'
    ) then 'PASS' else 'BLOCKED' end,
    'processed/ignored event states must carry processed_at'

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
    'expected-currency nonblocked terms=' || (
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
