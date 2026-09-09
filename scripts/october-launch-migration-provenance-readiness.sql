-- October country rollout: Hosted migration provenance readiness.
--
-- SAFETY: READ ONLY. This script does not apply, repair, rename, insert, update,
-- delete, or otherwise mutate Hosted migration history or application data.
-- It records the repository source-version mapping observed on the launch branch
-- and fails closed when Hosted history uses a different version for the same
-- migration name. A mismatch is evidence to reconcile first; it is never
-- authorization to run `migration repair` or apply migrations to Production.

begin read only;
set local statement_timeout = '15s';

with expected(name, repository_source_version, area) as (
  values
    ('add_incident_events_monitoring', '20260815110624', 'observability'),
    ('restrict_incident_event_reads', '20260815110907', 'observability'),
    ('room_factory_manifests', '20260829211500', 'room_factory'),
    ('room_factory_prepare_work_plan', '20260829220000', 'room_factory'),
    ('revoke_anon_room_factory_prepare', '20260829220500', 'room_factory'),
    ('room_factory_active_locks', '20260829223000', 'room_factory'),
    ('room_factory_evidence_review', '20260829231500', 'room_factory'),
    ('room_factory_start_execution', '20260829234500', 'room_factory'),
    ('harden_prepare_room_factory_rpc_wrapper', '20260830075000', 'room_factory'),
    ('revoke_anon_prepare_room_factory_wrapper', '20260830080500', 'room_factory'),
    ('harden_acquire_room_factory_rpc_wrapper', '20260830084700', 'room_factory'),
    ('harden_release_room_factory_rpc_wrapper', '20260830095500', 'room_factory'),
    ('harden_fail_room_factory_rpc_wrapper', '20260830105200', 'room_factory'),
    ('harden_submit_room_factory_evidence_rpc_wrapper', '20260830115000', 'room_factory'),
    ('harden_review_room_factory_rpc_wrapper', '20260830125000', 'room_factory'),
    ('harden_start_room_factory_lane_rpc_wrapper', '20260830135500', 'room_factory'),
    ('atomic_room_factory_encounter_creation', '20260831084700', 'room_factory'),
    ('harden_room_factory_atomic_invoker', '20260901022500', 'room_factory')
),
hosted as (
  select name, version
    from supabase_migrations.schema_migrations
   where name in (select name from expected)
),
comparison as (
  select e.area,
         e.name,
         e.repository_source_version,
         h.version as hosted_version,
         h.version is not null as hosted_present,
         h.version = e.repository_source_version as exact_version_match
    from expected e
    left join hosted h using (name)
)
select area,
       name,
       repository_source_version,
       hosted_version,
       hosted_present,
       exact_version_match
  from comparison
 order by area, name;

with expected(name, repository_source_version, area) as (
  values
    ('add_incident_events_monitoring', '20260815110624', 'observability'),
    ('restrict_incident_event_reads', '20260815110907', 'observability'),
    ('room_factory_manifests', '20260829211500', 'room_factory'),
    ('room_factory_prepare_work_plan', '20260829220000', 'room_factory'),
    ('revoke_anon_room_factory_prepare', '20260829220500', 'room_factory'),
    ('room_factory_active_locks', '20260829223000', 'room_factory'),
    ('room_factory_evidence_review', '20260829231500', 'room_factory'),
    ('room_factory_start_execution', '20260829234500', 'room_factory'),
    ('harden_prepare_room_factory_rpc_wrapper', '20260830075000', 'room_factory'),
    ('revoke_anon_prepare_room_factory_wrapper', '20260830080500', 'room_factory'),
    ('harden_acquire_room_factory_rpc_wrapper', '20260830084700', 'room_factory'),
    ('harden_release_room_factory_rpc_wrapper', '20260830095500', 'room_factory'),
    ('harden_fail_room_factory_rpc_wrapper', '20260830105200', 'room_factory'),
    ('harden_submit_room_factory_evidence_rpc_wrapper', '20260830115000', 'room_factory'),
    ('harden_review_room_factory_rpc_wrapper', '20260830125000', 'room_factory'),
    ('harden_start_room_factory_lane_rpc_wrapper', '20260830135500', 'room_factory'),
    ('atomic_room_factory_encounter_creation', '20260831084700', 'room_factory'),
    ('harden_room_factory_atomic_invoker', '20260901022500', 'room_factory')
),
comparison as (
  select e.area,
         e.name,
         e.repository_source_version,
         sm.version as hosted_version,
         sm.version is not null as hosted_present,
         sm.version = e.repository_source_version as exact_version_match
    from expected e
    left join supabase_migrations.schema_migrations sm on sm.name = e.name
),
required_unapplied(name, area) as (
  values
    ('scope_matter_staff_access', 'auth_data_isolation'),
    ('harden_profile_role_authority', 'auth_data_isolation'),
    ('payment_operational_safeguards', 'payments')
),
unapplied_status as (
  select r.area,
         r.name,
         exists (
           select 1
             from supabase_migrations.schema_migrations sm
            where sm.name = r.name
         ) as present_in_hosted_history
    from required_unapplied r
)
select json_build_object(
  'contract_version', 1,
  'scope', 'OCTOBER_LAUNCH_MIGRATION_PROVENANCE',
  'mapped_migrations', (select count(*) from comparison),
  'mapped_hosted_present', (select count(*) from comparison where hosted_present),
  'exact_version_matches', (select count(*) from comparison where exact_version_match),
  'version_mismatches', (select count(*) from comparison where hosted_present and not exact_version_match),
  'missing_mapped_hosted_rows', (select count(*) from comparison where not hosted_present),
  'observability_exact_alignment', coalesce((
    select bool_and(hosted_present and exact_version_match)
      from comparison
     where area = 'observability'
  ), false),
  'room_factory_exact_alignment', coalesce((
    select bool_and(hosted_present and exact_version_match)
      from comparison
     where area = 'room_factory'
  ), false),
  'required_unapplied_status', coalesce((
    select json_agg(json_build_object(
      'area', area,
      'name', name,
      'present_in_hosted_history', present_in_hosted_history
    ) order by area, name)
      from unapplied_status
  ), '[]'::json),
  'exact_linked_apply_set_proven', false,
  'launch_gate', 'BLOCKED',
  'note', 'Version drift or missing linked dry-run evidence must be reconciled before any Hosted migration apply/repair. This report cannot authorize a migration or Country READY transition.'
) as migration_provenance_readiness;

rollback;
