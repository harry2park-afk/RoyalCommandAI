alter table public.rc_service_provider_offers
  add column if not exists delivery_surface text not null default 'research'
  check (delivery_surface in ('rc_embedded','rc_managed','external_fallback','research'));

create index if not exists rc_service_provider_offers_delivery_surface_idx
  on public.rc_service_provider_offers(service_key, country_code, delivery_surface, active);

comment on column public.rc_service_provider_offers.delivery_surface is
  'Customer-facing delivery location. Prefer rc_embedded, then rc_managed. external_fallback is last resort.';
