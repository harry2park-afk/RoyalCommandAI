-- October rollout: launch-critical Hosted migration coverage.
--
-- SAFETY: READ ONLY. This script never applies, repairs, renames, inserts, updates,
-- deletes, or otherwise mutates Hosted migration history or application data.
-- Presence in Hosted history is inventory evidence only. It does not prove the
-- exact linked apply set and cannot authorize Production deployment or Country READY.
--
-- This compact coverage gate intentionally spans the current launch-critical areas
-- so a newly introduced security/operational migration cannot be omitted from the
-- central rollout inventory when a narrower readiness contract is added later.

begin read only;
set local statement_timeout = '15s';

with required(area, name) as (
  values
    ('auth_data_isolation', 'scope_matter_staff_access'),
    ('auth_data_isolation', 'harden_profile_role_authority'),
    ('compliance', 'country_compliance_evidence_registry'),
    ('compliance', 'harden_commercial_review_provenance'),
    ('payments', 'payment_operational_safeguards'),
    ('room_factory', 'room_factory_atomic_non_encounter'),
    ('room_factory', 'room_factory_manifest_atomic_only'),
    ('observability', 'harden_incident_event_client_boundary')
),
observed as (
  select
    r.area,
    r.name,
    sm.version as hosted_version,
    sm.version is not null as present_in_hosted_history
  from required r
  left join lateral (
    select m.version
    from supabase_migrations.schema_migrations m
    where m.name = r.name
    order by m.version desc
    limit 1
  ) sm on true
)
select json_build_object(
  'contract_version', 2,
  'scope', 'OCTOBER_LAUNCH_CRITICAL_MIGRATION_COVERAGE',
  'captured_at_utc', now(),
  'required_migration_count', count(*),
  'hosted_present_count', count(*) filter (where present_in_hosted_history),
  'all_required_present_in_hosted_history', bool_and(present_in_hosted_history),
  'required_status', json_agg(
    json_build_object(
      'area', area,
      'name', name,
      'present_in_hosted_history', present_in_hosted_history,
      'hosted_version', hosted_version
    )
    order by area, name
  ),
  'exact_linked_apply_set_proven', false,
  'launch_authorized_by_this_evidence', false,
  'note', 'Hosted-history presence is inventory only. Exact linked migration reconciliation and db push --linked --dry-run evidence remain mandatory before controlled staging or apply.'
) as critical_migration_coverage
from observed;

rollback;
