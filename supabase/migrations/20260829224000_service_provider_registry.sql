create table if not exists public.rc_service_providers (
  provider_key text primary key,
  provider_name text not null,
  website_url text,
  category text not null,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rc_service_provider_offers (
  id uuid primary key default gen_random_uuid(),
  service_key text not null references public.rc_service_catalog(service_key) on delete cascade,
  provider_key text not null references public.rc_service_providers(provider_key) on delete cascade,
  country_code text not null,
  commercial_model text not null check (commercial_model in ('customer_direct','rc_resale','wholesale','referral','commission','custom_quote')),
  ownership_model text not null default 'customer_owned' check (ownership_model in ('customer_owned','rc_managed','either','not_applicable')),
  supplier_cost_minor bigint,
  retail_price_minor bigint,
  customer_price_minor bigint,
  currency text not null default 'AUD',
  commission_bps integer,
  rc_margin_bps integer,
  customer_discount_bps integer,
  api_available boolean not null default false,
  oauth_available boolean not null default false,
  connection_status text not null default 'research' check (connection_status in ('research','available','partner_required','manual_only','blocked')),
  active boolean not null default true,
  terms_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(service_key, provider_key, country_code)
);

create index if not exists rc_service_provider_offers_service_country_idx on public.rc_service_provider_offers(service_key, country_code);
create index if not exists rc_service_provider_offers_provider_country_idx on public.rc_service_provider_offers(provider_key, country_code);