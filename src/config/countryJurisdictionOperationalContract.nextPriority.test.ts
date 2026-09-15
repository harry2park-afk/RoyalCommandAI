import { describe, expect, it } from "vitest";
import { getCountryConfigByCountryCode } from "./countryResolver";

const NEXT_PRIORITY_JURISDICTION_CONTRACT = {
  SG: {
    taxSystem: "GST",
    integrationKeys: [
      "sgPhone",
      "taxEngine",
      "sgLegalProvider",
      "sgPrivacyProvider",
      "sgInvestmentComplianceProvider",
    ],
  },
  CN: {
    taxSystem: "VAT",
    integrationKeys: [
      "cnPhone",
      "taxEngine",
      "cnLegalProvider",
      "cnPrivacyProvider",
      "cnInvestmentComplianceProvider",
    ],
  },
  HK: {
    taxSystem: "Hong Kong tax regime",
    integrationKeys: [
      "hkPhone",
      "taxEngine",
      "hkLegalProvider",
      "hkPrivacyProvider",
      "hkInvestmentComplianceProvider",
    ],
  },
  TW: {
    taxSystem: "Taiwan tax regime",
    integrationKeys: [
      "twPhone",
      "taxEngine",
      "twLegalProvider",
      "twPrivacyProvider",
      "twInvestmentComplianceProvider",
    ],
  },
  IN: {
    taxSystem: "GST",
    integrationKeys: [
      "inPhone",
      "taxEngine",
      "inLegalProvider",
      "inPrivacyProvider",
      "inInvestmentComplianceProvider",
    ],
  },
} as const;

describe("next-priority jurisdiction and operational integration contract", () => {
  it("pins the reviewed tax-system label and required integration inventory for SG/CN/HK/TW/IN", () => {
    for (const [countryCode, expected] of Object.entries(NEXT_PRIORITY_JURISDICTION_CONTRACT)) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();
      if (!config) throw new Error(`Missing CountryConfig for ${countryCode}`);

      expect(config.taxStructure, `${countryCode}:taxStructure`).toEqual({
        system: expected.taxSystem,
        status: "NEEDS_REVIEW",
      });
      expect(Object.keys(config.integrations).sort(), `${countryCode}:integrations`).toEqual(
        [...expected.integrationKeys].sort(),
      );
    }
  });

  it("keeps every next-priority provider hook fail-closed until reviewed and connected", () => {
    for (const countryCode of Object.keys(NEXT_PRIORITY_JURISDICTION_CONTRACT)) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();
      if (!config) throw new Error(`Missing CountryConfig for ${countryCode}`);

      expect(config.payments.status, `${countryCode}:payments`).toBe("NOT_CONNECTED");
      expect(config.tax.status, `${countryCode}:tax`).toBe("NOT_CONNECTED");
      expect(config.tax.provider, `${countryCode}:taxProvider`).toBeNull();
      expect(Object.values(config.integrations).length, `${countryCode}:integrationCount`).toBeGreaterThan(0);
      expect(
        Object.values(config.integrations).every(({ status }) => status === "NOT_CONNECTED"),
        `${countryCode}:integrationStatuses`,
      ).toBe(true);
      expect(
        Object.values(config.compliance).every((status) => status === "NEEDS_REVIEW"),
        `${countryCode}:compliance`,
      ).toBe(true);
    }
  });
});
