import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const LEGACY_GATE_TOKEN = "countryOperationalLaunchGate";
const CANONICAL_GATE_TOKEN = "evaluateCountryOperationalLaunch()";

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectSourceFiles(path);
    }

    if (!entry.isFile() || !/\.(ts|tsx)$/.test(entry.name)) {
      return [];
    }

    if (/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) {
      return [];
    }

    return [path];
  });
}

describe("country launch authority", () => {
  it("keeps the legacy operational gate out of production source paths", () => {
    const srcRoot = join(process.cwd(), "src");
    const references = collectSourceFiles(srcRoot)
      .map((path) => ({
        path,
        relativePath: relative(srcRoot, path).replaceAll("\\", "/"),
      }))
      .filter(({ relativePath }) => relativePath !== "config/countryOperationalLaunchGate.ts")
      .filter(({ path }) => readFileSync(path, "utf8").includes(LEGACY_GATE_TOKEN))
      .map(({ relativePath }) => relativePath)
      .sort();

    expect(references).toEqual([]);
  });

  it("binds the current manual domain-activation boundary to the canonical operational gate", () => {
    const checklist = readFileSync(join(process.cwd(), "docs", "AU_US_DOMAIN_COPY_READINESS.md"), "utf8");

    expect(checklist).toContain("no runtime route that performs country READY promotion");
    expect(checklist).toContain(CANONICAL_GATE_TOKEN);
    expect(checklist).toContain("launchable === true");
    expect(checklist).toContain("immediately before its external side effect");
    expect(checklist).toContain("blocked gate performs no side effect");
  });
});
