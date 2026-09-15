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

export type CountryRoomPackConfigBinding = {
  id: string;
  locale: string;
  languageTag: string;
  timeZone: string;
  currencyCode: string;
  phoneCountryCode: string;
  dateFormat: string;
  timeFormat: string;
  secondaryLanguageTags?: readonly string[];
};

export type CountryComplianceHookStructureBlocker =
  | "COUNTRY_COMPLIANCE_HOOK_MISSING"
  | "COUNTRY_LEGAL_ROOM_PACK_MISSING"
  | "COUNTRY_ACCOUNTING_ROOM_PACK_MISSING"
  | "COUNTRY_ROOM_PACK_CLONE_POLICY_UNSAFE"
  | "COUNTRY_ROOM_PACK_CONFIG_MISMATCH"
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

export function isCountryRoomPackBoundToConfig(
  roomPack: CountryRoomPackConfigBinding,
  config: CountryConfig,
): boolean {
  const configuredSecondaryLocale = config.secondaryLocale ?? null;
  const packSecondaryLocales = roomPack.secondaryLanguageTags ?? [];
  const secondaryLocalesMatch = configuredSecondaryLocale
    ? packSecondaryLocales.length === 1 &&
      packSecondaryLocales[0] === configuredSecondaryLocale
    : packSecondaryLocales.length === 0;

  return (
    roomPack.id === config.countryCode &&
    roomPack.locale === config.locale &&
    roomPack.languageTag === config.locale &&
    roomPack.currencyCode === config.currency &&
    roomPack.phoneCountryCode === config.phoneCountryCode &&
    roomPack.dateFormat === config.dateFormat &&
    roomPack.timeFormat === config.timeFormat &&
    config.timezone.supportedExamples.includes(roomPack.timeZone) &&
    secondaryLocalesMatch
  );
}

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

  if (!roomPack?.packs.accounting?.trim()) {
    blockers.push("COUNTRY_ACCOUNTING_ROOM_PACK_MISSING");
  }

  if (
    roomPack &&
    (roomPack.roomDefaults.clonePolicy !== "structure-only" ||
      roomPack.roomDefaults.cloneCustomerData !== false ||
      roomPack.roomDefaults.cloneMemory !== false ||
      roomPack.roomDefaults.cloneCredentials !== false ||
      roomPack.roomDefaults.cloneSecrets !== false ||
      roomPack.roomDefaults.humanApprovalForExternalActions !== true)
  ) {
    blockers.push("COUNTRY_ROOM_PACK_CLONE_POLICY_UNSAFE");
  }

  if (roomPack && !isCountryRoomPackBoundToConfig(roomPack, config)) {
    blockers.push("COUNTRY_ROOM_PACK_CONFIG_MISMATCH");
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
