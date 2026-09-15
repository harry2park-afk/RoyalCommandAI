import type { CountryConfig } from "../types/countryConfig";
import { evaluateCountryLaunch, type CountryLaunchGate } from "./countryLaunchGate";

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
  | "REQUIRED_INTEGRATIONS_NOT_VERIFIED"
  | "COMMERCIAL_READINESS_NOT_VERIFIED"
  | "ROOM_FACTORY_TEMPLATE_NOT_VERIFIED"
  | "PAYMENT_OPERATIONS_NOT_VERIFIED"
  | "OBSERVABILITY_INCIDENT_RESPONSE_NOT_VERIFIED"
  | "QA_SECURITY_REGRESSION_NOT_VERIFIED"
  | "PREVIEW_SMOKE_TEST_NOT_VERIFIED"
  | "DEPLOYMENT_PROTECTION_NOT_VERIFIED"
  | "ROLLBACK_PATH_NOT_VERIFIED";

export type CountryOperationalLaunchGate = {
  launchable: boolean;
  countryGate: CountryLaunchGate;
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

/**
 * Second-stage country activation gate. Evidence omitted by older callers fails
 * closed, so stacked country branches cannot silently weaken the hardened launch
 * path while remaining source-compatible.
 */
export function evaluateCountryOperationalLaunch(
  config: CountryConfig,
  evidence: CountryOperationalEvidence,
): CountryOperationalLaunchGate {
  const countryGate = evaluateCountryLaunch(config);
  const operationalBlockers = OPERATIONAL_REQUIREMENTS
    .filter(({ key }) => evidence[key] !== "VERIFIED")
    .map(({ blocker }) => blocker);

  return {
    launchable: countryGate.launchable && operationalBlockers.length === 0,
    countryGate,
    operationalBlockers,
  };
}
