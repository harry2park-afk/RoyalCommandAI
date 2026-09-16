import { describe, expect, it } from "vitest";
import { getFirstWaveCountryRoomPack } from "../lib/rooms/countries";
import { getCountryConfigByCountryCode } from "./countryResolver";
import {
  FIRST_WAVE_COUNTRY_COMPLIANCE_HOOKS,
  REQUIRED_COUNTRY_COMPLIANCE_EVIDENCE,
  evaluateCountryComplianceHookStructure,
  getCountryComplianceHook,
  isCountryRoomPackBoundToConfig,
  isCountryRoomPackSecurityPolicySafe,
} from "./countryComplianceHookStructure";

const FIRST_WAVE = ["AU", "US", "CA", "KR", "JP", "GB"] as const;

describe("first-wave country compliance hook structure", () => {
  it("registers exactly the first wave and keeps later countries outside the hook", () => {
    expect(FIRST_WAVE_COUNTRY_COMPLIANCE_HOOKS.map((hook) => hook.countryCode)).toEqual(
      FIRST_WAVE,
    );
    expect(getCountryComplianceHook("SG")).toBeNull();
    expect(getCountryComplianceHook("IN")).toBeNull();
  });

  it("requires the same human-reviewed evidence on every first-wave hook", () => {
    for (const code of FIRST_WAVE) {
      const hook = getCountryComplianceHook(code);
      expect(hook).not.toBeNull();
      expect(hook?.requiredEvidence).toEqual(REQUIRED_COUNTRY_COMPLIANCE_EVIDENCE);
      expect(hook?.humanReviewRequired).toBe(true);
      expect(hook?.automaticApprovalAllowed).toBe(false);
    }
  });

  it("requires Legal and Accounting packs with structure-only safe clone defaults", () => {
    for (const code of FIRST_WAVE) {
      const pack = getFirstWaveCountryRoomPack(code);
      expect(pack).not.toBeNull();
      expect(pack?.packs.legal.trim().length).toBeGreaterThan(0);
      expect(pack?.packs.accounting.trim().length).toBeGreaterThan(0);
      expect(pack?.roomDefaults.clonePolicy).toBe("structure-only");
      expect(pack?.roomDefaults.cloneCustomerData).toBe(false);
      expect(pack?.roomDefaults.cloneMemory).toBe(false);
      expect(pack?.roomDefaults.cloneCredentials).toBe(false);
      expect(pack?.roomDefaults.cloneSecrets).toBe(false);
      expect(pack?.roomDefaults.humanApprovalForExternalActions).toBe(true);
      expect(pack && isCountryRoomPackSecurityPolicySafe(pack), code).toBe(true);
    }
  });

  it("fails closed if a country Room Pack weakens tenant, secret, core, or compliance-version safety", () => {
    const pack = getFirstWaveCountryRoomPack("CA");
    expect(pack).not.toBeNull();
    if (!pack) throw new Error("Missing Canada first-wave source");

    for (const unsafePolicy of [
      { ...pack.policy, globalCoreImmutable: false },
      { ...pack.policy, countryRulesSeparateFromCore: false },
      { ...pack.policy, customerDataIsolationRequired: false },
      { ...pack.policy, customerSecretsNeverCopied: false },
      { ...pack.policy, countrySpecificComplianceMustBeVersioned: false },
    ]) {
      expect(isCountryRoomPackSecurityPolicySafe({ ...pack, policy: unsafePolicy })).toBe(false);
    }
  });

  it("binds every first-wave Room Pack identity and locale metadata to canonical CountryConfig", () => {
    for (const code of FIRST_WAVE) {
      const pack = getFirstWaveCountryRoomPack(code);
      const config = getCountryConfigByCountryCode(code);
      expect(pack, code).not.toBeNull();
      expect(config, code).not.toBeNull();
      if (!pack || !config) throw new Error(`Missing first-wave source for ${code}`);

      expect(isCountryRoomPackBoundToConfig(pack, config), code).toBe(true);
    }
  });

  it("fails the Room Pack binding when launch-critical country metadata drifts", () => {
    const pack = getFirstWaveCountryRoomPack("CA");
    const config = getCountryConfigByCountryCode("CA");
    expect(pack).not.toBeNull();
    expect(config).not.toBeNull();
    if (!pack || !config) throw new Error("Missing Canada first-wave source");
    if (!("provincesAndTerritories" in pack)) {
      throw new Error("Canada Room Pack is missing province and territory bindings");
    }

    expect(
      isCountryRoomPackBoundToConfig({ ...pack, currencyCode: "USD" }, config),
    ).toBe(false);
    expect(
      isCountryRoomPackBoundToConfig({ ...pack, timeZone: "America/New_York" }, config),
    ).toBe(false);
    expect(
      isCountryRoomPackBoundToConfig({ ...pack, timeFormat: "24h" }, config),
    ).toBe(false);
    expect(
      isCountryRoomPackBoundToConfig(
        { ...pack, addressFormat: [...pack.addressFormat].reverse() },
        config,
      ),
    ).toBe(false);
    expect(
      isCountryRoomPackBoundToConfig({ ...pack, secondaryLanguageTags: [] }, config),
    ).toBe(false);
    expect(
      isCountryRoomPackBoundToConfig(
        {
          ...pack,
          provincesAndTerritories: pack.provincesAndTerritories.filter((code) => code !== "QC"),
        },
        config,
      ),
    ).toBe(false);
    expect(
      isCountryRoomPackBoundToConfig(
        {
          ...pack,
          provincesAndTerritories: [...pack.provincesAndTerritories, "XX"],
        },
        config,
      ),
    ).toBe(false);
  });

  it("has first-wave compliance hooks without promoting country review state", () => {
    for (const code of FIRST_WAVE) {
      const config = getCountryConfigByCountryCode(code);
      expect(config).not.toBeNull();
      const legalBefore = config!.compliance.legal;
      const privacyBefore = config!.compliance.privacy;
      expect(evaluateCountryComplianceHookStructure(config!)).toEqual({
        ready: true,
        blockers: [],
      });
      expect(config!.compliance.legal).toBe(legalBefore);
      expect(config!.compliance.privacy).toBe(privacyBefore);
    }
  });
});
