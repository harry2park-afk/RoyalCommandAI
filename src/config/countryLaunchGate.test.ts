import { describe, expect, it } from "vitest";
import { evaluateCountryLaunch } from "./countryLaunchGate";
import { getConfiguredCountryCodes, getCountryConfigByCountryCode } from "./countryResolver";
import type { CountryConfig } from "../types/countryConfig";

describe("country launch readiness gate", () => {
  it("keeps all first-wave countries blocked until launch-critical reviews and connections are verified", () => {
    expect(getConfiguredCountryCodes()).toEqual(["AU", "CA", "GB", "JP", "KR", "US"]);

    for (const countryCode of getConfiguredCountryCodes()) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();
      const gate = evaluateCountryLaunch(config!);
      expect(gate.launchable, countryCode).toBe(false);
      expect(gate.blockers.length, countryCode).toBeGreaterThan(0);
    }
  });

  it("only becomes launchable when compliance, payments and tax are all explicitly verified", () => {
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
      payments: { ...base!.payments, status: "CONNECTED" },
      tax: { ...base!.tax, status: "CONNECTED" },
    };

    expect(evaluateCountryLaunch(ready)).toEqual({ launchable: true, blockers: [] });
  });
});
