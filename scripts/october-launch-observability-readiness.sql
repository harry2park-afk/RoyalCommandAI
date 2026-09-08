-- October rollout observability / incident-response database evidence.
--
-- SAFETY: READ ONLY. This script does not mutate Hosted schema/data/Auth/Storage,
-- create incidents, acknowledge alerts, resolve incidents, deploy Production, or
-- mark any country READY. It only inventories the database-side telemetry boundary.
-- Human on-call ownership, alert delivery, runbook rehearsal, escalation, recovery,
-- and post-incident evidence remain independent launch gates.

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
        and ('authenticated' = any(roles) or 'public' = any(roles))
    ) as client_insert_policy_count,
    count(*) filter (
      where cmd = 'INSERT'
        and ('authenticated' = any(roles) or 'public' = any(roles))
        and (with_check is null or lower(btrim(with_check)) in ('true', '(true)'))
    ) as unscoped_client_insert_policy_count,
    count(*) filter (
      where cmd = 'UPDATE'
        and ('authenticated' = any(roles) or 'public' = any(roles))
    ) as client_update_policy_count,
    count(*) filter (
      where cmd = 'DELETE'
        and ('authenticated' = any(roles) or 'public' = any(roles))
    ) as client_delete_policy_count,
    count(*) filter (
      where cmd = 'SELECT'
        and ('authenticated' = any(roles) or 'public' = any(roles) or 'anon' = any(roles))
    ) as client_select_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'incident_events'
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
      not has_table_privilege('authenticated', 'public.incident_events', 'INSERT')
      or coalesce((select unscoped_client_insert_policy_count = 0 from incident_policies), false)
    ) as incident_client_forgery_blocked,
    (
      coalesce((select client_update_policy_count = 0 from incident_policies), false)
      and coalesce((select client_delete_policy_count = 0 from incident_policies), false)
    ) as incident_resolution_client_write_blocked,
    (
      coalesce((select rls_enabled from incident_relation), false)
      and coalesce((select client_select_policy_count = 0 from incident_policies), false)
    ) as incident_sensitive_reads_client_blocked,
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
  g.incident_client_forgery_blocked,
  g.incident_resolution_client_write_blocked,
  g.incident_sensitive_reads_client_blocked,
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
  (
    g.incident_table_present
    and g.incident_rls_enabled
    and g.incident_provenance_schema_ready
    and g.incident_client_forgery_blocked
    and g.incident_resolution_client_write_blocked
    and g.incident_sensitive_reads_client_blocked
    and g.release_provenance_smoke_evidence_present
    and g.resolution_workflow_smoke_evidence_present
  ) as database_observability_evidence_ready,
  false as human_on_call_and_incident_response_verified,
  false as launch_authorized_by_this_evidence
from gates g
cross join incident_counts c
cross join incident_policies p;

rollback;
