-- RoyalCommandAI Hosted migration 20260920091809 schema-only reconstruction evidence
-- RECONSTRUCTION ONLY / DO NOT APPLY AS A MIGRATION.
-- Source: read-only pg_catalog/information_schema evidence captured 2026-09-21.
-- Purpose: preserve the non-PII schema shape of add_secure_rc_customer_numbers without
-- copying the Hosted migration's customer-specific INSERT/backfill into this public repository.
-- This artifact does NOT close deployment provenance by itself and does NOT authorize
-- migration repair/replay, Hosted mutation, Production deployment, or Country READY.

-- Observed sequence shape.
create sequence public.rc_customer_number_seq
  as bigint
  increment by 1
  minvalue 1
  maxvalue 9223372036854775807
  start with 357071
  cache 1
  no cycle;

-- Observed table shape. Customer/backfill rows are intentionally omitted.
create table public.rc_customer_accounts (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  customer_number text not null unique
    check (customer_number ~ '^RC [0-9]{7}$'::text),
  customer_sequence bigint not null unique
    check (customer_sequence >= 357060),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rc_customer_accounts enable row level security;

create policy rc_customer_accounts_read_own
  on public.rc_customer_accounts
  for select
  to authenticated
  using (owner_id = auth.uid());

-- Observed migration-classification evidence includes both REVOKE and GRANT statements.
-- Keep this reconstruction faithful to the known intent while making no claim that these
-- statements alone produce least-privilege effective ACLs on a database with pre-existing
-- default grants. Fresh Hosted evidence shows authenticated currently retains broad table ACLs.
revoke all on table public.rc_customer_accounts from anon;
grant select on table public.rc_customer_accounts to authenticated;

revoke all on sequence public.rc_customer_number_seq from anon, authenticated;
grant usage on sequence public.rc_customer_number_seq to service_role;

-- Intentionally absent:
--   * INSERT/backfill data
--   * customer UUIDs or customer-number row values
--   * allocator trigger/default/function
--   * migration repair/replay commands
--   * Country READY or deployment authority
