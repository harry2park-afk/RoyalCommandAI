import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "..");
const configPath = path.join(repoRoot, "supabase", "config.toml");
const scriptPath = path.join(repoRoot, "scripts", "supabase-linked-migration-dry-run.sh");

function readProjectRefFromConfig(): string {
  const config = fs.readFileSync(configPath, "utf8");
  const match = config.match(/^project_id\s*=\s*"([a-z0-9]+)"\s*$/m);
  if (!match) throw new Error("supabase/config.toml project_id is missing or malformed");
  return match[1];
}

function readExpectedProjectRefFromScript(): string {
  const script = fs.readFileSync(scriptPath, "utf8");
  const match = script.match(/^EXPECTED_PROJECT_REF="([a-z0-9]+)"\s*$/m);
  if (!match) throw new Error("linked dry-run EXPECTED_PROJECT_REF is missing or malformed");
  return match[1];
}

describe("linked Supabase project identity guard", () => {
  it("keeps the repository config and linked dry-run target identical", () => {
    const configuredProjectRef = readProjectRefFromConfig();
    const expectedProjectRef = readExpectedProjectRefFromScript();

    expect(configuredProjectRef).toBeTruthy();
    expect(expectedProjectRef).toBe(configuredProjectRef);
  });

  it("fails closed before linking if config and expected project refs drift", () => {
    const script = fs.readFileSync(scriptPath, "utf8");

    expect(script).toContain("configured project ref mismatch");
    expect(script).toContain("configured_project_ref=%s");
    expect(script.indexOf("configured project ref mismatch")).toBeLessThan(
      script.indexOf("supabase link --project-ref"),
    );
  });
});
