import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const snapshot = JSON.parse(
  readFileSync(
    new URL("./first-wave-locale-runtime-readback-20260923-1649.json", import.meta.url),
    "utf8",
  ),
) as {
  read_only: boolean;
  first_wave_required_locales: Array<{
    country_code: string;
    locale_tag: string;
    locale_kind: "primary" | "secondary";
    locale_rows: number;
    encounter_rows: number;
    runtime_verified: boolean;
  }>;
  hosted_manifest_summary: Record<
    string,
    {
      manifest_rows: number;
      non_null_encounter_rows: number;
      language_distribution?: Record<string, number>;
    }
  >;
  supabase_development_branches: number;
  launch_interpretation: {
    first_wave_disposition: string;
  };
};

function countryConfig(countryCode: string) {
  return JSON.parse(
    readFileSync(
      new URL(`../src/config/countries/${countryCode.toLowerCase()}.json`, import.meta.url),
      "utf8",
    ),
  ) as { countryCode: string; locale: string; secondaryLocale: string | null };
}

describe("first-wave locale/runtime Hosted readback", () => {
  it("binds runtime evidence to the exact configured primary locales", () => {
    const primary = snapshot.first_wave_required_locales.filter(
      (entry) => entry.locale_kind === "primary",
    );

    expect(primary.map((entry) => entry.country_code)).toEqual([
      "AU",
      "US",
      "CA",
      "KR",
      "JP",
      "GB",
    ]);

    for (const entry of primary) {
      const config = countryConfig(entry.country_code);
      expect(config.countryCode).toBe(entry.country_code);
      expect(config.locale).toBe(entry.locale_tag);
    }
  });

  it("keeps Canada's configured secondary locale explicit in localization evidence", () => {
    const canada = countryConfig("CA");
    expect(canada.secondaryLocale).toBe("fr-CA");

    const frenchRuntime = snapshot.first_wave_required_locales.find(
      (entry) =>
        entry.country_code === "CA" &&
        entry.locale_kind === "secondary" &&
        entry.locale_tag === canada.secondaryLocale,
    );

    expect(frenchRuntime).toBeDefined();
    expect(frenchRuntime?.locale_rows).toBe(0);
    expect(frenchRuntime?.encounter_rows).toBe(0);
    expect(frenchRuntime?.runtime_verified).toBe(false);
  });

  it("does not treat wrong-locale or non-encounter AU manifests as en-AU runtime proof", () => {
    const au = snapshot.hosted_manifest_summary.AU;
    expect(au.manifest_rows).toBe(7);
    expect(au.non_null_encounter_rows).toBe(0);
    expect(au.language_distribution).toEqual({ ko: 5, "ko-KR": 2 });

    const auRuntime = snapshot.first_wave_required_locales.find(
      (entry) => entry.country_code === "AU" && entry.locale_tag === "en-AU",
    );
    expect(auRuntime?.locale_rows).toBe(0);
    expect(auRuntime?.encounter_rows).toBe(0);
    expect(auRuntime?.runtime_verified).toBe(false);
  });

  it("keeps all first-wave launch locales fail-closed until exact encounter-backed runtime exists", () => {
    expect(snapshot.read_only).toBe(true);
    expect(snapshot.supabase_development_branches).toBe(0);
    expect(snapshot.launch_interpretation.first_wave_disposition).toBe("HOLD");

    for (const entry of snapshot.first_wave_required_locales) {
      expect(entry.locale_rows, `${entry.country_code}:${entry.locale_tag}`).toBe(0);
      expect(entry.encounter_rows, `${entry.country_code}:${entry.locale_tag}`).toBe(0);
      expect(entry.runtime_verified, `${entry.country_code}:${entry.locale_tag}`).toBe(false);
    }
  });
});
