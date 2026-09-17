-- RoyalCommandAI payment commercial-authority evidence
-- READ-ONLY / fail-closed. This script does not modify Hosted Supabase state.
-- Purpose: prove whether authenticated callers can set commercial order snapshot
-- fields directly and whether the database currently canonicalizes those values.
-- This does not prove application-server behavior; any server-side checkout path
-- must be verified separately before payment activation.

begin read only;

with payment_function_refs as (
  select count(*)::int as cnt
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where p.prokind = 'f'
    and n.nspname not in ('pg_catalog', 'information_schema')
    and (
      pg_get_functiondef(p.oid) ilike '%rc_service_connection_orders%'
      or pg_get_functiondef(p.oid) ilike '%external_checkout_id%'
      or pg_get_functiondef(p.oid) ilike '%payment_provider%'
    )
), payment_triggers as (
  select count(*)::int as cnt
  from pg_trigger tg
  where tg.tgrelid = 'public.rc_service_connection_orders'::regclass
    and not tg.tgisinternal
), evidence as (
  select
    has_table_privilege(
      'authenticated',
      'public.rc_service_connection_orders',
      'INSERT'
    ) as authenticated_insert,
    has_column_privilege(
      'authenticated',
      'public.rc_service_connection_orders',
      'amount_minor',
      'INSERT'
    ) as amount_minor_insert,
    has_column_privilege(
      'authenticated',
      'public.rc_service_connection_orders',
      'currency',
      'INSERT'
    ) as currency_insert,
    has_column_privilege(
      'authenticated',
      'public.rc_service_connection_orders',
      'service_key',
      'INSERT'
    ) as service_key_insert,
    has_column_privilege(
      'authenticated',
      'public.rc_service_connection_orders',
      'terms_version',
      'INSERT'
    ) as terms_version_insert,
    has_column_privilege(
      'authenticated',
      'public.rc_service_connection_orders',
      'agreed_at',
      'INSERT'
    ) as agreed_at_insert,
    (select cnt from payment_function_refs) as function_refs,
    (select cnt from payment_triggers) as trigger_count,
    (select count(*)::int from public.rc_service_connection_orders) as order_count
)
select jsonb_build_object(
  'authenticated_insert_privilege', authenticated_insert,
  'commercial_snapshot_insert_privileges', jsonb_build_object(
    'amount_minor', amount_minor_insert,
    'currency', currency_insert,
    'service_key', service_key_insert,
    'terms_version', terms_version_insert,
    'agreed_at', agreed_at_insert
  ),
  'db_function_refs_to_order_or_payment_fields', function_refs,
  'order_trigger_count', trigger_count,
  'orders_total', order_count,
  'commercial_authority_status', case
    when authenticated_insert
      and amount_minor_insert
      and currency_insert
      and service_key_insert
      and terms_version_insert
      and agreed_at_insert
      and function_refs = 0
      and trigger_count = 0
      then 'HOLD_CLIENT_WRITABLE_COMMERCIAL_SNAPSHOT_WITHOUT_DB_CANONICALIZER'
    else 'REVIEW_REQUIRED'
  end
) as payment_commercial_authority_evidence
from evidence;

rollback;
