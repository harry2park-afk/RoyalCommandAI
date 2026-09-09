-- October rollout: fail-closed human review provenance for commercial terms and provider offers.
--
-- This migration intentionally seeds no country terms, provider offers, pricing,
-- provider activation, reviewer identity, or approval. It only creates the schema
-- boundary required to distinguish a row that exists from a row that has been
-- explicitly reviewed by a human before launch.
--
-- Hosted application/staging remains subject to exact linked migration-list and
-- db-push --linked --dry-run evidence. Do not repair/push migration history from
-- this file by inference.

do $$
begin
  if to_regclass('public.rc_service_country_terms') is null then
    raise exception 'rc_service_country_terms prerequisite is missing';
  end if;

  if to_regclass('public.rc_service_provider_offers') is null then
    raise exception 'rc_service_provider_offers prerequisite is missing';
  end if;
end
$$;

alter table public.rc_service_country_terms
  add column if not exists review_status text not null default 'needs_review',
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamptz;

alter table public.rc_service_provider_offers
  add column if not exists review_status text not null default 'unverified',
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.rc_service_country_terms'::regclass
      and conname = 'rc_service_country_terms_review_status_check'
  ) then
    alter table public.rc_service_country_terms
      add constraint rc_service_country_terms_review_status_check
      check (review_status in ('needs_review', 'approved', 'rejected', 'suspended'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.rc_service_country_terms'::regclass
      and conname = 'rc_service_country_terms_approval_provenance_check'
  ) then
    alter table public.rc_service_country_terms
      add constraint rc_service_country_terms_approval_provenance_check
      check (
        review_status <> 'approved'
        or (reviewed_by is not null and reviewed_at is not null)
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.rc_service_provider_offers'::regclass
      and conname = 'rc_service_provider_offers_review_status_check'
  ) then
    alter table public.rc_service_provider_offers
      add constraint rc_service_provider_offers_review_status_check
      check (review_status in ('unverified', 'researching', 'approved', 'rejected', 'suspended'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.rc_service_provider_offers'::regclass
      and conname = 'rc_service_provider_offers_approval_provenance_check'
  ) then
    alter table public.rc_service_provider_offers
      add constraint rc_service_provider_offers_approval_provenance_check
      check (
        review_status <> 'approved'
        or (reviewed_by is not null and reviewed_at is not null)
      );
  end if;
end
$$;

comment on column public.rc_service_country_terms.review_status is
'Human commercial/legal review state. Presence of a terms row is not approval.';

comment on column public.rc_service_country_terms.reviewed_by is
'Human reviewer identifier recorded only by a trusted server/admin workflow.';

comment on column public.rc_service_country_terms.reviewed_at is
'UTC review timestamp. APPROVED requires reviewed_by and reviewed_at.';

comment on column public.rc_service_provider_offers.review_status is
'Human provider/commercial review state. Presence of an offer is not approval.';

comment on column public.rc_service_provider_offers.reviewed_by is
'Human reviewer identifier recorded only by a trusted server/admin workflow.';

comment on column public.rc_service_provider_offers.reviewed_at is
'UTC review timestamp. APPROVED requires reviewed_by and reviewed_at.';
