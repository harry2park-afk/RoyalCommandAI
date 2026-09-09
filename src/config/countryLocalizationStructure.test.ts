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
  authRecoveryEvidence: "VERIFIED",
  databaseMigrationSafety: "VERIFIED",
  tenantDataIsolation: "VERIFIED",
  matterOwnershipAssignmentAuthority: "VERIFIED",
  authorizationRoleAuthority: "VERIFIED",
  communicationsRules: "VERIFIED",
  recordingConsentEvidence: "VERIFIED",
  legalComplianceEvidence: "VERIFIED",
  privacyLifecycleEvidence: "VERIFIED",
  dataResidency: "VERIFIED",
  localization: "VERIFIED",
  requiredIntegrations: "VERIFIED",
  commercialReadiness: "VERIFIED",
  roomFactoryTemplate: "VERIFIED",
  paymentOperations: "VERIFIED",
  observabilityIncidentResponse: "VERIFIED",
  qaSecurityRegression: "VERIFIED",
  previewSmokeTest: "VERIFIED",
  deploymentProtection: "VERIFIED",
  rollbackPath: "VERIFIED",
};

describe("country localization structure launch gate", () => {
  it("keeps structurally complete first-wave country metadata aligned and exposes Japan's critical English fallback", () => {
    for (const countryCode of FIRST_WAVE_COUNTRIES) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();
      const result = evaluateCountryLocalizationStructure(config!);

      if (countryCode === "JP") {
        expect(result.ready, countryCode).toBe(false);
        expect(result.blockers, countryCode).toEqual([
          "PRIMARY_CREATE_ROOM_CRITICAL_COPY_INCOMPLETE",
        ]);
      } else {
        expect(result, countryCode).toEqual({ ready: true, blockers: [] });
      }
    }
  });

  it("fails closed when a configured launch country is absent from Create Room selection", () => {
    const config = getCountryConfigByCountryCode("AU");
    expect(config).not.toBeNull();

    const result = evaluateCountryLocalizationStructure({
      ...config!,
      countryCode: "ZZ",
    });

    expect(result.ready).toBe(false);
    expect(result.blockers).toContain("ROOM_FACTORY_COUNTRY_PRESET_MISSING");
    expect(result.blockers).toContain("CREATE_ROOM_COUNTRY_OPTION_MISSING");
  });

  it("fails closed when Create Room would default a launch country to the wrong language", () => {
    const config = getCountryConfigByCountryCode("AU");
    expect(config).not.toBeNull();

    const result = evaluateCountryLocalizationStructure({
      ...config!,
      locale: "ko-KR",
    });

    expect(result.ready).toBe(false);
    expect(result.blockers).toContain("ROOM_FACTORY_LOCALE_MISMATCH");
    expect(result.blockers).toContain("CREATE_ROOM_COUNTRY_LOCALE_MISMATCH");
  });

  it("supports Canada's declared French secondary locale in Create Room without critical English fallback", () => {
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

    expect(result.operationalBlockers).toEqual(["LOCALIZATION_NOT_VERIFIED"]);
    expect(result.launchable).toBe(false);
  });

  it("does not allow generic localization evidence to bypass Japan's incomplete critical Create Room copy", () => {
    const config = getCountryConfigByCountryCode("JP");
    expect(config).not.toBeNull();

    const result = evaluateCountryOperationalLaunch(config!, VERIFIED_OPERATIONAL_EVIDENCE);

    expect(result.operationalBlockers).toContain("LOCALIZATION_STRUCTURE_NOT_READY");
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
