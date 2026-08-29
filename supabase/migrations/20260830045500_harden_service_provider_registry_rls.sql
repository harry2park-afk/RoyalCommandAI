-- Launch hardening: provider registry contains internal commercial and margin data.
-- Keep it server/service-role only until an explicitly reviewed client access policy exists.
-- This migration intentionally adds no anon/authenticated RLS policies.

alter table public.rc_service_providers enable row level security;
alter table public.rc_service_provider_offers enable row level security;

revoke all privileges on table public.rc_service_providers from anon, authenticated;
revoke all privileges on table public.rc_service_provider_offers from anon, authenticated;
