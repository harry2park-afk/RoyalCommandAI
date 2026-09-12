import { describe, expect, it } from "vitest";
import {
  REQUIRED_COUNTRY_COMPLIANCE_EVIDENCE,
} from "./countryComplianceHookStructure";
import {
  NEXT_PRIORITY_COUNTRY_COMPLIANCE_HOOK_DRAFTS,
  getNextPriorityCountryComplianceHookDraft,
} from "./nextPriorityCountryComplianceHookDrafts";
import { getConfiguredCountryCodes } from "./countryResolver";

const NEXT_PRIORITY_COUNTRY_CODES = ["SG", "CN", "HK", "TW", "IN"] as const;

describe("next-priority country compliance hook drafts", () => {
  it("covers SG/CN/HK/TW/IN exactly once with the full human-reviewed evidence contract", () => {
    expect(
      NEXT_PRIORITY_COUNTRY_COMPLIANCE_HOOK_DRAFTS.map((hook) => hook.countryCode),
    ).toEqual(NEXT_PRIORITY_COUNTRY_CODES);

    expect(new Set(NEXT_PRIORITY_COUNTRY_COMPLIANCE_HOOK_DRAFTS.map((hook) => hook.countryCode)).size).toBe(
      NEXT_PRIORITY_COUNTRY_CODES.length,
    );

    for (const countryCode of NEXT_PRIORITY_COUNTRY_CODES) {
      const hook = getNextPriorityCountryComplianceHookDraft(countryCode);
      expect(hook, countryCode).not.toBeNull();
      expect(hook?.requiredEvidence, countryCode).toEqual(
        REQUIRED_COUNTRY_COMPLIANCE_EVIDENCE,
      );
      expect(hook?.humanReviewRequired, countryCode).toBe(true);
      expect(hook?.automaticApprovalAllowed, countryCode).toBe(false);
      expect(hook?.activation, countryCode).toBe("INACTIVE_DRAFT");
    }
  });

  it("keeps every next-priority compliance draft outside the active country registry", () => {
    const configured = new Set(getConfiguredCountryCodes());

    for (const countryCode of NEXT_PRIORITY_COUNTRY_CODES) {
      expect(configured.has(countryCode), countryCode).toBe(false);
    }
  });

  it("does not resolve an unknown country as a compliance draft", () => {
    expect(getNextPriorityCountryComplianceHookDraft("NZ")).toBeNull();
  });
});
