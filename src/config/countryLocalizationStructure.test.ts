import { describe, expect, it } from "vitest";
import { CREATE_ROOM_LANGUAGES, createRoomCopy } from "../lib/rooms/create-room-i18n";
import { getCountryConfigByCountryCode } from "./countryResolver";
import { evaluateCountryLocalizationStructure } from "./countryLocalizationStructure";
import {
  evaluateCountryOperationalLaunch,
  type CountryOperationalEvidence,
} from "./countryOperationalLaunchGate";

const FIRST_WAVE_COUNTRIES = ["AU", "US", "CA", "KR", "JP", "GB"] as const;

const VERIFIED_OPERATIONAL_EVIDENCE: CountryOperationalEvidence = {
  domainBinding: "VERIFIED",
  authCallback: "VERIFIED",
  sessionCookies: "VERIFIED",
  tenantDataIsolation: "VERIFIED",
  communicationsRules: "VERIFIED",
  recordingConsentEvidence: "VERIFIED",
  legalComplianceEvidence: "VERIFIED",
  dataResidency: "VERIFIED",
  localization: "VERIFIED",
  requiredIntegrations: "VERIFIED",
  commercialReadiness: "VERIFIED",
  roomFactoryTemplate: "VERIFIED",
  paymentOperations: "VERIFIED",
  qaSecurityRegression: "VERIFIED",
  previewSmokeTest: "VERIFIED",
  deploymentProtection: "VERIFIED",
  rollbackPath: "VERIFIED",
};

describe("country localization structure launch gate", () => {
  it("keeps the configured first-wave country metadata structurally aligned", () => {
    for (const countryCode of FIRST_WAVE_COUNTRIES) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();
      expect(evaluateCountryLocalizationStructure(config!), countryCode).toEqual({
        ready: true,
        blockers: [],
      });
    }
  });

  it("supports Canada's declared French secondary locale in Create Room", () => {
    const config = getCountryConfigByCountryCode("CA");
    expect(config?.secondaryLocale).toBe("fr-CA");
    expect(CREATE_ROOM_LANGUAGES.map(({ locale }) => locale)).toContain("fr");
    expect(createRoomCopy("fr").title).toBe("Créer votre Room");
    expect(evaluateCountryLocalizationStructure(config!)).toEqual({ ready: true, blockers: [] });
  });

  it("keeps human/browser localization evidence independent from structural support", () => {
    const config = getCountryConfigByCountryCode("CA");
    const result = evaluateCountryOperationalLaunch(config!, {
      ...VERIFIED_OPERATIONAL_EVIDENCE,
      localization: "NEEDS_REVIEW",
    });

    expect(result.operationalBlockers).toContain("LOCALIZATION_NOT_VERIFIED");
    expect(result.operationalBlockers).not.toContain("LOCALIZATION_STRUCTURE_NOT_READY");
    expect(result.launchable).toBe(false);
  });

  it("prevents Australia-specific tax and currency copy from leaking through shared launch locales", () => {
    for (const locale of ["en", "fr", "ko", "ja", "zh"] as const) {
      const copy = createRoomCopy(locale);
      expect(copy.websiteBenefit, `${locale} website benefit`).not.toContain("A$");
      expect(copy.pendingIntegration, `${locale} pending integration`).not.toContain("GST");
      expect(copy.step1Help, `${locale} example`).not.toContain("GST");
    }
  });
});
