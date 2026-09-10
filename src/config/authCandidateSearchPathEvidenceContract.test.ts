import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const evidenceSql = readFileSync(
  resolve(
    process.cwd(),
    "scripts/october-launch-auth-candidate-search-path-readiness.sql",
  ),
  "utf8",
).toLowerCase();

describe("October auth candidate search-path evidence contract", () => {
  it("remains read-only and cannot approve launch", () => {
    expect(evidenceSql).toContain("begin read only;");
    expect(evidenceSql).toContain("rollback;");
    expect(evidenceSql).toContain("'overall_launch_approval', false");
  });

  it("requires the current #691 isolated SECURITY DEFINER contract", () => {
    expect(evidenceSql).toContain("guard_profile_role_change");
    expect(evidenceSql).toContain("handle_new_user");
    expect(evidenceSql).toContain("function_config = 'search_path=pg_catalog'");
    expect(evidenceSql).toContain("security_definer");
    expect(evidenceSql).toContain("end_user_execute_blocked");
    expect(evidenceSql).toContain("harden_profile_role_authority");
    expect(evidenceSql).toContain("candidate_search_path_contract_ready");
  });
});
