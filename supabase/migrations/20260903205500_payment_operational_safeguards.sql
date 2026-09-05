-- October launch candidate: additive payment operational safeguards only.
--
-- Safety properties:
--   * no payment provider is seeded or activated by this migration;
--   * existing service-order insert/runtime behaviour is not changed;
--   * order idempotency remains nullable until the runtime path is verified to supply it;
--   * webhook/event payloads are represented by a SHA-256 digest, not raw payload data;
--   * provider registry and event ledger are not directly accessible to anon/authenticated;
--   * production_ready cannot be declared without webhook/refund/cancellation capability;
--   * webhook events cannot enter processing/processed state until signature verification is recorded.
--
-- This migration is source-only until separately approved for a controlled Hosted cutover.

create table if not exists public.rc_payment_provider_registry (
  provider_key text not null,
  environment text not null
    check (environment in ('sandbox', 'production')),
  status text not null default 'disabled'
    check (status in ('disabled', 'sandbox_ready', 'production_ready')),
  supports_webhooks boolean not null default false,
  supports_refunds boolean not null default false,
  supports_cancellations boolean not null default false,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (provider_key, environment),
  constraint rc_payment_provider_registry_key_nonempty
    check (length(btrim(provider_key)) between 2 and 64),
  constraint rc_payment_provider_registry_review_provenance
    check (
      status = 'disabled'
      or (reviewed_by is not null and reviewed_at is not null)
    ),
  constraint rc_payment_provider_registry_production_capabilities
    check (
      status <> 'production_ready'
      or (supports_webhooks and supports_refunds and supports_cancellations)
    )
);

alter table public.rc_payment_provider_registry enable row level security;
revoke all on table public.rc_payment_provider_registry from public, anon, authenticated;

comment on table public.rc_payment_provider_registry is
  'Fail-closed payment-provider readiness registry. No providers are seeded by the launch safeguard migration.';
comment on column public.rc_payment_provider_registry.status is
  'disabled by default; sandbox_ready/production_ready require reviewer provenance, and production_ready also requires webhook/refund/cancellation capability.';

create table if not exists public.rc_payment_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null,
  environment text not null
    check (environment in ('sandbox', 'production')),
  external_event_id text not null,
  event_type text not null,
  order_id uuid references public.rc_service_connection_orders(id) on delete set null,
  payload_sha256 text not null,
  signature_verified boolean not null default false,
  processing_status text not null default 'received'
    check (processing_status in ('received', 'processing', 'processed', 'ignored', 'failed')),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text,
  constraint rc_payment_provider_events_provider_fk
    foreign key (provider_key, environment)
    references public.rc_payment_provider_registry(provider_key, environment)
    on update cascade on delete restrict,
  constraint rc_payment_provider_events_external_id_nonempty
    check (length(btrim(external_event_id)) between 1 and 255),
  constraint rc_payment_provider_events_type_nonempty
    check (length(btrim(event_type)) between 1 and 128),
  constraint rc_payment_provider_events_payload_sha256
    check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  constraint rc_payment_provider_events_processing_requires_verified_signature
    check (
      processing_status not in ('processing', 'processed')
      or signature_verified
    ),
  constraint rc_payment_provider_events_processed_timestamp
    check (
      processing_status not in ('processed', 'ignored')
      or processed_at is not null
    ),
  unique (provider_key, environment, external_event_id)
);

alter table public.rc_payment_provider_events enable row level security;
revoke all on table public.rc_payment_provider_events from public, anon, authenticated;

create index if not exists rc_payment_provider_events_order_received_idx
  on public.rc_payment_provider_events(order_id, received_at desc)
  where order_id is not null;

create index if not exists rc_payment_provider_events_status_received_idx
  on public.rc_payment_provider_events(processing_status, received_at)
  where processing_status in ('received', 'processing', 'failed');

comment on table public.rc_payment_provider_events is
  'Private payment webhook/event ledger with provider-event uniqueness. Store payload digest only; never raw webhook payloads. Processing requires recorded signature verification.';

alter table public.rc_service_connection_orders
  add column if not exists idempotency_key text;

alter table public.rc_service_connection_orders
  drop constraint if exists rc_service_connection_orders_idempotency_key_format;
alter table public.rc_service_connection_orders
  add constraint rc_service_connection_orders_idempotency_key_format
  check (
    idempotency_key is null
    or (
      length(idempotency_key) between 16 and 128
      and idempotency_key = btrim(idempotency_key)
    )
  );

create unique index if not exists rc_service_connection_orders_owner_idempotency_uidx
  on public.rc_service_connection_orders(owner_id, idempotency_key)
  where idempotency_key is not null;

comment on column public.rc_service_connection_orders.idempotency_key is
  'Optional rollout-safe idempotency key. It must remain nullable until the verified checkout/order runtime supplies stable keys; launch readiness must not infer idempotency coverage from schema presence alone.';
