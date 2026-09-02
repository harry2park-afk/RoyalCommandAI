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
   * Launch-critical hardening evidence. These remain optional at the type
   * boundary so older evidence producers do not break at compile time, but
   * the launch gate treats a missing value exactly like NEEDS_REVIEW.
   */
  authRecovery?: OperationalEvidenceStatus;
  tenantIsolation?: OperationalEvidenceStatus;
  consentCapture?: OperationalEvidenceStatus;
  paymentLifecycle?: OperationalEvidenceStatus;
  recordingCompliance?: OperationalEvidenceStatus;
  securityRegression?: OperationalEvidenceStatus;
};

export type CountryOperationalBlockerCode =
  | "DOMAIN_BINDING_NOT_VERIFIED"
  | "AUTH_CALLBACK_NOT_VERIFIED"
  | "SESSION_COOKIES_NOT_VERIFIED"
  | "COMMUNICATIONS_RULES_NOT_VERIFIED"
  | "DATA_RESIDENCY_NOT_VERIFIED"
  | "LOCALIZATION_NOT_VERIFIED"
  | "REQUIRED_INTEGRATIONS_NOT_VERIFIED"
  | "PREVIEW_SMOKE_TEST_NOT_VERIFIED"
  | "ROLLBACK_PATH_NOT_VERIFIED"
  | "AUTH_RECOVERY_NOT_VERIFIED"
  | "TENANT_ISOLATION_NOT_VERIFIED"
  | "CONSENT_CAPTURE_NOT_VERIFIED"
  | "PAYMENT_LIFECYCLE_NOT_VERIFIED"
  | "RECORDING_COMPLIANCE_NOT_VERIFIED"
  | "SECURITY_REGRESSION_NOT_VERIFIED";

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
  { key: "communicationsRules", blocker: "COMMUNICATIONS_RULES_NOT_VERIFIED" },
  { key: "dataResidency", blocker: "DATA_RESIDENCY_NOT_VERIFIED" },
  { key: "localization", blocker: "LOCALIZATION_NOT_VERIFIED" },
  { key: "requiredIntegrations", blocker: "REQUIRED_INTEGRATIONS_NOT_VERIFIED" },
  { key: "previewSmokeTest", blocker: "PREVIEW_SMOKE_TEST_NOT_VERIFIED" },
  { key: "rollbackPath", blocker: "ROLLBACK_PATH_NOT_VERIFIED" },
  { key: "authRecovery", blocker: "AUTH_RECOVERY_NOT_VERIFIED" },
  { key: "tenantIsolation", blocker: "TENANT_ISOLATION_NOT_VERIFIED" },
  { key: "consentCapture", blocker: "CONSENT_CAPTURE_NOT_VERIFIED" },
  { key: "paymentLifecycle", blocker: "PAYMENT_LIFECYCLE_NOT_VERIFIED" },
  { key: "recordingCompliance", blocker: "RECORDING_COMPLIANCE_NOT_VERIFIED" },
  { key: "securityRegression", blocker: "SECURITY_REGRESSION_NOT_VERIFIED" },
] as const;

/**
 * Second-stage country activation gate.
 *
 * The existing country launch gate covers legal/tax/payment configuration.
 * This gate adds the operational evidence required by the 100-country
 * onboarding contract without changing any existing production routing or
 * activation. Every item fails closed until evidence is explicitly VERIFIED.
 *
 * In particular, a country cannot become launchable solely because provider
 * status fields were flipped to READY/CONNECTED: Auth recovery, tenant
 * isolation, consent capture, payment lifecycle behavior, recording rules and
 * security/regression evidence must also be verified independently.
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
