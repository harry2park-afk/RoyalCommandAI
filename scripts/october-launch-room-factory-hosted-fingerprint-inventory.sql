-- October country rollout: Room Factory Hosted migration fingerprint inventory.
--
-- SAFETY: READ ONLY. This script does not apply, repair, rename, insert, update,
-- delete, or otherwise mutate Hosted migration history or application data.
-- It records deterministic Hosted structural fingerprints for the Room Factory
-- migration names already present in Hosted history. A fingerprint is evidence
-- for reconciliation only; it does not prove repository/Hosted parity unless a
-- separately derived repository fingerprint is compared and it does not replace
-- `supabase migration list --linked` plus `supabase db push --linked --dry-run`.

begin read only;
set local statement_timeout = '15s';

with expected(name, repository_source_version) as (
  values
    ('room_factory_manifests', '20260829211500'),
    ('room_factory_prepare_work_plan', '20260829220000'),
    ('revoke_anon_room_factory_prepare', '20260829220500'),
    ('room_factory_active_locks', '20260829223000'),
    ('room_factory_evidence_review', '20260829231500'),
    ('room_factory_start_execution', '20260829234500'),
    ('harden_prepare_room_factory_rpc_wrapper', '20260830075000'),
    ('revoke_anon_prepare_room_factory_wrapper', '20260830080500'),
    ('harden_acquire_room_factory_rpc_wrapper', '20260830084700'),
    ('harden_release_room_factory_rpc_wrapper', '20260830095500'),
    ('harden_fail_room_factory_rpc_wrapper', '20260830105200'),
    ('harden_submit_room_factory_evidence_rpc_wrapper', '20260830115000'),
    ('harden_review_room_factory_rpc_wrapper', '20260830125000'),
    ('harden_start_room_factory_lane_rpc_wrapper', '20260830135500'),
    ('atomic_room_factory_encounter_creation', '20260831084700'),
    ('harden_room_factory_atomic_invoker', '20260901022500')
),
hosted as (
  select sm.name,
         sm.version,
         encode(
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
         ) as hosted_canonical_sha256
    from supabase_migrations.schema_migrations sm
   where sm.name in (select name from expected)
),
comparison as (
  select e.name,
         e.repository_source_version,
         h.version as hosted_version,
         h.version is not null as hosted_present,
         h.version = e.repository_source_version as exact_version_match,
         h.hosted_canonical_sha256
    from expected e
    left join hosted h using (name)
)
select name,
       repository_source_version,
       hosted_version,
       hosted_present,
       exact_version_match,
       hosted_canonical_sha256
  from comparison
 order by name;

with expected(name, repository_source_version) as (
  values
    ('room_factory_manifests', '20260829211500'),
    ('room_factory_prepare_work_plan', '20260829220000'),
    ('revoke_anon_room_factory_prepare', '20260829220500'),
    ('room_factory_active_locks', '20260829223000'),
    ('room_factory_evidence_review', '20260829231500'),
    ('room_factory_start_execution', '20260829234500'),
    ('harden_prepare_room_factory_rpc_wrapper', '20260830075000'),
    ('revoke_anon_prepare_room_factory_wrapper', '20260830080500'),
    ('harden_acquire_room_factory_rpc_wrapper', '20260830084700'),
    ('harden_release_room_factory_rpc_wrapper', '20260830095500'),
    ('harden_fail_room_factory_rpc_wrapper', '20260830105200'),
    ('harden_submit_room_factory_evidence_rpc_wrapper', '20260830115000'),
    ('harden_review_room_factory_rpc_wrapper', '20260830125000'),
    ('harden_start_room_factory_lane_rpc_wrapper', '20260830135500'),
    ('atomic_room_factory_encounter_creation', '20260831084700'),
    ('harden_room_factory_atomic_invoker', '20260901022500')
),
hosted as (
  select sm.name,
         sm.version,
         encode(
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
         ) as hosted_canonical_sha256
    from supabase_migrations.schema_migrations sm
   where sm.name in (select name from expected)
),
comparison as (
  select e.name,
         e.repository_source_version,
         h.version as hosted_version,
         h.version is not null as hosted_present,
         h.version = e.repository_source_version as exact_version_match,
         h.hosted_canonical_sha256
    from expected e
    left join hosted h using (name)
)
select json_build_object(
  'contract_version', 1,
  'scope', 'OCTOBER_LAUNCH_ROOM_FACTORY_HOSTED_FINGERPRINT_INVENTORY',
  'mapped_room_factory_migrations', (select count(*) from comparison),
  'hosted_present', (select count(*) from comparison where hosted_present),
  'exact_version_matches', (select count(*) from comparison where exact_version_match),
  'version_mismatches', (select count(*) from comparison where hosted_present and not exact_version_match),
  'hosted_fingerprints_observed', (select count(*) from comparison where hosted_canonical_sha256 is not null),
  'repository_fingerprint_parity_proven_for_all', false,
  'exact_linked_apply_set_proven', false,
  'launch_gate', 'BLOCKED',
  'note', 'Hosted fingerprints are deterministic reconciliation evidence only. Repository parity for all mapped migrations and the exact linked apply set remain unproven until separate repository fingerprint comparison and linked migration-list/db-push dry-run evidence are reviewed.'
) as room_factory_hosted_fingerprint_inventory;

rollback;
