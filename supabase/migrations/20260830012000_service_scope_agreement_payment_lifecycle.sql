alter table public.rc_service_catalog
  add column if not exists connection_scope text not null default 'room'
    check (connection_scope in ('room','rca_chat')),
  add column if not exists agreement_required boolean not null default true,
  add column if not exists terms_version text not null default '1.0';

update public.rc_service_catalog
set connection_scope = 'rca_chat'
where service_key in ('advanced_ai');

alter table public.rc_room_service_selections
  add column if not exists agreed_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists payment_status text not null default 'not_required'
    check (payment_status in ('not_required','required','pending','paid','failed','refunded')),
  add column if not exists price_snapshot_minor bigint,
  add column if not exists currency_snapshot text;

create table if not exists public.rc_user_service_selections (
  owner_id uuid not null references auth.users(id) on delete cascade,
  service_key text not null references public.rc_service_catalog(service_key) on delete restrict,
  selection_status text not null default 'selected'
    check (selection_status in ('selected','pending_payment','active','paused','cancelled')),
  agreed_at timestamptz,
  terms_version text,
  payment_status text not null default 'not_required'
    check (payment_status in ('not_required','required','pending','paid','failed','refunded')),
  price_snapshot_minor bigint,
  currency_snapshot text,
  selected_at timestamptz not null default now(),
  activated_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, service_key)
);

alter table public.rc_user_service_selections enable row level security;
drop policy if exists rc_user_service_selections_owner_all on public.rc_user_service_selections;
create policy rc_user_service_selections_owner_all
on public.rc_user_service_selections
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create index if not exists rc_service_catalog_scope_idx
  on public.rc_service_catalog(connection_scope, active, customer_selectable, category, sort_order);
