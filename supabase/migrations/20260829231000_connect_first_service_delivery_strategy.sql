alter table public.rc_service_catalog
  add column if not exists delivery_strategy text not null default 'connect_first'
  check (delivery_strategy in ('connect_first','build_if_needed','rc_native'));

alter table public.rc_service_catalog
  add column if not exists build_status text not null default 'not_planned'
  check (build_status in ('not_planned','research','candidate','planned','building','available'));

alter table public.rc_service_provider_offers
  add column if not exists priority integer not null default 100;

alter table public.rc_service_provider_offers
  add column if not exists preferred boolean not null default false;

alter table public.rc_service_provider_offers
  add column if not exists provider_fit_score integer
  check (provider_fit_score is null or (provider_fit_score >= 0 and provider_fit_score <= 100));

alter table public.rc_service_provider_offers
  add column if not exists review_status text not null default 'unverified'
  check (review_status in ('unverified','researching','approved','rejected','suspended'));

create index if not exists rc_service_provider_offers_preferred_idx
  on public.rc_service_provider_offers(service_key, country_code, preferred, priority)
  where active = true;
