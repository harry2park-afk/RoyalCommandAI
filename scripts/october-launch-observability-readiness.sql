-- October rollout observability / incident-response database evidence.
--
-- SAFETY: READ ONLY. This script does not mutate Hosted schema/data/Auth/Storage,
-- create incidents, acknowledge alerts, resolve incidents, deploy Production, or
-- mark any country READY. It only inventories the database-side telemetry boundary.
-- Human on-call ownership, alert delivery, runbook rehearsal, escalation, recovery,
-- and post-incident evidence remain independent launch gates.
--
-- IMPORTANT TRUST BOUNDARY:
-- Browser/client-generated telemetry may be useful for diagnostics, but a client-
-- writable row cannot by itself prove trusted release provenance. In particular,
-- commit_sha / deployment_id / request_id values remain client-forgeable whenever an
-- end-user role can directly INSERT incident_events. Launch evidence therefore fails
-- closed until trusted release-provenance writes are server-controlled.

begin read only;
set local statement_timeout = '15s';

with
incident_relation as (
  select
    c.oid,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as force_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'incident_events'
    and c.relkind in ('r', 'p')
),
incident_columns as (
  select
    count(*) filter (where column_name = 'severity') > 0 as has_severity,
    count(*) filter (where column_name = 'source') > 0 as has_source,
    count(*) filter (where column_name = 'event_type') > 0 as has_event_type,
    count(*) filter (where column_name = 'request_id') > 0 as has_request_id,
    count(*) filter (where column_name = 'deployment_id') > 0 as has_deployment_id,
    count(*) filter (where column_name = 'commit_sha') > 0 as has_commit_sha,
    count(*) filter (where column_name = 'resolved') > 0 as has_resolved,
    count(*) filter (where column_name = 'resolved_at') > 0 as has_resolved_at
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'incident_events'
),
incident_policies as (
  select
    count(*) filter (
      where cmd = 'INSERT'
        and ('anon' = any(roles) or 'authenticated' = any(roles) or 'public' = any(roles))
    ) as client_insert_policy_count,
    count(*) filter (
      where cmd = 'INSERT'
        and ('anon' = any(roles) or 'authenticated' = any(roles) or 'public' = any(roles))
        and (with_check is null or lower(btrim(with_check)) in ('true', '(true)'))
    ) as unscoped_client_insert_policy_count,
    count(*) filter (
      where cmd = 'UPDATE'
        and ('anon' = any(roles) or 'authenticated' = any(roles) or 'public' = any(roles))
    ) as client_update_policy_count,
    count(*) filter (
      where cmd = 'DELETE'
        and ('anon' = any(roles) or 'authenticated' = any(roles) or 'public' = any(roles))
    ) as client_delete_policy_count,
    count(*) filter (
      where cmd = 'SELECT'
        and ('authenticated' = any(roles) or 'public' = any(roles) or 'anon' = any(roles))
    ) as client_select_policy_count,
    count(*) filter (
      where cmd = 'SELECT'
        and ('public' = any(roles) or 'anon' = any(roles))
    ) as anonymous_or_public_select_policy_count,
    count(*) filter (
      where cmd = 'SELECT'
        and ('authenticated' = any(roles) or 'public' = any(roles))
        and (qual is null or lower(btrim(qual)) in ('true', '(true)'))
    ) as unscoped_authenticated_select_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'incident_events'
),
incident_acl as (
  select
    count(*) filter (where grantee = 'anon') as anon_table_privilege_count,
    count(*) filter (where grantee = 'authenticated') as authenticated_table_privilege_count,
    count(*) filter (
      where grantee in ('anon', 'authenticated')
        and privilege_type = 'INSERT'
    ) as client_insert_grant_count,
    count(*) filter (
      where grantee in ('anon', 'authenticated')
        and privilege_type in ('UPDATE', 'DELETE', 'TRUNCATE', 'TRIGGER', 'REFERENCES')
    ) as unnecessary_client_write_or_ddl_grant_count
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'incident_events'
    and grantee in ('anon', 'authenticated')
),
incident_counts as (
  select
    count(*) as total_incidents,
    count(*) filter (where resolved) as resolved_incidents,
    count(*) filter (where not resolved) as unresolved_incidents,
    count(*) filter (where commit_sha is not null) as incidents_with_commit_sha,
    count(*) filter (where deployment_id is not null) as incidents_with_deployment_id,
    count(*) filter (
      where commit_sha is not null
        and deployment_id is not null
        and request_id is not null
    ) as incidents_with_release_provenance
  from public.incident_events
),
gates as (
  select
    (select count(*) = 1 from incident_relation) as incident_table_present,
    coalesce((select rls_enabled from incident_relation), false) as incident_rls_enabled,
    (
      select
        has_severity
        and has_source
        and has_event_type
        and has_request_id
        and has_deployment_id
        and has_commit_sha
        and has_resolved
        and has_resolved_at
      from incident_columns
    ) as incident_provenance_schema_ready,
    (
      coalesce((select client_insert_policy_count = 0 from incident_policies), false)
    ) as trusted_release_provenance_client_write_blocked,
    (
      coalesce((select unscoped_client_insert_policy_count = 0 from incident_policies), false)
    ) as unscoped_client_incident_insert_blocked,
    (
      coalesce((select client_update_policy_count = 0 from incident_policies), false)
      and coalesce((select client_delete_policy_count = 0 from incident_policies), false)
    ) as incident_resolution_client_write_blocked,
    (
      coalesce((select rls_enabled from incident_relation), false)
      and coalesce((select anonymous_or_public_select_policy_count = 0 from incident_policies), false)
      and coalesce((select unscoped_authenticated_select_policy_count = 0 from incident_policies), false)
    ) as incident_sensitive_reads_scoped,
    (
      coalesce((select unnecessary_client_write_or_ddl_grant_count = 0 from incident_acl), false)
    ) as incident_client_acl_minimized,
    (
      select incidents_with_release_provenance > 0
      from incident_counts
    ) as release_provenance_smoke_evidence_present,
    (
      select resolved_incidents > 0
      from incident_counts
    ) as resolution_workflow_smoke_evidence_present
)
select
  'october_launch_observability_readiness' as evidence_type,
  now() as captured_at,
  g.incident_table_present,
  g.incident_rls_enabled,
  g.incident_provenance_schema_ready,
  g.trusted_release_provenance_client_write_blocked,
  g.unscoped_client_incident_insert_blocked,
  g.incident_resolution_client_write_blocked,
  g.incident_sensitive_reads_scoped,
  g.incident_client_acl_minimized,
  g.release_provenance_smoke_evidence_present,
  g.resolution_workflow_smoke_evidence_present,
  c.total_incidents,
  c.resolved_incidents,
  c.unresolved_incidents,
  c.incidents_with_commit_sha,
  c.incidents_with_deployment_id,
  c.incidents_with_release_provenance,
  p.client_insert_policy_count,
  p.unscoped_client_insert_policy_count,
  p.client_update_policy_count,
  p.client_delete_policy_count,
  p.client_select_policy_count,
  p.anonymous_or_public_select_policy_count,
  p.unscoped_authenticated_select_policy_count,
  a.anon_table_privilege_count,
  a.authenticated_table_privilege_count,
  a.client_insert_grant_count,
  a.unnecessary_client_write_or_ddl_grant_count,
  (
    g.incident_table_present
    and g.incident_rls_enabled
    and g.incident_provenance_schema_ready
    and g.trusted_release_provenance_client_write_blocked
    and g.unscoped_client_incident_insert_blocked
    and g.incident_resolution_client_write_blocked
    and g.incident_sensitive_reads_scoped
    and g.incident_client_acl_minimized
    and g.release_provenance_smoke_evidence_present
    and g.resolution_workflow_smoke_evidence_present
  ) as database_observability_evidence_ready,
  false as trusted_server_ingestion_path_verified,
  false as human_on_call_and_incident_response_verified,
  false as launch_authorized_by_this_evidence
from gates g
cross join incident_counts c
cross join incident_policies p
cross join incident_acl a;

rollback;
