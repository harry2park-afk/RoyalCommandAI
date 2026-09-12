-- October rollout Hosted Supabase commercial/compliance evidence snapshot.
--
-- SAFETY: READ ONLY. This script performs no DDL/DML/Auth/Storage mutation,
-- does not create terms, prices, provider offers, recording approvals or review
-- provenance, and does not authorize Production deployment or Country READY.
--
-- Purpose:
-- 1. Make first-wave AU/US/CA/KR/JP/GB terms, local pricing, provider-offer and
--    recording-review evidence repeatable instead of relying on manual counts.
-- 2. Fail closed when commercial rows lack human-review provenance. A non-zero
--    terms/offer row is not legal/commercial approval by itself.
-- 3. Require reviewer-proven recording evidence to include a non-empty legal
--    basis, so an APPROVED label alone cannot satisfy the recording gate.
-- 4. Inventory SG/CN/HK/TW/IN early without treating inventory as launch proof.
-- 5. Keep human legal/privacy review outside database automation: this snapshot
--    can prove database evidence shape only and can never grant legal approval.

begin read only;
set local statement_timeout = '15s';

with
first_wave(country_code, currency) as (
  values
    ('AU', 'AUD'),
    ('US', 'USD'),
    ('CA', 'CAD'),
    ('KR', 'KRW'),
    ('JP', 'JPY'),
    ('GB', 'GBP')
),
next_wave(country_code, currency) as (
  values
    ('SG', 'SGD'),
    ('CN', 'CNY'),
    ('HK', 'HKD'),
    ('TW', 'TWD'),
    ('IN', 'INR')
),
schema_state as (
  select
    (
      select count(*) = 3
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'rc_service_country_terms'
        and column_name in ('review_status', 'reviewed_by', 'reviewed_at')
    ) as country_terms_review_provenance_columns_exist,
    (
      select count(*) = 3
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'rc_service_provider_offers'
        and column_name in ('review_status', 'reviewed_by', 'reviewed_at')
    ) as provider_offer_review_provenance_columns_exist,
    (
      select count(*) = 3
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'communication_recording_policies'
        and column_name in ('review_status', 'reviewed_by', 'reviewed_at')
    ) as recording_review_provenance_columns_exist,
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'communication_recording_policies'
        and column_name = 'legal_basis'
    ) as recording_legal_basis_column_exists
),
first_state as (
  select
    f.country_code,
    f.currency,
    (
      select count(*)
      from public.rc_service_country_terms t
      where upper(t.country_code) = f.country_code
    ) as terms_rows,
    (
      select count(*)
      from public.rc_service_country_terms t
      where upper(t.country_code) = f.country_code
        and upper(t.currency) = f.currency
        and upper(coalesce(to_jsonb(t)->>'availability_status', '')) = 'AVAILABLE'
        and coalesce(t.customer_price_minor, 0) > 0
    ) as positive_available_local_prices,
    (
      select count(*)
      from public.rc_service_country_terms t
      where upper(t.country_code) = f.country_code
        and upper(t.currency) = f.currency
        and upper(coalesce(to_jsonb(t)->>'availability_status', '')) = 'AVAILABLE'
        and coalesce(t.customer_price_minor, 0) > 0
        and upper(coalesce(to_jsonb(t)->>'review_status', '')) = 'APPROVED'
        and nullif(trim(coalesce(to_jsonb(t)->>'reviewed_by', '')), '') is not null
        and nullif(trim(coalesce(to_jsonb(t)->>'reviewed_at', '')), '') is not null
    ) as reviewer_proven_terms,
    (
      select count(*)
      from public.rc_service_provider_offers o
      where upper(o.country_code) = f.country_code
    ) as provider_offers,
    (
      select count(*)
      from public.rc_service_provider_offers o
      where upper(o.country_code) = f.country_code
        and upper(o.currency) = f.currency
        and o.active
        and upper(coalesce(o.review_status, '')) = 'APPROVED'
        and nullif(trim(coalesce(to_jsonb(o)->>'reviewed_by', '')), '') is not null
        and nullif(trim(coalesce(to_jsonb(o)->>'reviewed_at', '')), '') is not null
    ) as reviewer_proven_provider_offers,
    (
      select count(*)
      from public.communication_recording_policies rp
      where upper(rp.country_code) = f.country_code
    ) as recording_rows,
    (
      select count(*)
      from public.communication_recording_policies rp
      where upper(rp.country_code) = f.country_code
        and upper(coalesce(rp.review_status, '')) = 'APPROVED'
        and rp.reviewed_by is not null
        and rp.reviewed_at is not null
        and nullif(trim(coalesce(rp.legal_basis, '')), '') is not null
    ) as reviewer_proven_recording_rows
  from first_wave f
),
next_state as (
  select
    n.country_code,
    n.currency,
    (
      select count(*)
      from public.rc_service_country_terms t
      where upper(t.country_code) = n.country_code
    ) as terms_rows,
    (
      select count(*)
      from public.rc_service_provider_offers o
      where upper(o.country_code) = n.country_code
    ) as provider_offers,
    (
      select count(*)
      from public.communication_recording_policies rp
      where upper(rp.country_code) = n.country_code
    ) as recording_rows
  from next_wave n
),
provider_state as (
  select
    count(*) as providers_total,
    count(*) filter (where active) as providers_active
  from public.rc_service_providers
)
select json_build_object(
  'contract_version', 2,
  'captured_at_utc', now(),
  'scope', 'COMMERCIAL_COMPLIANCE_DATABASE_EVIDENCE_ONLY',
  'schema', to_jsonb(schema_state),
  'provider_state', to_jsonb(provider_state),
  'first_wave', (
    select json_agg(first_state order by country_code)
    from first_state
  ),
  'next_wave_inventory', (
    select json_agg(next_state order by country_code)
    from next_state
  ),
  'all_first_wave_terms_present',
    (select bool_and(terms_rows > 0) from first_state),
  'all_first_wave_positive_local_prices_present',
    (select bool_and(positive_available_local_prices > 0) from first_state),
  'all_first_wave_terms_review_proven',
    (select bool_and(reviewer_proven_terms > 0) from first_state),
  'all_first_wave_provider_offers_review_proven',
    (select bool_and(reviewer_proven_provider_offers > 0) from first_state),
  'all_first_wave_recording_review_proven',
    (select bool_and(reviewer_proven_recording_rows > 0) from first_state),
  'commercial_compliance_database_evidence_ready',
    (
      select
        country_terms_review_provenance_columns_exist
        and provider_offer_review_provenance_columns_exist
        and recording_review_provenance_columns_exist
        and recording_legal_basis_column_exists
      from schema_state
    )
    and (select providers_active > 0 from provider_state)
    and (
      select bool_and(
        positive_available_local_prices > 0
        and reviewer_proven_terms > 0
        and reviewer_proven_provider_offers > 0
        and reviewer_proven_recording_rows > 0
      )
      from first_state
    ),
  'human_legal_privacy_review_verified', false,
  'overall_launch_approval', false,
  'note',
    'Database evidence cannot substitute for human legal/privacy review, provider contracting, payment-runtime proof, authenticated QA, or protected Production promotion.'
) as october_launch_commercial_compliance_readiness
from schema_state
cross join provider_state;

rollback;
