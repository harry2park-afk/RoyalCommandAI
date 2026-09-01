import { describe, expect, it } from "vitest";
import { evaluateCountryLaunch } from "./countryLaunchGate";
import { getConfiguredCountryCodes, getCountryConfigByCountryCode } from "./countryResolver";
import type { CountryConfig } from "../types/countryConfig";

const FIRST_WAVE_COUNTRY_CODES = ["AU", "US", "CA", "KR", "JP", "GB"] as const;

describe("country launch readiness gate", () => {
  it("keeps all first-wave countries present and every configured country blocked until launch-critical reviews and connections are verified", () => {
    const configuredCountryCodes = getConfiguredCountryCodes();
    const configuredCountrySet = new Set(configuredCountryCodes);

    for (const countryCode of FIRST_WAVE_COUNTRY_CODES) {
      expect(configuredCountrySet.has(countryCode), countryCode).toBe(true);
    }

    for (const countryCode of configuredCountryCodes) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();
      const gate = evaluateCountryLaunch(config!);
      expect(gate.launchable, countryCode).toBe(false);
      expect(gate.blockers.length, countryCode).toBeGreaterThan(0);
    }
  });

  it("blocks launch while a country-specific tax structure still needs review", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base?.taxStructure?.status).toBe("NEEDS_REVIEW");
    expect(evaluateCountryLaunch(base!).blockers).toContain("TAX_STRUCTURE_REVIEW");
  });

  it("fails closed when country-specific tax structure evidence is missing", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();

    const otherwiseReady: CountryConfig = {
      ...base!,
      compliance: {
        legal: "READY",
        tax: "READY",
        medical: "READY",
        investment: "READY",
        privacy: "READY",
      },
      taxStructure: undefined,
      payments: { ...base!.payments, status: "CONNECTED" },
      tax: { ...base!.tax, status: "CONNECTED" },
    };

    expect(evaluateCountryLaunch(otherwiseReady)).toEqual({
      launchable: false,
      blockers: ["TAX_STRUCTURE_REVIEW"],
    });
  });

  it("only becomes launchable when compliance, tax structure, payments and tax are all explicitly verified", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();

    const ready: CountryConfig = {
      ...base!,
      compliance: {
        legal: "READY",
        tax: "READY",
        medical: "READY",
        investment: "READY",
        privacy: "READY",
      },
      taxStructure: base!.taxStructure ? { ...base!.taxStructure, status: "READY" } : undefined,
      payments: { ...base!.payments, status: "CONNECTED" },
      tax: { ...base!.tax, status: "CONNECTED" },
    };

    expect(evaluateCountryLaunch(ready)).toEqual({ launchable: true, blockers: [] });
  });
});
