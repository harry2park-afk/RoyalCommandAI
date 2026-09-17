import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const evidenceSql = readFileSync(
  resolve(process.cwd(), "scripts/october-launch-auth-data-isolation-readiness.sql"),
  "utf8",
).toLowerCase();

describe("October auth/data-isolation evidence contract", () => {
  it("stays read-only and fail-closed", () => {
    expect(evidenceSql).toContain("begin read only;");
    expect(evidenceSql).toContain("rollback;");
    expect(evidenceSql).toContain("'contract_version', 2");
    expect(evidenceSql).toContain("'overall_launch_approval', false");
  });

  it("verifies profile-role enforcement semantics rather than function names only", () => {
    expect(evidenceSql).toContain("guard_trigger_role_scope_verified");
    expect(evidenceSql).toContain("guard_role_semantics_verified");
    expect(evidenceSql).toContain("signup_role_metadata_not_consumed");
    expect(evidenceSql).toContain("signup_fixed_nonprivileged_role");
    expect(evidenceSql).toContain("signup_upsert_preserves_existing_role");
    expect(evidenceSql).toContain("guard_search_path_locked");
    expect(evidenceSql).toContain("guard_authenticated_execute_blocked");
  });

  it("verifies Matter helper/RPC semantics and privilege boundaries", () => {
    expect(evidenceSql).toContain("scoped_admin_helper_semantics_verified");
    expect(evidenceSql).toContain("assigned_staff_helper_semantics_verified");
    expect(evidenceSql).toContain("assignment_rpc_semantics_verified");
    expect(evidenceSql).toContain("assignment_rpc_execute_boundary_verified");
    expect(evidenceSql).toContain("authenticated_client_id_update_blocked");
    expect(evidenceSql).toContain("authenticated_assignment_update_blocked");
    expect(evidenceSql).toContain("broad_staff_policy_removed");
    expect(evidenceSql).toContain("matter_update_with_check_scoped");
  });
});
