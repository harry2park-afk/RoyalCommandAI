import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type CompatibilityEvidence = {
  launch_gate: {
    guard_search_path_expected: string;
    handle_new_user_search_path_expected: string;
  };
  auth_candidate: {
    guard_search_path_declared: string;
    handle_new_user_search_path_declared: string;
  };
  integration_compatible: boolean;
  release_ready: boolean;
  safety: {
    hosted_mutation_performed: boolean;
    production_change_authorized: boolean;
    country_ready_authorized: boolean;
  };
};

const root = process.cwd();
const evidence = JSON.parse(
  readFileSync(
    resolve(root, "scripts/october-launch-auth-candidate-compatibility-20260911.json"),
    "utf8",
  ),
) as CompatibilityEvidence;
const readinessSql = readFileSync(
  resolve(root, "scripts/october-launch-auth-data-isolation-readiness.sql"),
  "utf8",
).toLowerCase();

describe("October auth candidate / launch-gate compatibility", () => {
  it("keeps the #691 SECURITY DEFINER contract aligned without claiming release readiness", () => {
    expect(evidence.integration_compatible).toBe(true);
    expect(evidence.release_ready).toBe(false);

    expect(evidence.launch_gate.guard_search_path_expected).toBe(
      "search_path=pg_catalog",
    );
    expect(evidence.launch_gate.handle_new_user_search_path_expected).toBe(
      "search_path=pg_catalog",
    );
    expect(evidence.auth_candidate.guard_search_path_declared).toBe(
      "search_path=pg_catalog",
    );
    expect(evidence.auth_candidate.handle_new_user_search_path_declared).toBe(
      "search_path=pg_catalog",
    );
  });

  it("proves the full launch readiness SQL requires both isolated pg_catalog paths", () => {
    const isolatedPathChecks =
      readinessSql.match(/function_config = 'search_path=pg_catalog'/g) ?? [];

    expect(isolatedPathChecks).toHaveLength(2);
    expect(readinessSql).not.toContain(
      "search_path=pg_catalog, auth, public, private",
    );
    expect(readinessSql).not.toContain(
      "function_config like '%search_path=public%'",
    );
  });

  it("cannot be mistaken for deployment or country approval", () => {
    expect(evidence.safety.hosted_mutation_performed).toBe(false);
    expect(evidence.safety.production_change_authorized).toBe(false);
    expect(evidence.safety.country_ready_authorized).toBe(false);
  });
});
