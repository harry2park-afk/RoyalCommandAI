-- October launch payment operational safeguards.
-- Schema-first only: this migration does not enable a payment provider, create a
-- checkout session, mark an order paid, or make any country launchable.
-- Provider activation and webhook/runtime code remain separate evidence gates.

create table if not exists public.rc_payment_provider_registry (
  provider_key text primary key,
  display_name text,
  enabled boolean not null default false,
  sandbox_only boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rc_payment_provider_registry_key_check
    check (provider_key ~ '^[a-z0-9][a-z0-9_-]{1,31}$')
);

alter table public.rc_payment_provider_registry enable row level security;
revoke all privileges on table public.rc_payment_provider_registry
  from public, anon, authenticated;
grant select, insert, update, delete on table public.rc_payment_provider_registry
  to service_role;

comment on table public.rc_payment_provider_registry is
  'Server-only payment-provider allow-list. New providers default disabled and sandbox-only; this migration intentionally seeds none.';

alter table public.rc_service_connection_orders
  add column if not exists idempotency_key text;

alter table public.rc_service_connection_orders
  drop constraint if exists rc_service_connection_orders_idempotency_key_check;
alter table public.rc_service_connection_orders
  add constraint rc_service_connection_orders_idempotency_key_check
  check (
    idempotency_key is null
    or (char_length(idempotency_key) between 16 and 200 and idempotency_key !~ '[[:space:]]')
  );

alter table public.rc_service_connection_orders
  drop constraint if exists rc_service_connection_orders_external_ids_require_provider;
alter table public.rc_service_connection_orders
  add constraint rc_service_connection_orders_external_ids_require_provider
  check (
    (external_checkout_id is null and external_payment_id is null)
    or payment_provider is not null
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.rc_service_connection_orders'::regclass
      and conname = 'rc_service_connection_orders_payment_provider_fkey'
  ) then
    alter table public.rc_service_connection_orders
      add constraint rc_service_connection_orders_payment_provider_fkey
      foreign key (payment_provider)
      references public.rc_payment_provider_registry(provider_key)
      on update restrict
      on delete restrict;
  end if;
end
$$;

create unique index if not exists rc_service_connection_orders_owner_idempotency_uidx
  on public.rc_service_connection_orders(owner_id, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists rc_service_connection_orders_provider_checkout_uidx
  on public.rc_service_connection_orders(payment_provider, external_checkout_id)
  where payment_provider is not null and external_checkout_id is not null;

create unique index if not exists rc_service_connection_orders_provider_payment_uidx
  on public.rc_service_connection_orders(payment_provider, external_payment_id)
  where payment_provider is not null and external_payment_id is not null;

create or replace function private.enforce_rc_payment_provider_enabled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.payment_provider is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.rc_payment_provider_registry p
    where p.provider_key = new.payment_provider
      and p.enabled is true
  ) then
    raise exception 'payment provider is not enabled'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_rc_payment_provider_enabled()
  from public, anon, authenticated, service_role;

drop trigger if exists rc_service_connection_orders_provider_enabled
  on public.rc_service_connection_orders;
create trigger rc_service_connection_orders_provider_enabled
before insert or update of payment_provider
on public.rc_service_connection_orders
for each row
execute function private.enforce_rc_payment_provider_enabled();

create table if not exists public.rc_payment_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null
    references public.rc_payment_provider_registry(provider_key)
    on update restrict on delete restrict,
  provider_event_id text not null,
  event_type text not null,
  order_id uuid
    references public.rc_service_connection_orders(id)
    on delete set null,
  payload_sha256 text not null,
  signature_verified_at timestamptz not null,
  processing_status text not null default 'received'
    check (processing_status in ('received','processed','ignored','failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text,
  constraint rc_payment_provider_events_event_id_check
    check (char_length(provider_event_id) between 1 and 255),
  constraint rc_payment_provider_events_event_type_check
    check (char_length(event_type) between 1 and 255),
  constraint rc_payment_provider_events_payload_sha256_check
    check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  constraint rc_payment_provider_events_provider_event_unique
    unique (provider_key, provider_event_id)
);

alter table public.rc_payment_provider_events enable row level security;
revoke all privileges on table public.rc_payment_provider_events
  from public, anon, authenticated;
grant select, insert, update, delete on table public.rc_payment_provider_events
  to service_role;

create index if not exists rc_payment_provider_events_order_idx
  on public.rc_payment_provider_events(order_id, received_at desc)
  where order_id is not null;
create index if not exists rc_payment_provider_events_status_idx
  on public.rc_payment_provider_events(processing_status, received_at);

comment on table public.rc_payment_provider_events is
  'Server-only signed-webhook event ledger. Unique provider/event identity is the durable replay boundary; signature verification must occur before insert.';
comment on column public.rc_service_connection_orders.idempotency_key is
  'Server-generated or server-validated request idempotency key. Runtime must populate this before payment checkout can be considered launch-ready.';
