import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { describe, expect, it } from "vitest";
import { getConfiguredCountryCodes } from "./countryResolver";

type RawCountryConfig = {
  countryCode?: unknown;
};

function readCountryConfigFiles(): Array<{ fileName: string; countryCode: string }> {
  const countryDirectory = join(process.cwd(), "src", "config", "countries");

  return readdirSync(countryDirectory)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort()
    .map((fileName) => {
      const raw = JSON.parse(
        readFileSync(join(countryDirectory, fileName), "utf8"),
      ) as RawCountryConfig;

      expect(typeof raw.countryCode, fileName).toBe("string");

      return {
        fileName,
        countryCode: String(raw.countryCode).trim().toUpperCase(),
      };
    });
}

describe("country configuration source authority", () => {
  it("requires every country JSON to be canonical, uniquely named, and resolver-registered", () => {
    const files = readCountryConfigFiles();
    const fileCountryCodes = files.map(({ countryCode }) => countryCode);

    for (const { fileName, countryCode } of files) {
      expect(countryCode.length, fileName).toBeGreaterThan(0);
      expect(basename(fileName, ".json"), fileName).toBe(countryCode.toLowerCase());
    }

    expect(new Set(fileCountryCodes).size).toBe(fileCountryCodes.length);
    expect([...fileCountryCodes].sort()).toEqual(getConfiguredCountryCodes());
  });
});
