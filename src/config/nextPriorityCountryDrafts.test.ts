import { describe, expect, it } from "vitest";
import cnConfig from "./countries/cn.json";
import hkConfig from "./countries/hk.json";
import inConfig from "./countries/in.json";
import sgConfig from "./countries/sg.json";
import twConfig from "./countries/tw.json";
import { evaluateCountryLocalizationStructure } from "./countryLocalizationStructure";
import { getConfiguredCountryCodes } from "./countryResolver";
import type { CountryConfig } from "../types/countryConfig";

const DRAFTS = [sgConfig, cnConfig, hkConfig, twConfig, inConfig] as CountryConfig[];

describe("next-priority inactive country config drafts", () => {
  it("authors the complete SG/CN/HK/TW/IN inactive draft inventory", () => {
    expect(DRAFTS.map((config) => config.countryCode)).toEqual([
      "SG",
      "CN",
      "HK",
      "TW",
      "IN",
    ]);

    for (const config of DRAFTS) {
      expect(evaluateCountryLocalizationStructure(config)).toEqual({
        ready: true,
        blockers: [],
      });
    }
  });

  it("keeps every draft fail-closed on compliance, payment, tax and integrations", () => {
    for (const config of DRAFTS) {
      expect(Object.values(config.compliance)).toEqual([
        "NEEDS_REVIEW",
        "NEEDS_REVIEW",
        "NEEDS_REVIEW",
        "NEEDS_REVIEW",
        "NEEDS_REVIEW",
      ]);
      expect(config.payments.status).toBe("NOT_CONNECTED");
      expect(config.payments.primary).toBe("NOT_SELECTED");
      expect(config.tax.status).toBe("NOT_CONNECTED");
      expect(config.tax.provider).toBeNull();
      expect(config.taxStructure?.status).toBe("NEEDS_REVIEW");
      expect(Object.values(config.integrations).every(({ status }) => status === "NOT_CONNECTED")).toBe(true);
    }
  });

  it("does not activate or route any next-priority draft", () => {
    const active = new Set(getConfiguredCountryCodes());

    for (const config of DRAFTS) {
      expect(active.has(config.countryCode)).toBe(false);
    }
  });
});
