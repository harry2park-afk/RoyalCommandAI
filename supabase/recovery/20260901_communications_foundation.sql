-- Recovery-only communication recording-policy foundation.
--
-- This file is NOT a hosted Production migration. It reconstructs a prerequisite
-- that exists in the current hosted RoyalCommand schema but whose original
-- creation migration is missing from this repository. The clean-replay CI copies
-- it only into a disposable local migration chain before historical migrations.
--
-- Shape below was verified read-only against hosted Production immediately after
-- clean replay exposed public.communication_recording_policies as the next absent
-- prerequisite at 20260830054500_harden_recording_policy_acl.sql.

create table if not exists public.communication_recording_policies (
  id uuid primary key default gen_random_uuid(),
  country_code text not null,
  region_code text,
  review_status text not null default 'needs_review'
    check (review_status in ('needs_review', 'approved', 'suspended')),
  recording_policy text not null default 'blocked'
    check (recording_policy in ('allowed', 'notice_required', 'consent_required', 'blocked')),
  notice_required boolean not null default false,
  consent_required boolean not null default false,
  legal_basis text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (country_code, region_code)
);

-- Production has RLS enabled and intentionally no client-facing policies. The
-- later checked-in hardening migration revokes PUBLIC/anon/authenticated table
-- privileges again, preserving the fail-closed server-only boundary.
alter table public.communication_recording_policies enable row level security;
