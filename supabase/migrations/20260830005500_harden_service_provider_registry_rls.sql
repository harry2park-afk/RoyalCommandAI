-- Launch hardening: provider commercial terms contain internal supplier cost,
-- margin and commission data. Keep these registry tables server-managed until a
-- deliberately scoped public/customer-facing projection is introduced.

alter table public.rc_service_providers enable row level security;
alter table public.rc_service_provider_offers enable row level security;

revoke all on table public.rc_service_providers from anon, authenticated;
revoke all on table public.rc_service_provider_offers from anon, authenticated;

-- service_role retains its existing server-side privileges and bypasses RLS.
-- No anon/authenticated policies are created here: fail closed by default.
