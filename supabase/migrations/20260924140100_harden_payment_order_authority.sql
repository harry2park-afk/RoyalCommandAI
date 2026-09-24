-- October launch candidate: fail-closed payment order authority.
--
-- Hosted evidence on 2026-09-24 showed that authenticated callers still hold
-- direct INSERT authority on rc_service_connection_orders, including the
-- commercial snapshot fields amount_minor, currency, service_key,
-- terms_version and agreed_at. The current application keeps checkout disabled,
-- so there is no verified need for a browser/session role to insert payment
-- orders directly.
--
-- Safety properties:
--   * source-only until separately approved for a controlled non-Production cutover;
--   * no provider is enabled and no order data is created or changed;
--   * authenticated users keep owner-scoped SELECT through the existing RLS policy;
--   * direct client INSERT/UPDATE/DELETE is removed;
--   * the obsolete authenticated pending-order INSERT policy is removed as
--     defense in depth if table grants are accidentally widened later;
--   * trusted service/admin contexts are not modified by these revokes.

begin;

alter table public.rc_service_connection_orders enable row level security;

revoke insert, update, delete, truncate, references, trigger
  on table public.rc_service_connection_orders
  from public, anon, authenticated;

grant select
  on table public.rc_service_connection_orders
  to authenticated;

drop policy if exists rc_service_connection_orders_owner_insert_pending
  on public.rc_service_connection_orders;

comment on table public.rc_service_connection_orders is
  'Payment/order control-plane table. Authenticated users may read only their own orders through RLS; order creation and settlement must be mediated by a reviewed trusted server/payment workflow.';

commit;
