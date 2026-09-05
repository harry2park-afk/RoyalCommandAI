\set ON_ERROR_STOP on

-- Disposable-database structural evidence for the October payment foundation.
-- This does not prove provider sandbox checkout/webhook/refund/cancel behavior.

do $$
declare
  provider_rows bigint;
begin
  if to_regclass('public.rc_payment_provider_registry') is null then
    raise exception 'payment provider registry missing';
  end if;
  if to_regclass('public.rc_payment_provider_events') is null then
    raise exception 'payment provider event ledger missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'rc_service_connection_orders'
      and column_name = 'idempotency_key'
  ) then
    raise exception 'order idempotency_key missing';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.rc_service_connection_orders'::regclass
      and conname = 'rc_service_connection_orders_payment_provider_fkey'
  ) then
    raise exception 'payment provider foreign key missing';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'rc_service_connection_orders'
      and indexname = 'rc_service_connection_orders_owner_idempotency_uidx'
  ) then
    raise exception 'idempotency unique index missing';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'rc_service_connection_orders'
      and indexname = 'rc_service_connection_orders_provider_checkout_uidx'
  ) then
    raise exception 'provider checkout unique index missing';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'rc_service_connection_orders'
      and indexname = 'rc_service_connection_orders_provider_payment_uidx'
  ) then
    raise exception 'provider payment unique index missing';
  end if;

  if to_regprocedure('private.enforce_rc_payment_provider_enabled()') is null then
    raise exception 'provider enabled trigger function missing';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.rc_service_connection_orders'::regclass
      and tgname = 'rc_service_connection_orders_provider_enabled'
      and not tgisinternal
  ) then
    raise exception 'provider enabled trigger missing';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.rc_payment_provider_events'::regclass
      and conname = 'rc_payment_provider_events_provider_event_unique'
  ) then
    raise exception 'durable provider event replay boundary missing';
  end if;

  if not (
    select relrowsecurity
    from pg_class
    where oid = 'public.rc_payment_provider_registry'::regclass
  ) then
    raise exception 'payment provider registry RLS disabled';
  end if;

  if not (
    select relrowsecurity
    from pg_class
    where oid = 'public.rc_payment_provider_events'::regclass
  ) then
    raise exception 'payment event ledger RLS disabled';
  end if;

  if has_table_privilege('anon', 'public.rc_payment_provider_registry', 'SELECT')
    or has_table_privilege('authenticated', 'public.rc_payment_provider_registry', 'SELECT') then
    raise exception 'client roles must not read payment provider registry';
  end if;

  if has_table_privilege('anon', 'public.rc_payment_provider_events', 'SELECT')
    or has_table_privilege('authenticated', 'public.rc_payment_provider_events', 'SELECT') then
    raise exception 'client roles must not read payment provider event ledger';
  end if;

  if has_function_privilege('anon', 'private.enforce_rc_payment_provider_enabled()', 'EXECUTE')
    or has_function_privilege('authenticated', 'private.enforce_rc_payment_provider_enabled()', 'EXECUTE')
    or has_function_privilege('service_role', 'private.enforce_rc_payment_provider_enabled()', 'EXECUTE') then
    raise exception 'provider trigger function must not be directly executable by application roles';
  end if;

  select count(*) into provider_rows from public.rc_payment_provider_registry;
  if provider_rows <> 0 then
    raise exception 'migration must not activate or seed a payment provider';
  end if;
end
$$;

select
  'payment_safeguard_schema' as evidence,
  'PASS' as status,
  'provider allow-list exists but is empty; idempotency/external-ID uniqueness/event replay ledger are present' as detail;
