import { describe, expect, it } from "vitest";
import { getCountryConfigByCountryCode } from "../../config/countryResolver";
import { PROFESSIONAL_ROOM_DIRECTORY } from "./professional-room-directory";
import { buildProfessionalRoomCountryTemplatePlan } from "./professional-room-country-template-plan";

const FIRST_WAVE = ["AU", "US", "CA", "KR", "JP", "GB"] as const;

const JURISDICTION_CONTRACT = {
  AU: {
    taxSystem: "GST",
    stateCodes: ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"],
    provinceCodes: [],
  },
  US: {
    taxSystem: "Federal/state/local tax (jurisdiction-specific)",
    stateCodes: [
      "AK",
      "AL",
      "AR",
      "AZ",
      "CA",
      "CO",
      "CT",
      "DC",
      "DE",
      "FL",
      "GA",
      "HI",
      "IA",
      "ID",
      "IL",
      "IN",
      "KS",
      "KY",
      "LA",
      "MA",
      "MD",
      "ME",
      "MI",
      "MN",
      "MO",
      "MS",
      "MT",
      "NC",
      "ND",
      "NE",
      "NH",
      "NJ",
      "NM",
      "NV",
      "NY",
      "OH",
      "OK",
      "OR",
      "PA",
      "RI",
      "SC",
      "SD",
      "TN",
      "TX",
      "UT",
      "VA",
      "VT",
      "WA",
      "WI",
      "WV",
      "WY",
    ],
    provinceCodes: [],
  },
  CA: {
    taxSystem: "GST_HST_PST_QST",
    stateCodes: [],
    provinceCodes: ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"],
  },
  KR: { taxSystem: "VAT", stateCodes: [], provinceCodes: [] },
  JP: { taxSystem: "Consumption Tax", stateCodes: [], provinceCodes: [] },
  GB: { taxSystem: "VAT", stateCodes: [], provinceCodes: [] },
} as const;

function sortedKeys(value: Record<string, unknown> | undefined) {
  return Object.keys(value ?? {}).sort();
}

describe("Professional Room first-wave jurisdiction integrity", () => {
  it("pins reviewed first-wave tax systems and configured subdivision inventories", () => {
    for (const countryCode of FIRST_WAVE) {
      const expected = JURISDICTION_CONTRACT[countryCode];
      const config = getCountryConfigByCountryCode(countryCode);

      expect(config, countryCode).not.toBeNull();
      expect(config?.taxStructure?.system).toBe(expected.taxSystem);
      expect(config?.taxStructure?.status).toBe("NEEDS_REVIEW");
      expect(sortedKeys(config?.states)).toEqual([...expected.stateCodes].sort());
      expect(sortedKeys(config?.provinces)).toEqual([...expected.provinceCodes].sort());
    }
  });

  it("copies jurisdiction metadata into all 18 governed room plans without granting execution authority", () => {
    expect(PROFESSIONAL_ROOM_DIRECTORY).toHaveLength(18);

    for (const countryCode of FIRST_WAVE) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();

      for (const room of PROFESSIONAL_ROOM_DIRECTORY) {
        const plan = buildProfessionalRoomCountryTemplatePlan(room.id, countryCode);

        expect(plan, `${countryCode}:${room.id}`).not.toBeNull();
        expect(plan?.jurisdictionHook.taxStructure).toEqual(config?.taxStructure ?? null);
        expect(plan?.jurisdictionHook.states).toEqual(config?.states ?? {});
        expect(plan?.jurisdictionHook.provinces).toEqual(config?.provinces ?? {});

        if (config?.taxStructure) {
          expect(plan?.jurisdictionHook.taxStructure).not.toBe(config.taxStructure);
        }
        expect(plan?.jurisdictionHook.states).not.toBe(config?.states);
        expect(plan?.jurisdictionHook.provinces).not.toBe(config?.provinces);

        expect(plan?.launchAuthority).toBe("COUNTRY_GATE_REQUIRED");
        expect(plan?.humanApprovalRequired).toBe(true);
        expect(plan?.regulatedExecutionAllowed).toBe(false);
        expect(plan?.livePaymentExecutionAllowed).toBe(false);
        expect(plan?.createsRoom).toBe(false);
        expect(plan?.activatesCountry).toBe(false);
      }
    }
  });
});
