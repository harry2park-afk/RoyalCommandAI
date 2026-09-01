import type { CountryConfig } from "../types/countryConfig";
import { evaluateCountryLaunch, type CountryLaunchGate } from "./countryLaunchGate";

export type OperationalEvidenceStatus = "VERIFIED" | "NEEDS_REVIEW" | "BLOCKED";

export type CountryOperationalEvidence = {
  domainBinding: OperationalEvidenceStatus;
  authCallback: OperationalEvidenceStatus;
  authRecovery: OperationalEvidenceStatus;
  sessionCookies: OperationalEvidenceStatus;
  communicationsRules: OperationalEvidenceStatus;
  recordingCompliance: OperationalEvidenceStatus;
  dataResidency: OperationalEvidenceStatus;
  tenantIsolation: OperationalEvidenceStatus;
  localization: OperationalEvidenceStatus;
  roomFactoryPersistence: OperationalEvidenceStatus;
  requiredIntegrations: OperationalEvidenceStatus;
  serviceCountryTerms: OperationalEvidenceStatus;
  paymentOperations: OperationalEvidenceStatus;
  previewSmokeTest: OperationalEvidenceStatus;
  deploymentProtection: OperationalEvidenceStatus;
  rollbackPath: OperationalEvidenceStatus;
};

export type CountryOperationalBlockerCode =
  | "DOMAIN_BINDING_NOT_VERIFIED"
  | "AUTH_CALLBACK_NOT_VERIFIED"
  | "AUTH_RECOVERY_NOT_VERIFIED"
  | "SESSION_COOKIES_NOT_VERIFIED"
  | "COMMUNICATIONS_RULES_NOT_VERIFIED"
  | "RECORDING_COMPLIANCE_NOT_VERIFIED"
  | "DATA_RESIDENCY_NOT_VERIFIED"
  | "TENANT_ISOLATION_NOT_VERIFIED"
  | "LOCALIZATION_NOT_VERIFIED"
  | "ROOM_FACTORY_PERSISTENCE_NOT_VERIFIED"
  | "REQUIRED_INTEGRATIONS_NOT_VERIFIED"
  | "SERVICE_COUNTRY_TERMS_NOT_VERIFIED"
  | "PAYMENT_OPERATIONS_NOT_VERIFIED"
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
  { key: "authRecovery", blocker: "AUTH_RECOVERY_NOT_VERIFIED" },
  { key: "sessionCookies", blocker: "SESSION_COOKIES_NOT_VERIFIED" },
  { key: "communicationsRules", blocker: "COMMUNICATIONS_RULES_NOT_VERIFIED" },
  { key: "recordingCompliance", blocker: "RECORDING_COMPLIANCE_NOT_VERIFIED" },
  { key: "dataResidency", blocker: "DATA_RESIDENCY_NOT_VERIFIED" },
  { key: "tenantIsolation", blocker: "TENANT_ISOLATION_NOT_VERIFIED" },
  { key: "localization", blocker: "LOCALIZATION_NOT_VERIFIED" },
  { key: "roomFactoryPersistence", blocker: "ROOM_FACTORY_PERSISTENCE_NOT_VERIFIED" },
  { key: "requiredIntegrations", blocker: "REQUIRED_INTEGRATIONS_NOT_VERIFIED" },
  { key: "serviceCountryTerms", blocker: "SERVICE_COUNTRY_TERMS_NOT_VERIFIED" },
  { key: "paymentOperations", blocker: "PAYMENT_OPERATIONS_NOT_VERIFIED" },
  { key: "previewSmokeTest", blocker: "PREVIEW_SMOKE_TEST_NOT_VERIFIED" },
  { key: "deploymentProtection", blocker: "DEPLOYMENT_PROTECTION_NOT_VERIFIED" },
  { key: "rollbackPath", blocker: "ROLLBACK_PATH_NOT_VERIFIED" },
] as const;

/**
 * Second-stage country activation gate.
 *
 * The existing country launch gate covers static legal/tax/payment readiness.
 * This gate adds runtime operational evidence required by the 100-country
 * onboarding contract without changing any existing production routing or
 * activation. Auth recovery, tenant isolation, atomic Room Factory persistence,
 * country-specific commercial terms, payment lifecycle, recording compliance,
 * and protected release controls are explicit requirements so static
 * CONNECTED/READY flags cannot substitute for tested runtime evidence. Every
 * item fails closed until evidence is explicitly VERIFIED.
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
