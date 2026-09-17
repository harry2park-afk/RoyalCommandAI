import { describe, expect, it } from "vitest";
import { CREATE_ROOM_LANGUAGES, createRoomCopy } from "../lib/rooms/create-room-i18n";
import { getCountryConfigByCountryCode } from "./countryResolver";
import { evaluateCountryLocalizationStructure } from "./countryLocalizationStructure";
import {
  evaluateCountryOperationalLaunch,
  type CountryOperationalEvidence,
} from "./countryOperationalLaunchGate";

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

describe("country localization structure rollout safety", () => {
  it("keeps the existing Australia launch path structurally aligned", () => {
    const config = getCountryConfigByCountryCode("AU");
    expect(config).not.toBeNull();
    expect(evaluateCountryLocalizationStructure(config!)).toEqual({
      ready: true,
      blockers: [],
    });
  });

  it("supports Canada's declared French secondary locale in Create Room without critical English fallback", () => {
    const config = getCountryConfigByCountryCode("CA");
    expect(config?.secondaryLocale).toBe("fr-CA");
    expect(CREATE_ROOM_LANGUAGES.map(({ locale }) => locale)).toContain("fr");
    expect(createRoomCopy("fr").title).toBe("Créer votre Room");

    const structure = evaluateCountryLocalizationStructure(config!);
    expect(structure).toEqual({ ready: true, blockers: [] });

    const gate = evaluateCountryOperationalLaunch(config!, VERIFIED_OPERATIONAL_EVIDENCE);
    expect(gate.operationalBlockers).not.toContain("LOCALIZATION_STRUCTURE_NOT_READY");
    expect(gate.launchable).toBe(false);
  });

  it("binds canonical JP/KR top-level jurisdiction inventories without treating identity as review approval", () => {
    const expected = {
      JP: {
        codes: Array.from({ length: 47 }, (_, index) => String(index + 1).padStart(2, "0")),
        samples: {
          "01": "Hokkaido",
          "13": "Tokyo",
          "47": "Okinawa",
        },
      },
      KR: {
        codes: [
          "11",
          "26",
          "27",
          "28",
          "29",
          "30",
          "31",
          "41",
          "42",
          "43",
          "44",
          "45",
          "46",
          "47",
          "48",
          "49",
          "50",
        ],
        samples: {
          "11": "Seoul",
          "42": "Gangwon State",
          "45": "Jeonbuk State",
          "50": "Sejong",
        },
      },
    } as const;

    for (const countryCode of ["JP", "KR"] as const) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();
      if (!config) throw new Error(`Missing CountryConfig for ${countryCode}`);

      const subdivisions = config.provinces ?? config.states ?? {};
      expect(Object.keys(subdivisions).sort(), countryCode).toEqual(
        [...expected[countryCode].codes].sort(),
      );
      for (const [code, name] of Object.entries(expected[countryCode].samples)) {
        expect(subdivisions[code]?.name, `${countryCode}-${code}`).toBe(name);
      }

      const structure = evaluateCountryLocalizationStructure(config);
      expect(structure.blockers, countryCode).not.toContain("ADDRESS_SUBDIVISION_INVENTORY_MISSING");

      const gate = evaluateCountryOperationalLaunch(config, VERIFIED_OPERATIONAL_EVIDENCE);
      expect(gate.operationalBlockers, countryCode).toContain("SUBDIVISION_TAX_REVIEW_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain(
        "SUBDIVISION_COMPLIANCE_REVIEW_NOT_VERIFIED",
      );
      expect(gate.launchable, countryCode).toBe(false);

      const withoutInventory = {
        ...config,
        states: undefined,
        provinces: undefined,
      };
      expect(evaluateCountryLocalizationStructure(withoutInventory).blockers, countryCode).toContain(
        "ADDRESS_SUBDIVISION_INVENTORY_MISSING",
      );
    }
  });

  it("keeps countries without a required subdivision field free of the inventory blocker", () => {
    for (const countryCode of ["AU", "US", "CA", "GB"] as const) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();
      if (!config) throw new Error(`Missing CountryConfig for ${countryCode}`);

      expect(evaluateCountryLocalizationStructure(config).blockers, countryCode).not.toContain(
        "ADDRESS_SUBDIVISION_INVENTORY_MISSING",
      );
    }
  });

  it("does not let a VERIFIED localization evidence flag hide missing repository wiring", () => {
    const config = getCountryConfigByCountryCode("AU");
    expect(config).not.toBeNull();

    const structure = evaluateCountryLocalizationStructure({
      ...config!,
      countryCode: "ZZ",
    });

    expect(structure.ready).toBe(false);
    expect(structure.blockers).toContain("ROOM_FACTORY_COUNTRY_PRESET_MISSING");
    expect(structure.blockers).toContain("CREATE_ROOM_COUNTRY_OPTION_MISSING");
  });
});
