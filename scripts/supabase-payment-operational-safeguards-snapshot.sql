-- RoyalCommandAI payment operational safeguards evidence
-- READ-ONLY / fail-closed. This script verifies the schema-level safety
-- boundaries proposed for first-wave payment readiness without treating
-- schema presence as provider sandbox/runtime/country approval.

begin read only;

select jsonb_build_object(
  'provider_registry_present',
    to_regclass('public.rc_payment_provider_registry') is not null,
  'provider_registry_rls_enabled',
    coalesce((
      select relation.relrowsecurity
      from pg_class relation
      where relation.oid = to_regclass('public.rc_payment_provider_registry')
    ), false),
  'provider_registry_authenticated_direct_dml', case
    when to_regclass('public.rc_payment_provider_registry') is null then null
    else has_table_privilege(
      'authenticated',
      to_regclass('public.rc_payment_provider_registry'),
      'SELECT,INSERT,UPDATE,DELETE'
    )
  end,
  'provider_registry_anon_direct_dml', case
    when to_regclass('public.rc_payment_provider_registry') is null then null
    else has_table_privilege(
      'anon',
      to_regclass('public.rc_payment_provider_registry'),
      'SELECT,INSERT,UPDATE,DELETE'
    )
  end,
  'provider_registry_review_provenance_constraint_present', exists(
    select 1
    from pg_constraint constraint_row
    join pg_class relation on relation.oid = constraint_row.conrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'rc_payment_provider_registry'
      and constraint_row.conname = 'rc_payment_provider_registry_review_provenance'
  ),
  'provider_registry_production_capabilities_constraint_present', exists(
    select 1
    from pg_constraint constraint_row
    join pg_class relation on relation.oid = constraint_row.conrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'rc_payment_provider_registry'
      and constraint_row.conname = 'rc_payment_provider_registry_production_capabilities'
  ),
  'provider_events_present',
    to_regclass('public.rc_payment_provider_events') is not null,
  'provider_events_rls_enabled',
    coalesce((
      select relation.relrowsecurity
      from pg_class relation
      where relation.oid = to_regclass('public.rc_payment_provider_events')
    ), false),
  'provider_events_authenticated_direct_dml', case
    when to_regclass('public.rc_payment_provider_events') is null then null
    else has_table_privilege(
      'authenticated',
      to_regclass('public.rc_payment_provider_events'),
      'SELECT,INSERT,UPDATE,DELETE'
    )
  end,
  'provider_events_anon_direct_dml', case
    when to_regclass('public.rc_payment_provider_events') is null then null
    else has_table_privilege(
      'anon',
      to_regclass('public.rc_payment_provider_events'),
      'SELECT,INSERT,UPDATE,DELETE'
    )
  end,
  'provider_events_signature_gate_constraint_present', exists(
    select 1
    from pg_constraint constraint_row
    join pg_class relation on relation.oid = constraint_row.conrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'rc_payment_provider_events'
      and constraint_row.conname =
        'rc_payment_provider_events_processing_requires_verified_signature'
  ),
  'provider_events_payload_sha256_constraint_present', exists(
    select 1
    from pg_constraint constraint_row
    join pg_class relation on relation.oid = constraint_row.conrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'rc_payment_provider_events'
      and constraint_row.conname = 'rc_payment_provider_events_payload_sha256'
  ),
  'provider_events_replay_unique_boundary_present', exists(
    select 1
    from pg_constraint constraint_row
    join pg_class relation on relation.oid = constraint_row.conrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'rc_payment_provider_events'
      and constraint_row.contype = 'u'
      and pg_get_constraintdef(constraint_row.oid)
        ilike '%unique (provider_key, environment, external_event_id)%'
  ),
  'provider_events_non_digest_payload_columns', (
    select count(*)::int
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'rc_payment_provider_events'
      and column_name ilike '%payload%'
      and column_name <> 'payload_sha256'
  ),
  'service_order_idempotency_key_present', exists(
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'rc_service_connection_orders'
      and column_name = 'idempotency_key'
  ),
  'service_order_owner_idempotency_unique_index_present',
    to_regclass('public.rc_service_connection_orders_owner_idempotency_uidx')
      is not null
) as payment_operational_safeguards_snapshot;

rollback;
