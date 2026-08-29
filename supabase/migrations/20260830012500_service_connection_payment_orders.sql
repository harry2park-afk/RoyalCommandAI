create table if not exists public.rc_service_connection_orders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete cascade,
  service_key text not null references public.rc_service_catalog(service_key) on delete restrict,
  connection_scope text not null check (connection_scope in ('room','rca_chat')),
  terms_version text not null,
  agreed_at timestamptz not null,
  amount_minor bigint,
  currency text,
  payment_required boolean not null default true,
  payment_status text not null default 'pending'
    check (payment_status in ('not_required','pending','paid','failed','cancelled','refunded')),
  payment_provider text,
  external_checkout_id text,
  external_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.rc_service_connection_orders enable row level security;
drop policy if exists rc_service_connection_orders_owner_select on public.rc_service_connection_orders;
create policy rc_service_connection_orders_owner_select
on public.rc_service_connection_orders
for select to authenticated
using (owner_id = auth.uid());

create index if not exists rc_service_connection_orders_owner_status_idx
  on public.rc_service_connection_orders(owner_id, payment_status, created_at desc);
create index if not exists rc_service_connection_orders_room_idx
  on public.rc_service_connection_orders(room_id, service_key, created_at desc);
