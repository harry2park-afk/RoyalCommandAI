create table if not exists public.rc_service_country_terms (
  service_key text not null references public.rc_service_catalog(service_key) on delete cascade,
  country_code text not null,
  currency text not null default 'AUD',
  availability_status text not null default 'review' check (availability_status in ('available','review','unavailable','coming_soon')),
  commercial_model text not null default 'direct' check (commercial_model in ('included','customer_direct','rc_resale','wholesale','referral','commission','custom_quote','direct')),
  ownership_model text not null default 'customer_owned' check (ownership_model in ('customer_owned','rc_managed','either','not_applicable')),
  supplier_name text,
  supplier_retail_minor bigint,
  rc_partner_cost_minor bigint,
  customer_price_minor bigint,
  commission_bps integer check (commission_bps is null or (commission_bps >= 0 and commission_bps <= 10000)),
  margin_bps integer check (margin_bps is null or (margin_bps >= 0 and margin_bps <= 10000)),
  setup_fee_minor bigint,
  recurring_period text check (recurring_period is null or recurring_period in ('once','monthly','annual','usage')),
  customer_cancels_with_supplier boolean not null default false,
  rc_can_cancel boolean not null default false,
  requires_identity boolean not null default false,
  requires_supplier_account boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (service_key, country_code)
);

alter table public.rc_service_country_terms enable row level security;

do $$ begin
  create policy "service country terms readable" on public.rc_service_country_terms
  for select to authenticated using (true);
exception when duplicate_object then null;
end $$;

create index if not exists rc_service_country_terms_country_idx
on public.rc_service_country_terms(country_code, availability_status);

alter table public.rc_service_catalog
  add column if not exists commercial_model text,
  add column if not exists ownership_model text,
  add column if not exists supplier_name text,
  add column if not exists connection_status text not null default 'planned',
  add column if not exists education_key text;

comment on table public.rc_service_country_terms is
'Country-specific availability, ownership, partner cost, customer price, commission and margin terms for the global Room connection catalog.';
