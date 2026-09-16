import { describe, expect, it } from "vitest";
import type { CountryConfig } from "../types/countryConfig";
import { getCountryConfigByCountryCode } from "./countryResolver";
import {
  evaluateCountryOperationalLaunch,
  type CountryOperationalEvidence,
} from "./countryOperationalLaunchGate";

const FIRST_WAVE = ["AU", "US", "CA", "KR", "JP", "GB"] as const;

const repositoryVerifiedEvidence: CountryOperationalEvidence = {
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

function blockers(config: CountryConfig) {
  return evaluateCountryOperationalLaunch(config, repositoryVerifiedEvidence).operationalBlockers;
}

describe("first-wave Room Pack runtime config binding", () => {
  it("accepts the canonical first-wave Room Pack bindings", () => {
    for (const code of FIRST_WAVE) {
      const config = getCountryConfigByCountryCode(code);
      expect(config, code).not.toBeNull();
      expect(blockers(config!), code).not.toContain("COUNTRY_ROOM_PACK_CONFIG_MISMATCH");
    }
  });

  it("fails closed when a canonical localization field drifts from its Room Pack", () => {
    const au = getCountryConfigByCountryCode("AU");
    expect(au).not.toBeNull();

    expect(
      blockers({
        ...au!,
        currency: "USD",
      }),
    ).toContain("COUNTRY_ROOM_PACK_CONFIG_MISMATCH");

    expect(
      blockers({
        ...au!,
        addressFormat: [...au!.addressFormat].reverse(),
      }),
    ).toContain("COUNTRY_ROOM_PACK_CONFIG_MISMATCH");
  });

  it("fails closed when Canada's required secondary locale drifts from the Room Pack", () => {
    const ca = getCountryConfigByCountryCode("CA");
    expect(ca).not.toBeNull();

    expect(
      blockers({
        ...ca!,
        secondaryLocale: "fr-FR",
      }),
    ).toContain("COUNTRY_ROOM_PACK_CONFIG_MISMATCH");
  });

  it("fails closed when AU/US/CA subdivision inventories drift from their Room Packs", () => {
    const au = getCountryConfigByCountryCode("AU");
    const us = getCountryConfigByCountryCode("US");
    const ca = getCountryConfigByCountryCode("CA");
    expect(au?.states?.NSW).toBeDefined();
    expect(us?.states).toBeDefined();
    expect(ca?.provinces?.QC).toBeDefined();

    const { NSW: _nsw, ...auWithoutNsw } = au!.states!;
    const [firstUsCode] = Object.keys(us!.states!);
    const { [firstUsCode]: _usSubdivision, ...usWithoutOneSubdivision } = us!.states!;
    const { QC: _qc, ...caWithoutQc } = ca!.provinces!;

    expect(blockers({ ...au!, states: auWithoutNsw })).toContain(
      "COUNTRY_ROOM_PACK_CONFIG_MISMATCH",
    );
    expect(blockers({ ...us!, states: usWithoutOneSubdivision })).toContain(
      "COUNTRY_ROOM_PACK_CONFIG_MISMATCH",
    );
    expect(blockers({ ...ca!, provinces: caWithoutQc })).toContain(
      "COUNTRY_ROOM_PACK_CONFIG_MISMATCH",
    );
  });
});
