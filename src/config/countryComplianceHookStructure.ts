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

const FIRST_WAVE_PROFESSIONAL_ROOM_PACK_IDENTITIES = {
  AU: {
    legal: "AU Legal Pack",
    accounting: "AU Accounting & Tax Pack",
  },
  US: {
    legal: "US Legal Pack",
    accounting: "US Accounting & Tax Pack",
  },
  CA: {
    legal: "CA Legal Pack",
    accounting: "CA Accounting & Tax Pack",
  },
  KR: {
    legal: "KR Legal Pack",
    accounting: "KR Accounting & Tax Pack",
  },
  JP: {
    legal: "JP Legal Pack",
    accounting: "JP Accounting & Tax Pack",
  },
  GB: {
    legal: "GB Legal Pack",
    accounting: "GB Accounting & Tax Pack",
  },
} as const;

export type CountryComplianceHook = {
  countryCode: keyof typeof FIRST_WAVE_PROFESSIONAL_ROOM_PACK_IDENTITIES;
  legalRoomPack: string;
  accountingRoomPack: string;
  requiredEvidence: readonly CountryComplianceEvidenceKey[];
  humanReviewRequired: true;
  automaticApprovalAllowed: false;
};

export const FIRST_WAVE_COUNTRY_COMPLIANCE_HOOKS: readonly CountryComplianceHook[] = (
  ["AU", "US", "CA", "KR", "JP", "GB"] as const
).map((countryCode) => ({
  countryCode,
  legalRoomPack: FIRST_WAVE_PROFESSIONAL_ROOM_PACK_IDENTITIES[countryCode].legal,
  accountingRoomPack: FIRST_WAVE_PROFESSIONAL_ROOM_PACK_IDENTITIES[countryCode].accounting,
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
  addressFormat: readonly string[];
  secondaryLanguageTags?: readonly string[];
  statesAndTerritories?: readonly string[];
  statesAndDistrict?: readonly string[];
  provincesAndTerritories?: readonly string[];
  policy: {
    globalCoreImmutable: boolean;
    countryRulesSeparateFromCore: boolean;
    customerDataIsolationRequired: boolean;
    customerSecretsNeverCopied: boolean;
    countrySpecificComplianceMustBeVersioned: boolean;
  };
};

export type CountryProfessionalRoomPackIdentityBinding = {
  packs: {
    legal: string;
    accounting: string;
  };
};

export type CountryComplianceHookStructureBlocker =
  | "COUNTRY_COMPLIANCE_HOOK_MISSING"
  | "COUNTRY_LEGAL_ROOM_PACK_MISSING"
  | "COUNTRY_ACCOUNTING_ROOM_PACK_MISSING"
  | "COUNTRY_PROFESSIONAL_ROOM_PACK_IDENTITY_MISMATCH"
  | "COUNTRY_ROOM_PACK_CLONE_POLICY_UNSAFE"
  | "COUNTRY_ROOM_PACK_SECURITY_POLICY_UNSAFE"
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

export function isCountryProfessionalRoomPackIdentityBound(
  roomPack: CountryProfessionalRoomPackIdentityBinding,
  hook: CountryComplianceHook,
): boolean {
  return (
    roomPack.packs.legal === hook.legalRoomPack &&
    roomPack.packs.accounting === hook.accountingRoomPack
  );
}

function sameSubdivisionCodeSet(
  configuredCodes: readonly string[],
  roomPackCodes: readonly string[],
): boolean {
  return (
    configuredCodes.length === roomPackCodes.length &&
    configuredCodes.every((code) => roomPackCodes.includes(code))
  );
}

function configuredSubdivisionCodes(config: CountryConfig): string[] {
  return [
    ...Object.keys(config.states ?? {}),
    ...Object.keys(config.provinces ?? {}),
  ];
}

function roomPackSubdivisionCodes(
  roomPack: CountryRoomPackConfigBinding,
): readonly string[] {
  return (
    roomPack.statesAndTerritories ??
    roomPack.statesAndDistrict ??
    roomPack.provincesAndTerritories ??
    []
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
  const addressFormatMatches =
    roomPack.addressFormat.length === config.addressFormat.length &&
    roomPack.addressFormat.every(
      (field, index) => field === config.addressFormat[index],
    );
  const configSubdivisionCodes = configuredSubdivisionCodes(config);
  const subdivisionCodesMatch =
    configSubdivisionCodes.length === 0 ||
    sameSubdivisionCodeSet(configSubdivisionCodes, roomPackSubdivisionCodes(roomPack));

  return (
    roomPack.id === config.countryCode &&
    roomPack.locale === config.locale &&
    roomPack.languageTag === config.locale &&
    roomPack.currencyCode === config.currency &&
    roomPack.phoneCountryCode === config.phoneCountryCode &&
    roomPack.dateFormat === config.dateFormat &&
    roomPack.timeFormat === config.timeFormat &&
    addressFormatMatches &&
    config.timezone.supportedExamples.includes(roomPack.timeZone) &&
    secondaryLocalesMatch &&
    subdivisionCodesMatch
  );
}

export function isCountryRoomPackSecurityPolicySafe(
  roomPack: CountryRoomPackConfigBinding,
): boolean {
  return (
    roomPack.policy.globalCoreImmutable === true &&
    roomPack.policy.countryRulesSeparateFromCore === true &&
    roomPack.policy.customerDataIsolationRequired === true &&
    roomPack.policy.customerSecretsNeverCopied === true &&
    roomPack.policy.countrySpecificComplianceMustBeVersioned === true
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

  if (hook && roomPack && !isCountryProfessionalRoomPackIdentityBound(roomPack, hook)) {
    blockers.push("COUNTRY_PROFESSIONAL_ROOM_PACK_IDENTITY_MISMATCH");
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

  if (roomPack && !isCountryRoomPackSecurityPolicySafe(roomPack)) {
    blockers.push("COUNTRY_ROOM_PACK_SECURITY_POLICY_UNSAFE");
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
