-- Allow the existing authenticated service-connection APIs to create only
-- their own initial pending payment orders. Settlement fields stay server-only.
-- This fixes the current fail-closed INSERT path without enabling payment completion.

alter table public.rc_service_connection_orders enable row level security;

revoke all privileges on table public.rc_service_connection_orders
  from public, anon, authenticated;
grant select, insert on table public.rc_service_connection_orders to authenticated;

drop policy if exists rc_service_connection_orders_owner_insert_pending
  on public.rc_service_connection_orders;

create policy rc_service_connection_orders_owner_insert_pending
on public.rc_service_connection_orders
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and payment_required is true
  and payment_status = 'pending'
  and payment_provider is null
  and external_checkout_id is null
  and external_payment_id is null
  and paid_at is null
  and (
    (connection_scope = 'rca_chat' and room_id is null)
    or
    (
      connection_scope = 'room'
      and room_id is not null
      and exists (
        select 1
        from public.rooms r
        where r.id = room_id
          and r.room_owner_id = auth.uid()
      )
    )
  )
);

comment on table public.rc_service_connection_orders is
  'Authenticated users may read their own orders and create only initial pending orders for themselves/their Rooms. Payment settlement fields remain server-controlled; authenticated UPDATE/DELETE is not granted.';
