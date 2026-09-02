-- October country rollout: server-owned compliance evidence registry.
--
-- This migration intentionally seeds no country as verified. Absence of a current
-- VERIFIED row is a launch blocker. Recording policy and end-user consent remain
-- governed by their existing dedicated tables.

create table if not exists public.country_compliance_evidence (
  id uuid primary key default gen_random_uuid(),
  country_code text not null,
  subdivision_code text,
  evidence_kind text not null,
  review_status text not null default 'NEEDS_REVIEW',
  evidence_version text not null,
  evidence_ref text,
  evidence_sha256 text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  valid_from timestamptz,
  valid_until timestamptz,
  blocker_reason text,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint country_compliance_evidence_country_code_check
    check (country_code ~ '^[A-Z]{2}$'),
  constraint country_compliance_evidence_subdivision_code_check
    check (subdivision_code is null or subdivision_code ~ '^[A-Z0-9]{1,6}$'),
  constraint country_compliance_evidence_kind_check
    check (evidence_kind in ('legal', 'tax', 'privacy', 'data_residency')),
  constraint country_compliance_evidence_review_status_check
    check (review_status in ('NEEDS_REVIEW', 'VERIFIED', 'BLOCKED')),
  constraint country_compliance_evidence_version_check
    check (length(btrim(evidence_version)) > 0),
  constraint country_compliance_evidence_sha256_check
    check (evidence_sha256 is null or evidence_sha256 ~ '^[0-9A-Fa-f]{64}$'),
  constraint country_compliance_evidence_validity_check
    check (valid_until is null or valid_from is null or valid_until > valid_from),
  constraint country_compliance_evidence_verified_check
    check (
      review_status <> 'VERIFIED'
      or (
        evidence_ref is not null
        and length(btrim(evidence_ref)) > 0
        and evidence_sha256 is not null
        and reviewed_at is not null
        and reviewed_by is not null
      )
    ),
  constraint country_compliance_evidence_blocked_check
    check (
      review_status <> 'BLOCKED'
      or (blocker_reason is not null and length(btrim(blocker_reason)) > 0)
    )
);

create unique index if not exists country_compliance_evidence_current_unique
  on public.country_compliance_evidence (
    country_code,
    coalesce(subdivision_code, ''),
    evidence_kind
  )
  where superseded_at is null;

create unique index if not exists country_compliance_evidence_version_unique
  on public.country_compliance_evidence (
    country_code,
    coalesce(subdivision_code, ''),
    evidence_kind,
    evidence_version
  );

create index if not exists country_compliance_evidence_gate_lookup_idx
  on public.country_compliance_evidence (
    country_code,
    evidence_kind,
    review_status
  )
  where superseded_at is null;

alter table public.country_compliance_evidence enable row level security;

-- Evidence is controlled by trusted server-side operations only. No client RLS
-- policy is created deliberately; service_role remains the server-side path.
revoke all on table public.country_compliance_evidence from public;
revoke all on table public.country_compliance_evidence from anon;
revoke all on table public.country_compliance_evidence from authenticated;
grant all on table public.country_compliance_evidence to service_role;

comment on table public.country_compliance_evidence is
  'Versioned server-owned legal/tax/privacy/data-residency launch evidence. No row means not verified.';
comment on column public.country_compliance_evidence.evidence_ref is
  'Pointer to the reviewed source or approval record; do not store legal documents here.';
comment on column public.country_compliance_evidence.evidence_sha256 is
  'SHA-256 digest of the reviewed evidence artifact for immutable review traceability.';
