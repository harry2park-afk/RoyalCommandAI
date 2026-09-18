-- Royal Command October first-wave recording-policy reviewer provenance preflight.
-- READ ONLY: this script must not mutate schema, data, Auth, recording state, or launch state.
-- First wave: Australia, United States, Canada, South Korea, Japan, United Kingdom.
--
-- An `approved` label alone is not sufficient launch evidence. A nationwide policy
-- is counted as reviewed only when it is approved, non-blocked, has a reviewer,
-- has a review timestamp, and records a non-empty legal basis. Missing evidence
-- fails closed. This preflight emits booleans only for reviewer provenance; it
-- never emits reviewer/user identifiers.

begin transaction read only;

with first_wave(country_code) as (
  values ('AU'), ('US'), ('CA'), ('KR'), ('JP'), ('GB')
), nationwide_policy as (
  select
    fw.country_code,
    p.review_status,
    p.recording_policy,
    p.consent_required,
    p.notice_required,
    (p.reviewed_by is not null) as reviewed_by_present,
    (p.reviewed_at is not null) as reviewed_at_present,
    (nullif(btrim(coalesce(p.legal_basis, '')), '') is not null) as legal_basis_present
  from first_wave fw
  left join public.communication_recording_policies p
    on upper(p.country_code) = fw.country_code
   and p.region_code is null
)
select
  country_code,
  coalesce(review_status, 'missing') as review_status,
  coalesce(recording_policy, 'missing') as recording_policy,
  coalesce(consent_required, false) as consent_required,
  coalesce(notice_required, false) as notice_required,
  coalesce(reviewed_by_present, false) as reviewed_by_present,
  coalesce(reviewed_at_present, false) as reviewed_at_present,
  coalesce(legal_basis_present, false) as legal_basis_present,
  case
    when review_status = 'approved'
      and recording_policy <> 'blocked'
      and reviewed_by_present
      and reviewed_at_present
      and legal_basis_present
      then 'PASS'
    else 'BLOCKED'
  end as reviewer_proven_recording_gate
from nationwide_policy
order by country_code;

rollback;
