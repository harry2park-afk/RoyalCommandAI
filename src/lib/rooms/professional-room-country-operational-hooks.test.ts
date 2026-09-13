import { describe, expect, it } from "vitest";
import { evaluateCountryLaunch } from "../../config/countryLaunchGate";
import {
  evaluateCountryOperationalLaunch,
  type CountryOperationalEvidence,
} from "../../config/countryOperationalLaunchGate";
import { getCountryConfigByCountryCode } from "../../config/countryResolver";
import { PROFESSIONAL_ROOM_DIRECTORY } from "./professional-room-directory";
import { buildProfessionalRoomCountryTemplateBatch } from "./professional-room-country-template-batch";

const FIRST_WAVE = ["AU", "US", "CA", "KR", "JP", "GB"] as const;

const VERIFIED_OPERATIONAL_EVIDENCE: CountryOperationalEvidence = {
  domainBinding: "VERIFIED",
  authCallback: "VERIFIED",
  sessionCookies: "VERIFIED",
  communicationsRules: "VERIFIED",
  dataResidency: "VERIFIED",
  localization: "VERIFIED",
  requiredIntegrations: "VERIFIED",
  previewSmokeTest: "VERIFIED",
  rollbackPath: "VERIFIED",
};

describe("Professional Room first-wave operational hook integrity", () => {
  it("copies canonical legal, privacy, tax and payment hooks into every governed room plan without granting execution authority", () => {
    expect(PROFESSIONAL_ROOM_DIRECTORY).toHaveLength(18);

    for (const countryCode of FIRST_WAVE) {
      const config = getCountryConfigByCountryCode(countryCode);
      const batch = buildProfessionalRoomCountryTemplateBatch(countryCode);

      expect(config, countryCode).not.toBeNull();
      expect(batch, countryCode).not.toBeNull();
      expect(batch?.roomCount, countryCode).toBe(18);
      expect(batch?.plans, countryCode).toHaveLength(18);

      for (const plan of batch!.plans) {
        expect(plan.complianceHook, `${countryCode}:${plan.catalogId}:compliance`).toEqual({
          legal: config!.compliance.legal,
          privacy: config!.compliance.privacy,
          tax: config!.compliance.tax,
          medical: config!.compliance.medical,
          investment: config!.compliance.investment,
        });
        expect(plan.paymentHook, `${countryCode}:${plan.catalogId}:payment`).toEqual({
          primaryProvider: config!.payments.primary,
          connectionStatus: config!.payments.status,
        });
        expect(plan.taxHook, `${countryCode}:${plan.catalogId}:tax`).toEqual({
          provider: config!.tax.provider,
          connectionStatus: config!.tax.status,
        });

        expect(plan.launchAuthority).toBe("COUNTRY_GATE_REQUIRED");
        expect(plan.humanApprovalRequired).toBe(true);
        expect(plan.regulatedExecutionAllowed).toBe(false);
        expect(plan.livePaymentExecutionAllowed).toBe(false);
        expect(plan.createsRoom).toBe(false);
        expect(plan.activatesCountry).toBe(false);
      }
    }
  });

  it("does not let complete operational evidence bypass the canonical country legal/tax/payment gate", () => {
    for (const countryCode of FIRST_WAVE) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();

      const countryGate = evaluateCountryLaunch(config!);
      const operationalGate = evaluateCountryOperationalLaunch(
        config!,
        VERIFIED_OPERATIONAL_EVIDENCE,
      );

      expect(operationalGate.operationalBlockers, countryCode).toEqual([]);
      expect(operationalGate.countryGate, countryCode).toEqual(countryGate);
      expect(operationalGate.launchable, countryCode).toBe(countryGate.launchable);

      if (!countryGate.launchable) {
        expect(operationalGate.launchable, countryCode).toBe(false);
        expect(countryGate.blockers.length, countryCode).toBeGreaterThan(0);
      }
    }
  });

  it("keeps every first-wave country blocked when one operational control is not verified", () => {
    for (const countryCode of FIRST_WAVE) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();

      const gate = evaluateCountryOperationalLaunch(config!, {
        ...VERIFIED_OPERATIONAL_EVIDENCE,
        dataResidency: "BLOCKED",
      });

      expect(gate.launchable, countryCode).toBe(false);
      expect(gate.operationalBlockers, countryCode).toContain("DATA_RESIDENCY_NOT_VERIFIED");
    }
  });
});
