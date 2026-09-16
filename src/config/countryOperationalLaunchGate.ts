import type { CountryConfig } from "../types/countryConfig";
import {
  evaluateCountryLaunch,
  evaluateCountryOperationalLaunch as evaluateScopedCountryOperationalLaunch,
  type CountryLaunchGate,
  type CountryOperationalEvidence as ScopedCountryOperationalEvidence,
  type CountryOperationalReleaseScope,
} from "./countryLaunchGate";
import { evaluateCountryComplianceHookStructure } from "./countryComplianceHookStructure";
import { evaluateCountryLocalizationStructure } from "./countryLocalizationStructure";

export type OperationalEvidenceStatus = "VERIFIED" | "NEEDS_REVIEW" | "BLOCKED";

export type CountryOperationalEvidence = {
  domainBinding: OperationalEvidenceStatus;
  authCallback: OperationalEvidenceStatus;
  sessionCookies: OperationalEvidenceStatus;
  authRecoveryEvidence?: OperationalEvidenceStatus;
  databaseMigrationSafety?: OperationalEvidenceStatus;
  tenantDataIsolation?: OperationalEvidenceStatus;
  matterOwnershipAssignmentAuthority?: OperationalEvidenceStatus;
  authorizationRoleAuthority?: OperationalEvidenceStatus;
  communicationsRules: OperationalEvidenceStatus;
  recordingConsentEvidence?: OperationalEvidenceStatus;
  legalComplianceEvidence?: OperationalEvidenceStatus;
  privacyLifecycleEvidence?: OperationalEvidenceStatus;
  dataResidency: OperationalEvidenceStatus;
  localization: OperationalEvidenceStatus;
  requiredIntegrations: OperationalEvidenceStatus;
  commercialReadiness?: OperationalEvidenceStatus;
  roomFactoryTemplate?: OperationalEvidenceStatus;
  paymentOperations?: OperationalEvidenceStatus;
  observabilityIncidentResponse?: OperationalEvidenceStatus;
  qaSecurityRegression?: OperationalEvidenceStatus;
  previewSmokeTest: OperationalEvidenceStatus;
  deploymentProtection?: OperationalEvidenceStatus;
  rollbackPath: OperationalEvidenceStatus;
};

export type CountryOperationalBlockerCode =
  | "DOMAIN_BINDING_NOT_VERIFIED"
  | "AUTH_CALLBACK_NOT_VERIFIED"
  | "SESSION_COOKIES_NOT_VERIFIED"
  | "AUTH_RECOVERY_EVIDENCE_NOT_VERIFIED"
  | "DATABASE_MIGRATION_SAFETY_NOT_VERIFIED"
  | "TENANT_DATA_ISOLATION_NOT_VERIFIED"
  | "MATTER_OWNERSHIP_ASSIGNMENT_AUTHORITY_NOT_VERIFIED"
  | "AUTHORIZATION_ROLE_AUTHORITY_NOT_VERIFIED"
  | "COMMUNICATIONS_RULES_NOT_VERIFIED"
  | "RECORDING_CONSENT_EVIDENCE_NOT_VERIFIED"
  | "LEGAL_COMPLIANCE_EVIDENCE_NOT_VERIFIED"
  | "PRIVACY_LIFECYCLE_EVIDENCE_NOT_VERIFIED"
  | "DATA_RESIDENCY_NOT_VERIFIED"
  | "LOCALIZATION_NOT_VERIFIED"
  | "LOCALIZATION_STRUCTURE_NOT_READY"
  | "COMPLIANCE_HOOK_STRUCTURE_NOT_READY"
  | "SUBDIVISION_IDENTITY_NOT_VERIFIED"
  | "SUBDIVISION_TAX_REVIEW_NOT_VERIFIED"
  | "SUBDIVISION_COMPLIANCE_REVIEW_NOT_VERIFIED"
  | "REQUIRED_INTEGRATIONS_NOT_VERIFIED"
  | "COMMERCIAL_READINESS_NOT_VERIFIED"
  | "ROOM_FACTORY_TEMPLATE_NOT_VERIFIED"
  | "PAYMENT_OPERATIONS_NOT_VERIFIED"
  | "OBSERVABILITY_INCIDENT_RESPONSE_NOT_VERIFIED"
  | "QA_SECURITY_REGRESSION_NOT_VERIFIED"
  | "PREVIEW_SMOKE_TEST_NOT_VERIFIED"
  | "DEPLOYMENT_PROTECTION_NOT_VERIFIED"
  | "ROLLBACK_PATH_NOT_VERIFIED"
  | "SCOPED_RELEASE_AUTHORITY_NOT_VERIFIED";

export type CountryOperationalLaunchGate = {
  launchable: boolean;
  countryGate: CountryLaunchGate;
  scopedReleaseGate: CountryLaunchGate | null;
  operationalBlockers: CountryOperationalBlockerCode[];
};

const OPERATIONAL_REQUIREMENTS: ReadonlyArray<{
  key: keyof CountryOperationalEvidence;
  blocker: CountryOperationalBlockerCode;
}> = [
  { key: "domainBinding", blocker: "DOMAIN_BINDING_NOT_VERIFIED" },
  { key: "authCallback", blocker: "AUTH_CALLBACK_NOT_VERIFIED" },
  { key: "sessionCookies", blocker: "SESSION_COOKIES_NOT_VERIFIED" },
  { key: "authRecoveryEvidence", blocker: "AUTH_RECOVERY_EVIDENCE_NOT_VERIFIED" },
  { key: "databaseMigrationSafety", blocker: "DATABASE_MIGRATION_SAFETY_NOT_VERIFIED" },
  { key: "tenantDataIsolation", blocker: "TENANT_DATA_ISOLATION_NOT_VERIFIED" },
  {
    key: "matterOwnershipAssignmentAuthority",
    blocker: "MATTER_OWNERSHIP_ASSIGNMENT_AUTHORITY_NOT_VERIFIED",
  },
  { key: "authorizationRoleAuthority", blocker: "AUTHORIZATION_ROLE_AUTHORITY_NOT_VERIFIED" },
  { key: "communicationsRules", blocker: "COMMUNICATIONS_RULES_NOT_VERIFIED" },
  { key: "recordingConsentEvidence", blocker: "RECORDING_CONSENT_EVIDENCE_NOT_VERIFIED" },
  { key: "legalComplianceEvidence", blocker: "LEGAL_COMPLIANCE_EVIDENCE_NOT_VERIFIED" },
  { key: "privacyLifecycleEvidence", blocker: "PRIVACY_LIFECYCLE_EVIDENCE_NOT_VERIFIED" },
  { key: "dataResidency", blocker: "DATA_RESIDENCY_NOT_VERIFIED" },
  { key: "localization", blocker: "LOCALIZATION_NOT_VERIFIED" },
  { key: "requiredIntegrations", blocker: "REQUIRED_INTEGRATIONS_NOT_VERIFIED" },
  { key: "commercialReadiness", blocker: "COMMERCIAL_READINESS_NOT_VERIFIED" },
  { key: "roomFactoryTemplate", blocker: "ROOM_FACTORY_TEMPLATE_NOT_VERIFIED" },
  { key: "paymentOperations", blocker: "PAYMENT_OPERATIONS_NOT_VERIFIED" },
  {
    key: "observabilityIncidentResponse",
    blocker: "OBSERVABILITY_INCIDENT_RESPONSE_NOT_VERIFIED",
  },
  { key: "qaSecurityRegression", blocker: "QA_SECURITY_REGRESSION_NOT_VERIFIED" },
  { key: "previewSmokeTest", blocker: "PREVIEW_SMOKE_TEST_NOT_VERIFIED" },
  { key: "deploymentProtection", blocker: "DEPLOYMENT_PROTECTION_NOT_VERIFIED" },
  { key: "rollbackPath", blocker: "ROLLBACK_PATH_NOT_VERIFIED" },
] as const;

function countrySubdivisions(config: CountryConfig) {
  return [
    ...Object.values(config.states ?? {}),
    ...Object.values(config.provinces ?? {}),
  ];
}

function hasVerifiedSubdivisionIdentity(config: CountryConfig): boolean {
  const entries = [
    ...Object.entries(config.states ?? {}),
    ...Object.entries(config.provinces ?? {}),
  ];

  if (
    entries.some(
      ([code, subdivision]) =>
        code.length === 0 ||
        code !== code.trim() ||
        code !== code.toUpperCase() ||
        !/^[A-Z0-9][A-Z0-9-]{0,15}$/.test(code) ||
        subdivision.name.trim().length === 0,
    )
  ) {
    return false;
  }

  return new Set(entries.map(([code]) => code)).size === entries.length;
}

/**
 * Second-stage country activation gate. Evidence omitted by older callers fails
 * closed, so stacked country branches cannot silently weaken the hardened launch
 * path while remaining source-compatible. Repository localization and first-wave
 * compliance-hook structure are checked independently from human/browser evidence
 * so VERIFIED flags cannot hide missing country wiring.
 *
 * Countries that declare state/province jurisdiction inventories also fail closed
 * until every declared jurisdiction has a canonical, unambiguous identifier and
 * explicit READY tax and compliance review status. Missing optional status fields
 * are unresolved evidence, not approval.
 *
 * Generic VERIFIED flags are not release authority. A launchable result also
 * requires the scoped Hosted-Production release gate from countryLaunchGate.ts,
 * bound to the exact country, release SHA, migration apply-set, Room Factory
 * contract and Hosted operational-data fingerprint. Older two-argument callers
 * remain source-compatible but fail closed until that scoped authority is passed.
 */
export function evaluateCountryOperationalLaunch(
  config: CountryConfig,
  evidence: CountryOperationalEvidence,
  scopedEvidence?: ScopedCountryOperationalEvidence,
  expectedScope?: CountryOperationalReleaseScope,
): CountryOperationalLaunchGate {
  const countryGate = evaluateCountryLaunch(config);
  const localizationStructure = evaluateCountryLocalizationStructure(config);
  const complianceHookStructure = evaluateCountryComplianceHookStructure(config);
  const subdivisions = countrySubdivisions(config);
  const operationalBlockers = OPERATIONAL_REQUIREMENTS
    .filter(({ key }) => evidence[key] !== "VERIFIED")
    .map(({ blocker }) => blocker);

  if (!localizationStructure.ready) {
    operationalBlockers.push("LOCALIZATION_STRUCTURE_NOT_READY");
  }

  if (!complianceHookStructure.ready) {
    operationalBlockers.push("COMPLIANCE_HOOK_STRUCTURE_NOT_READY");
  }

  if (subdivisions.length > 0 && !hasVerifiedSubdivisionIdentity(config)) {
    operationalBlockers.push("SUBDIVISION_IDENTITY_NOT_VERIFIED");
  }

  if (
    subdivisions.length > 0 &&
    subdivisions.some(({ taxStatus }) => taxStatus !== "READY")
  ) {
    operationalBlockers.push("SUBDIVISION_TAX_REVIEW_NOT_VERIFIED");
  }

  if (
    subdivisions.length > 0 &&
    subdivisions.some(({ complianceStatus }) => complianceStatus !== "READY")
  ) {
    operationalBlockers.push("SUBDIVISION_COMPLIANCE_REVIEW_NOT_VERIFIED");
  }

  const scopedReleaseGate =
    scopedEvidence && expectedScope
      ? evaluateScopedCountryOperationalLaunch(config, scopedEvidence, expectedScope)
      : null;

  if (!scopedReleaseGate?.launchable) {
    operationalBlockers.push("SCOPED_RELEASE_AUTHORITY_NOT_VERIFIED");
  }

  return {
    launchable:
      countryGate.launchable &&
      scopedReleaseGate?.launchable === true &&
      operationalBlockers.length === 0,
    countryGate,
    scopedReleaseGate,
    operationalBlockers,
  };
}
