import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readinessSql = readFileSync(
  resolve(process.cwd(), "scripts/october-launch-observability-readiness.sql"),
  "utf8",
).toLowerCase();

const boundaryMigrationSql = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260910005000_harden_incident_event_client_boundary.sql",
  ),
  "utf8",
).toLowerCase();

describe("October observability evidence contract", () => {
  it("stays read-only and fail-closed", () => {
    expect(readinessSql).toContain("begin read only;");
    expect(readinessSql).toContain("rollback;");
    expect(readinessSql).toContain("2 as contract_version");
    expect(readinessSql).toContain("false as trusted_server_ingestion_path_verified");
    expect(readinessSql).toContain("false as human_on_call_and_incident_response_verified");
    expect(readinessSql).toContain("false as launch_authorized_by_this_evidence");
  });

  it("preserves diagnostic inserts but blocks client-forged release provenance", () => {
    expect(boundaryMigrationSql).toContain(
      'create policy "authenticated users can insert diagnostic incident events"',
    );
    expect(boundaryMigrationSql).toContain("commit_sha is null");
    expect(boundaryMigrationSql).toContain("deployment_id is null");
    expect(boundaryMigrationSql).toContain("resolved = false");
    expect(boundaryMigrationSql).toContain("resolved_at is null");
  });

  it("minimizes the incident-event client ACL", () => {
    expect(boundaryMigrationSql).toContain(
      "revoke all privileges on table public.incident_events from anon, authenticated",
    );
    expect(boundaryMigrationSql).toContain(
      "grant insert on table public.incident_events to authenticated",
    );
    expect(readinessSql).toContain("anon_table_privilege_count = 0");
    expect(readinessSql).toContain("authenticated_table_privilege_count = 1");
    expect(readinessSql).toContain("authenticated_non_insert_grant_count = 0");
  });

  it("requires hosted migration provenance and server/human smoke evidence", () => {
    expect(readinessSql).toContain("harden_incident_event_client_boundary");
    expect(readinessSql).toContain(
      "incident_client_boundary_migration_present",
    );
    expect(readinessSql).toContain(
      "trusted_release_provenance_client_forgery_blocked",
    );
    expect(readinessSql).toContain("release_provenance_smoke_evidence_present");
    expect(readinessSql).toContain("resolution_workflow_smoke_evidence_present");
    expect(readinessSql).toContain("database_observability_evidence_ready");
  });
});
