import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const coverageSql = readFileSync(
  resolve(process.cwd(), "scripts/october-launch-critical-migration-coverage.sql"),
  "utf8",
).toLowerCase();

const hostedReadinessSql = readFileSync(
  resolve(process.cwd(), "scripts/october-launch-hosted-readiness.sql"),
  "utf8",
).toLowerCase();

const machineSnapshotSql = readFileSync(
  resolve(process.cwd(), "scripts/october-launch-hosted-machine-snapshot.sql"),
  "utf8",
).toLowerCase();

const REQUIRED_MIGRATIONS = [
  "scope_matter_staff_access",
  "harden_profile_role_authority",
  "country_compliance_evidence_registry",
  "harden_commercial_review_provenance",
  "payment_operational_safeguards",
  "room_factory_atomic_non_encounter",
  "room_factory_manifest_atomic_only",
  "harden_incident_event_client_boundary",
] as const;

describe("October launch critical migration coverage contract", () => {
  it("stays read-only and fail-closed", () => {
    expect(coverageSql).toContain("begin read only;");
    expect(coverageSql).toContain("rollback;");
    expect(coverageSql).toContain("'exact_linked_apply_set_proven', false");
    expect(coverageSql).toContain("'launch_authorized_by_this_evidence', false");
  });

  it("tracks every current launch-critical migration area", () => {
    for (const migration of REQUIRED_MIGRATIONS) {
      expect(coverageSql, migration).toContain(migration);
    }

    for (const area of [
      "auth_data_isolation",
      "compliance",
      "payments",
      "room_factory",
      "observability",
    ]) {
      expect(coverageSql, area).toContain(area);
    }
  });

  it("keeps every broader Hosted readiness inventory aligned", () => {
    for (const sql of [hostedReadinessSql, machineSnapshotSql]) {
      expect(sql).toContain("begin read only;");
      expect(sql).toContain("rollback;");

      for (const migration of REQUIRED_MIGRATIONS) {
        expect(sql, migration).toContain(migration);
      }
    }
  });

  it("does not treat Hosted-history presence as exact linked evidence", () => {
    expect(coverageSql).toContain("all_required_present_in_hosted_history");
    expect(coverageSql).toContain("db push --linked --dry-run");
  });
});
