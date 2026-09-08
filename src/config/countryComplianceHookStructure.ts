import type { CountryConfig } from "../types/countryConfig";
import { getFirstWaveCountryRoomPack } from "../lib/rooms/countries";

export const REQUIRED_COUNTRY_COMPLIANCE_EVIDENCE = [
  "recordingConsentEvidence",
  "legalComplianceEvidence",
  "privacyLifecycleEvidence",
  "commercialReadiness",
] as const;

export type CountryComplianceEvidenceKey =
  (typeof REQUIRED_COUNTRY_COMPLIANCE_EVIDENCE)[number];

export type CountryComplianceHook = {
  countryCode: "AU" | "US" | "CA" | "KR" | "JP" | "GB";
  requiredEvidence: readonly CountryComplianceEvidenceKey[];
  humanReviewRequired: true;
  automaticApprovalAllowed: false;
};

/**
 * Structural wiring only for the first October rollout wave.
 *
 * A hook here does not provide legal advice, approve a policy, or prove that
 * country terms/privacy/recording requirements are satisfied. It only makes the
 * required human-reviewed evidence surfaces explicit so the launch gate cannot
 * treat a Room Factory pack as compliance approval.
 */
export const FIRST_WAVE_COUNTRY_COMPLIANCE_HOOKS: readonly CountryComplianceHook[] = [
  "AU",
  "US",
  "CA",
  "KR",
  "JP",
  "GB",
].map((countryCode) => ({
  countryCode: countryCode as CountryComplianceHook["countryCode"],
  requiredEvidence: REQUIRED_COUNTRY_COMPLIANCE_EVIDENCE,
  humanReviewRequired: true as const,
  automaticApprovalAllowed: false as const,
}));

export type CountryComplianceHookStructureBlocker =
  | "COUNTRY_COMPLIANCE_HOOK_MISSING"
  | "COUNTRY_LEGAL_ROOM_PACK_MISSING"
  | "COUNTRY_COMPLIANCE_HOOK_EVIDENCE_INCOMPLETE"
  | "COUNTRY_COMPLIANCE_HOOK_AUTO_APPROVAL_UNSAFE";

export type CountryComplianceHookStructure = {
  ready: boolean;
  blockers: CountryComplianceHookStructureBlocker[];
};

export function getCountryComplianceHook(
  countryCode: string,
): CountryComplianceHook | null {
  return (
    FIRST_WAVE_COUNTRY_COMPLIANCE_HOOKS.find(
      (hook) => hook.countryCode === countryCode,
    ) ?? null
  );
}

/**
 * Verify repository wiring only. Human evidence remains a separate operational
 * gate and must still be VERIFIED before launch.
 */
export function evaluateCountryComplianceHookStructure(
  config: CountryConfig,
): CountryComplianceHookStructure {
  const blockers: CountryComplianceHookStructureBlocker[] = [];
  const hook = getCountryComplianceHook(config.countryCode);
  const roomPack = getFirstWaveCountryRoomPack(config.countryCode);

  if (!hook) {
    blockers.push("COUNTRY_COMPLIANCE_HOOK_MISSING");
  }

  if (!roomPack?.packs.legal?.trim()) {
    blockers.push("COUNTRY_LEGAL_ROOM_PACK_MISSING");
  }

  if (
    hook &&
    REQUIRED_COUNTRY_COMPLIANCE_EVIDENCE.some(
      (evidenceKey) => !hook.requiredEvidence.includes(evidenceKey),
    )
  ) {
    blockers.push("COUNTRY_COMPLIANCE_HOOK_EVIDENCE_INCOMPLETE");
  }

  if (hook && (!hook.humanReviewRequired || hook.automaticApprovalAllowed)) {
    blockers.push("COUNTRY_COMPLIANCE_HOOK_AUTO_APPROVAL_UNSAFE");
  }

  return {
    ready: blockers.length === 0,
    blockers,
  };
}
