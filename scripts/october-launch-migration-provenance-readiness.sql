-- October country rollout: Hosted migration provenance readiness.
--
-- SAFETY: READ ONLY. This script does not apply, repair, rename, insert, update,
-- delete, or otherwise mutate Hosted migration history or application data.
-- It records the repository source-version mapping observed on the launch branch
-- and fails closed when Hosted history uses a different version for the same
-- migration name. A mismatch is evidence to reconcile first; it is never
-- authorization to run `migration repair` or apply migrations to Production.
--
-- For three individually verified Room Factory migrations, this report also
-- compares a repository-derived SHA-256 structural fingerprint with the Hosted
-- migration statement text. The fingerprint intentionally ignores full-line SQL
-- comments and whitespace so timestamp-only/source-comment drift can be
-- distinguished from a structural SQL mismatch. This is additional provenance
-- evidence only: it does not replace `supabase migration list --linked` plus
-- `supabase db push --linked --dry-run`, and it is not byte-for-byte proof.

begin read only;
set local statement_timeout = '15s';

with expected(name, repository_source_version, area, repository_canonical_sha256) as (
  values
    ('add_incident_events_monitoring', '20260815110624', 'observability', null::text),
    ('restrict_incident_event_reads', '20260815110907', 'observability', null::text),
    (
      'room_factory_manifests',
      '20260829211500',
      'room_factory',
      'da7df1d7b16c018b6ca77fe05461776e03a244a2d95ab7866f9326d24a60e719'
    ),
    ('room_factory_prepare_work_plan', '20260829220000', 'room_factory', null::text),
    ('revoke_anon_room_factory_prepare', '20260829220500', 'room_factory', null::text),
    ('room_factory_active_locks', '20260829223000', 'room_factory', null::text),
    ('room_factory_evidence_review', '20260829231500', 'room_factory', null::text),
    ('room_factory_start_execution', '20260829234500', 'room_factory', null::text),
    ('harden_prepare_room_factory_rpc_wrapper', '20260830075000', 'room_factory', null::text),
    ('revoke_anon_prepare_room_factory_wrapper', '20260830080500', 'room_factory', null::text),
    ('harden_acquire_room_factory_rpc_wrapper', '20260830084700', 'room_factory', null::text),
    ('harden_release_room_factory_rpc_wrapper', '20260830095500', 'room_factory', null::text),
    ('harden_fail_room_factory_rpc_wrapper', '20260830105200', 'room_factory', null::text),
    ('harden_submit_room_factory_evidence_rpc_wrapper', '20260830115000', 'room_factory', null::text),
    ('harden_review_room_factory_rpc_wrapper', '20260830125000', 'room_factory', null::text),
    ('harden_start_room_factory_lane_rpc_wrapper', '20260830135500', 'room_factory', null::text),
    (
      'atomic_room_factory_encounter_creation',
      '20260831084700',
      'room_factory',
      '9b757aa05b2283a5b3f8f89a31b668ee34b90ee315110a3037f9d82c674b354d'
    ),
    (
      'harden_room_factory_atomic_invoker',
      '20260901022500',
      'room_factory',
      'f0079bcaa1572bb71a88987812931e6299171fe6666436245f19ed1115696969'
    )
),
hosted as (
  select sm.name,
         sm.version,
         case
           when sm.name in (
             'room_factory_manifests',
             'atomic_room_factory_encounter_creation',
             'harden_room_factory_atomic_invoker'
           ) then encode(
             extensions.digest(
               convert_to(
                 regexp_replace(
                   regexp_replace(
                     array_to_string(sm.statements, ''),
                     E'(^|\\n)[\\t ]*--[^\\n]*(\\n|$)',
                     E'\\1',
                     'gn'
                   ),
                   '[[:space:]]+',
                   '',
                   'g'
                 ),
                 'UTF8'
               ),
               'sha256'
             ),
             'hex'
           )
           else null
         end as hosted_canonical_sha256
    from supabase_migrations.schema_migrations sm
   where sm.name in (select name from expected)
),
comparison as (
  select e.area,
         e.name,
         e.repository_source_version,
         h.version as hosted_version,
         h.version is not null as hosted_present,
         h.version = e.repository_source_version as exact_version_match,
         e.repository_canonical_sha256,
         h.hosted_canonical_sha256,
         case
           when e.repository_canonical_sha256 is null then null
           else h.hosted_canonical_sha256 = e.repository_canonical_sha256
         end as canonical_source_match
    from expected e
    left join hosted h using (name)
)
select area,
       name,
       repository_source_version,
       hosted_version,
       hosted_present,
       exact_version_match,
       repository_canonical_sha256,
       hosted_canonical_sha256,
       canonical_source_match
  from comparison
 order by area, name;

with expected(name, repository_source_version, area, repository_canonical_sha256) as (
  values
    ('add_incident_events_monitoring', '20260815110624', 'observability', null::text),
    ('restrict_incident_event_reads', '20260815110907', 'observability', null::text),
    (
      'room_factory_manifests',
      '20260829211500',
      'room_factory',
      'da7df1d7b16c018b6ca77fe05461776e03a244a2d95ab7866f9326d24a60e719'
    ),
    ('room_factory_prepare_work_plan', '20260829220000', 'room_factory', null::text),
    ('revoke_anon_room_factory_prepare', '20260829220500', 'room_factory', null::text),
    ('room_factory_active_locks', '20260829223000', 'room_factory', null::text),
    ('room_factory_evidence_review', '20260829231500', 'room_factory', null::text),
    ('room_factory_start_execution', '20260829234500', 'room_factory', null::text),
    ('harden_prepare_room_factory_rpc_wrapper', '20260830075000', 'room_factory', null::text),
    ('revoke_anon_prepare_room_factory_wrapper', '20260830080500', 'room_factory', null::text),
    ('harden_acquire_room_factory_rpc_wrapper', '20260830084700', 'room_factory', null::text),
    ('harden_release_room_factory_rpc_wrapper', '20260830095500', 'room_factory', null::text),
    ('harden_fail_room_factory_rpc_wrapper', '20260830105200', 'room_factory', null::text),
    ('harden_submit_room_factory_evidence_rpc_wrapper', '20260830115000', 'room_factory', null::text),
    ('harden_review_room_factory_rpc_wrapper', '20260830125000', 'room_factory', null::text),
    ('harden_start_room_factory_lane_rpc_wrapper', '20260830135500', 'room_factory', null::text),
    (
      'atomic_room_factory_encounter_creation',
      '20260831084700',
      'room_factory',
      '9b757aa05b2283a5b3f8f89a31b668ee34b90ee315110a3037f9d82c674b354d'
    ),
    (
      'harden_room_factory_atomic_invoker',
      '20260901022500',
      'room_factory',
      'f0079bcaa1572bb71a88987812931e6299171fe6666436245f19ed1115696969'
    )
),
hosted as (
  select sm.name,
         sm.version,
         case
           when sm.name in (
             'room_factory_manifests',
             'atomic_room_factory_encounter_creation',
             'harden_room_factory_atomic_invoker'
           ) then encode(
             extensions.digest(
               convert_to(
                 regexp_replace(
                   regexp_replace(
                     array_to_string(sm.statements, ''),
                     E'(^|\\n)[\\t ]*--[^\\n]*(\\n|$)',
                     E'\\1',
                     'gn'
                   ),
                   '[[:space:]]+',
                   '',
                   'g'
                 ),
                 'UTF8'
               ),
               'sha256'
             ),
             'hex'
           )
           else null
         end as hosted_canonical_sha256
    from supabase_migrations.schema_migrations sm
   where sm.name in (select name from expected)
),
comparison as (
  select e.area,
         e.name,
         e.repository_source_version,
         h.version as hosted_version,
         h.version is not null as hosted_present,
         h.version = e.repository_source_version as exact_version_match,
         e.repository_canonical_sha256,
         h.hosted_canonical_sha256,
         case
           when e.repository_canonical_sha256 is null then null
           else h.hosted_canonical_sha256 = e.repository_canonical_sha256
         end as canonical_source_match
    from expected e
    left join hosted h using (name)
),
required_unapplied(name, area) as (
  values
    ('scope_matter_staff_access', 'auth_data_isolation'),
    ('harden_profile_role_authority', 'auth_data_isolation'),
    ('country_compliance_evidence_registry', 'compliance'),
    ('payment_operational_safeguards', 'payments'),
    ('room_factory_atomic_non_encounter', 'room_factory'),
    ('room_factory_manifest_atomic_only', 'room_factory')
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
  'contract_version', 2,
  'scope', 'OCTOBER_LAUNCH_MIGRATION_PROVENANCE',
  'mapped_migrations', (select count(*) from comparison),
  'mapped_hosted_present', (select count(*) from comparison where hosted_present),
  'exact_version_matches', (select count(*) from comparison where exact_version_match),
  'version_mismatches', (select count(*) from comparison where hosted_present and not exact_version_match),
  'missing_mapped_hosted_rows', (select count(*) from comparison where not hosted_present),
  'canonical_fingerprints_required', (
    select count(*) from comparison where repository_canonical_sha256 is not null
  ),
  'canonical_fingerprint_matches', (
    select count(*) from comparison where canonical_source_match
  ),
  'atomic_room_factory_source_structure_aligned', coalesce((
    select bool_and(canonical_source_match)
      from comparison
     where name in (
       'atomic_room_factory_encounter_creation',
       'harden_room_factory_atomic_invoker'
     )
  ), false),
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
  'note', 'Canonical source fingerprints reduce uncertainty for three individually verified Room Factory migrations, while all launch-critical unapplied migrations are tracked explicitly. Timestamp drift and missing linked dry-run evidence still require reconciliation before any Hosted migration apply/repair. This report cannot authorize a migration or Country READY transition.'
) as migration_provenance_readiness;

rollback;
