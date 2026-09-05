import type { CountryConfig } from "../types/countryConfig";
import { evaluateCountryLaunch, type CountryLaunchGate } from "./countryLaunchGate";

export type OperationalEvidenceStatus = "VERIFIED" | "NEEDS_REVIEW" | "BLOCKED";

export type CountryOperationalEvidence = {
  domainBinding: OperationalEvidenceStatus;
  authCallback: OperationalEvidenceStatus;
  sessionCookies: OperationalEvidenceStatus;
  communicationsRules: OperationalEvidenceStatus;
  dataResidency: OperationalEvidenceStatus;
  localization: OperationalEvidenceStatus;
  requiredIntegrations: OperationalEvidenceStatus;
  previewSmokeTest: OperationalEvidenceStatus;
  rollbackPath: OperationalEvidenceStatus;

  /**
   * Launch-critical evidence added after the original operational gate.
   * These stay optional at the TypeScript boundary so older evidence producers
   * do not break at compile time, but the launch gate treats an omitted value
   * exactly like NEEDS_REVIEW. This lets the gate evolve without ever turning a
   * missing proof into an implicit approval.
   */
  authRecovery?: OperationalEvidenceStatus;
  legalCompliance?: OperationalEvidenceStatus;
  taxCompliance?: OperationalEvidenceStatus;
  privacyCompliance?: OperationalEvidenceStatus;
  tenantIsolation?: OperationalEvidenceStatus;
  consentCapture?: OperationalEvidenceStatus;
  roomFactoryPersistence?: OperationalEvidenceStatus;
  schemaMigrationParity?: OperationalEvidenceStatus;
  serviceCountryTerms?: OperationalEvidenceStatus;
  paymentOperations?: OperationalEvidenceStatus;
  paymentLifecycle?: OperationalEvidenceStatus;
  recordingCompliance?: OperationalEvidenceStatus;
  deploymentProtection?: OperationalEvidenceStatus;
  securityRegression?: OperationalEvidenceStatus;
};

export type CountryOperationalBlockerCode =
  | "DOMAIN_BINDING_NOT_VERIFIED"
  | "AUTH_CALLBACK_NOT_VERIFIED"
  | "AUTH_RECOVERY_NOT_VERIFIED"
  | "SESSION_COOKIES_NOT_VERIFIED"
  | "LEGAL_COMPLIANCE_NOT_VERIFIED"
  | "TAX_COMPLIANCE_NOT_VERIFIED"
  | "PRIVACY_COMPLIANCE_NOT_VERIFIED"
  | "COMMUNICATIONS_RULES_NOT_VERIFIED"
  | "RECORDING_COMPLIANCE_NOT_VERIFIED"
  | "DATA_RESIDENCY_NOT_VERIFIED"
  | "TENANT_ISOLATION_NOT_VERIFIED"
  | "CONSENT_CAPTURE_NOT_VERIFIED"
  | "LOCALIZATION_NOT_VERIFIED"
  | "ROOM_FACTORY_PERSISTENCE_NOT_VERIFIED"
  | "SCHEMA_MIGRATION_PARITY_NOT_VERIFIED"
  | "REQUIRED_INTEGRATIONS_NOT_VERIFIED"
  | "SERVICE_COUNTRY_TERMS_NOT_VERIFIED"
  | "PAYMENT_OPERATIONS_NOT_VERIFIED"
  | "PAYMENT_LIFECYCLE_NOT_VERIFIED"
  | "PREVIEW_SMOKE_TEST_NOT_VERIFIED"
  | "DEPLOYMENT_PROTECTION_NOT_VERIFIED"
  | "SECURITY_REGRESSION_NOT_VERIFIED"
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
  { key: "authRecovery", blocker: "AUTH_RECOVERY_NOT_VERIFIED" },
  { key: "sessionCookies", blocker: "SESSION_COOKIES_NOT_VERIFIED" },
  { key: "legalCompliance", blocker: "LEGAL_COMPLIANCE_NOT_VERIFIED" },
  { key: "taxCompliance", blocker: "TAX_COMPLIANCE_NOT_VERIFIED" },
  { key: "privacyCompliance", blocker: "PRIVACY_COMPLIANCE_NOT_VERIFIED" },
  { key: "communicationsRules", blocker: "COMMUNICATIONS_RULES_NOT_VERIFIED" },
  { key: "recordingCompliance", blocker: "RECORDING_COMPLIANCE_NOT_VERIFIED" },
  { key: "dataResidency", blocker: "DATA_RESIDENCY_NOT_VERIFIED" },
  { key: "tenantIsolation", blocker: "TENANT_ISOLATION_NOT_VERIFIED" },
  { key: "consentCapture", blocker: "CONSENT_CAPTURE_NOT_VERIFIED" },
  { key: "localization", blocker: "LOCALIZATION_NOT_VERIFIED" },
  { key: "roomFactoryPersistence", blocker: "ROOM_FACTORY_PERSISTENCE_NOT_VERIFIED" },
  { key: "schemaMigrationParity", blocker: "SCHEMA_MIGRATION_PARITY_NOT_VERIFIED" },
  { key: "requiredIntegrations", blocker: "REQUIRED_INTEGRATIONS_NOT_VERIFIED" },
  { key: "serviceCountryTerms", blocker: "SERVICE_COUNTRY_TERMS_NOT_VERIFIED" },
  { key: "paymentOperations", blocker: "PAYMENT_OPERATIONS_NOT_VERIFIED" },
  { key: "paymentLifecycle", blocker: "PAYMENT_LIFECYCLE_NOT_VERIFIED" },
  { key: "previewSmokeTest", blocker: "PREVIEW_SMOKE_TEST_NOT_VERIFIED" },
  { key: "deploymentProtection", blocker: "DEPLOYMENT_PROTECTION_NOT_VERIFIED" },
  { key: "securityRegression", blocker: "SECURITY_REGRESSION_NOT_VERIFIED" },
  { key: "rollbackPath", blocker: "ROLLBACK_PATH_NOT_VERIFIED" },
] as const;

/**
 * Second-stage country activation gate.
 *
 * Static CountryConfig READY/CONNECTED flags are necessary but never
 * sufficient for launch. Runtime and hosted evidence must independently prove
 * legal/tax/privacy review, Auth recovery, tenant isolation, consent capture,
 * recording rules, atomic Room Factory persistence, source/hosted schema
 * parity, country commercial terms, payment operations and lifecycle safety,
 * protected deployment controls, and security/regression checks.
 *
 * Every requirement fails closed until it is explicitly VERIFIED.
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
