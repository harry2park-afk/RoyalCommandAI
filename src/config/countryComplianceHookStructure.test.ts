import { describe, expect, it } from "vitest";
import { getFirstWaveCountryRoomPack } from "../lib/rooms/countries";
import { getCountryConfigByCountryCode } from "./countryResolver";
import {
  FIRST_WAVE_COUNTRY_COMPLIANCE_HOOKS,
  REQUIRED_COUNTRY_COMPLIANCE_EVIDENCE,
  evaluateCountryComplianceHookStructure,
  getCountryComplianceHook,
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
    }
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
