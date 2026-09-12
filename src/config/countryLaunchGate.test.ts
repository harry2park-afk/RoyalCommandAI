import { describe, expect, it } from "vitest";
import { evaluateCountryLaunch } from "./countryLaunchGate";
import { getConfiguredCountryCodes, getCountryConfigByCountryCode } from "./countryResolver";
import type { CountryConfig } from "../types/countryConfig";

describe("country launch readiness gate", () => {
  it("keeps the first wave and next-priority Singapore blocked until launch-critical reviews and connections are verified", () => {
    expect(getConfiguredCountryCodes()).toEqual(["AU", "CA", "GB", "JP", "KR", "SG", "US"]);

    for (const countryCode of getConfiguredCountryCodes()) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();
      const gate = evaluateCountryLaunch(config!);
      expect(gate.launchable, countryCode).toBe(false);
      expect(gate.blockers.length, countryCode).toBeGreaterThan(0);
    }
  });

  it("keeps Singapore explicitly blocked before human review and provider connection", () => {
    const config = getCountryConfigByCountryCode("SG");
    expect(config).not.toBeNull();

    const gate = evaluateCountryLaunch(config!);
    expect(gate.launchable).toBe(false);
    expect(gate.blockers).toEqual([
      "LEGAL_REVIEW",
      "TAX_REVIEW",
      "TAX_STRUCTURE_REVIEW",
      "MEDICAL_REVIEW",
      "INVESTMENT_REVIEW",
      "PRIVACY_REVIEW",
      "PAYMENTS_NOT_CONNECTED",
      "TAX_NOT_CONNECTED",
    ]);
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
