import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const snapshot = JSON.parse(
  readFileSync(
    new URL("./first-wave-legal-assignment-authority-readback-20260923-1547.json", import.meta.url),
    "utf8",
  ),
) as {
  hosted_mutation_performed_by_this_capture: boolean;
  production_master_mutated_by_this_capture: boolean;
  hosted_legal_assignment_authority: {
    authenticated_can_update_matters_client_id: boolean;
    authenticated_can_update_matters_assigned_staff_id: boolean;
    trusted_assignment_rpc_count: number;
    matter_assignment_named_function_count: number;
    matters_policy_count: number;
    staff_referencing_matters_policy_count: number;
    scope_matter_staff_access_hosted_migration_rows: number;
  };
  candidate_source: {
    path: string;
    status: string;
    removes_direct_tenant_assignment_column_update: boolean;
    adds_admin_checked_assignment_rpc: boolean;
  };
  first_wave: {
    countries: string[];
    legal_matter_assignment_authority_verified: boolean;
    disposition: string;
  };
  interpretation: {
    launch_gate_blocker: string;
    country_ready_claimed: boolean;
  };
};

function source(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

describe("first-wave Legal Matter assignment authority Hosted readback", () => {
  it("records a read-only capture and keeps all first-wave countries fail-closed", () => {
    expect(snapshot.hosted_mutation_performed_by_this_capture).toBe(false);
    expect(snapshot.production_master_mutated_by_this_capture).toBe(false);
    expect(snapshot.first_wave.countries).toEqual(["AU", "US", "CA", "KR", "JP", "GB"]);
    expect(snapshot.first_wave.legal_matter_assignment_authority_verified).toBe(false);
    expect(snapshot.first_wave.disposition).toBe("HOLD");
    expect(snapshot.interpretation.country_ready_claimed).toBe(false);
    expect(snapshot.interpretation.launch_gate_blocker).toBe(
      "LEGAL_MATTER_ASSIGNMENT_AUTHORITY_NOT_VERIFIED",
    );
  });

  it("does not treat broad Hosted matters UPDATE authority as acceptable assignment control", () => {
    const hosted = snapshot.hosted_legal_assignment_authority;
    expect(hosted.authenticated_can_update_matters_client_id).toBe(true);
    expect(hosted.authenticated_can_update_matters_assigned_staff_id).toBe(true);
    expect(hosted.trusted_assignment_rpc_count).toBe(0);
    expect(hosted.matter_assignment_named_function_count).toBe(0);
    expect(hosted.matters_policy_count).toBe(3);
    expect(hosted.staff_referencing_matters_policy_count).toBe(3);
    expect(hosted.scope_matter_staff_access_hosted_migration_rows).toBe(0);
  });

  it("ties the fail-closed gate to the reviewed source-only remediation candidate", () => {
    const migration = source(snapshot.candidate_source.path);
    const gate = source("src/config/countryOperationalLaunchGate.ts");

    expect(snapshot.candidate_source.status).toBe("SOURCE_ONLY_NOT_HOSTED_VERIFIED");
    expect(snapshot.candidate_source.removes_direct_tenant_assignment_column_update).toBe(true);
    expect(snapshot.candidate_source.adds_admin_checked_assignment_rpc).toBe(true);
    expect(migration).toContain("revoke update on table public.matters from anon, authenticated;");
    expect(migration).toContain("create or replace function public.set_matter_staff_assignment(");
    expect(gate).toContain("legalMatterAssignmentAuthority?: OperationalEvidenceStatus;");
    expect(gate).toContain("LEGAL_MATTER_ASSIGNMENT_AUTHORITY_NOT_VERIFIED");
  });
});
