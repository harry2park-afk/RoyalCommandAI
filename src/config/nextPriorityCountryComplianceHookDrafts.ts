import {
  REQUIRED_COUNTRY_COMPLIANCE_EVIDENCE,
  type CountryComplianceEvidenceKey,
} from "./countryComplianceHookStructure";

export type NextPriorityCountryCode = "SG" | "CN" | "HK" | "TW" | "IN";

export type NextPriorityCountryComplianceHookDraft = {
  countryCode: NextPriorityCountryCode;
  requiredEvidence: readonly CountryComplianceEvidenceKey[];
  humanReviewRequired: true;
  automaticApprovalAllowed: false;
  activation: "INACTIVE_DRAFT";
};

/**
 * Inactive legal/compliance hook drafts for the next rollout wave.
 *
 * These entries deliberately do not register the countries with the active
 * Country Resolver and do not satisfy CountryOperationalLaunchGate. They only
 * preserve the same human-review boundary used by the first October wave so
 * SG/CN/HK/TW/IN cannot later be introduced with weaker compliance evidence.
 */
export const NEXT_PRIORITY_COUNTRY_COMPLIANCE_HOOK_DRAFTS: readonly NextPriorityCountryComplianceHookDraft[] = [
  "SG",
  "CN",
  "HK",
  "TW",
  "IN",
].map((countryCode) => ({
  countryCode: countryCode as NextPriorityCountryCode,
  requiredEvidence: REQUIRED_COUNTRY_COMPLIANCE_EVIDENCE,
  humanReviewRequired: true as const,
  automaticApprovalAllowed: false as const,
  activation: "INACTIVE_DRAFT" as const,
}));

export function getNextPriorityCountryComplianceHookDraft(
  countryCode: string,
): NextPriorityCountryComplianceHookDraft | null {
  const normalized = countryCode.trim().toUpperCase();
  return (
    NEXT_PRIORITY_COUNTRY_COMPLIANCE_HOOK_DRAFTS.find(
      (hook) => hook.countryCode === normalized,
    ) ?? null
  );
}
