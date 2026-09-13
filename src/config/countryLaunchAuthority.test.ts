import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const LEGACY_GATE_TOKEN = "countryOperationalLaunchGate";

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
});
