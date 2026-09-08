import { describe, expect, it } from "vitest";
import { getCountryConfigByCountryCode } from "./countryResolver";
import {
  FIRST_WAVE_COUNTRY_COMPLIANCE_HOOKS,
  REQUIRED_COUNTRY_COMPLIANCE_EVIDENCE,
  evaluateCountryComplianceHookStructure,
  getCountryComplianceHook,
} from "./countryComplianceHookStructure";

const FIRST_WAVE_COUNTRIES = ["AU", "US", "CA", "KR", "JP", "GB"] as const;

describe("first-wave country compliance hook structure", () => {
  it("registers exactly the first six rollout countries without activating the next wave", () => {
    expect(FIRST_WAVE_COUNTRY_COMPLIANCE_HOOKS.map((hook) => hook.countryCode)).toEqual(
      FIRST_WAVE_COUNTRIES,
    );
    expect(getCountryComplianceHook("SG")).toBeNull();
    expect(getCountryComplianceHook("IN")).toBeNull();
  });

  it("requires human-reviewed legal, privacy, recording and commercial evidence for every first-wave country", () => {
    for (const countryCode of FIRST_WAVE_COUNTRIES) {
      const hook = getCountryComplianceHook(countryCode);

      expect(hook, `${countryCode} compliance hook`).not.toBeNull();
      expect(hook?.humanReviewRequired, `${countryCode} human review`).toBe(true);
      expect(hook?.automaticApprovalAllowed, `${countryCode} auto approval`).toBe(false);
      expect(hook?.requiredEvidence, `${countryCode} evidence`).toEqual(
        REQUIRED_COUNTRY_COMPLIANCE_EVIDENCE,
      );
    }
  });

  it("keeps compliance wiring separate from approval while requiring a legal Room Factory hook", () => {
    for (const countryCode of FIRST_WAVE_COUNTRIES) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, `${countryCode} config`).not.toBeNull();

      const structure = evaluateCountryComplianceHookStructure(config!);
      expect(structure.ready, `${countryCode} structure`).toBe(true);
      expect(structure.blockers, `${countryCode} blockers`).toEqual([]);

      // Structural readiness is deliberately independent of the country's
      // substantive legal/privacy review state.
      expect(config?.compliance.legal, `${countryCode} legal approval`).not.toBe("READY");
    }
  });
});
