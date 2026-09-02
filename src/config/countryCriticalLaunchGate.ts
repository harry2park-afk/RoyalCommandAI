import type { CountryConfig } from "../types/countryConfig";
import {
  evaluateCountryOperationalLaunch,
  type CountryOperationalEvidence,
  type CountryOperationalLaunchGate,
  type OperationalEvidenceStatus,
} from "./countryOperationalLaunchGate";

export type CountryCriticalLaunchEvidence = {
  roomFactoryTemplate: OperationalEvidenceStatus;
  tenantIsolation: OperationalEvidenceStatus;
  authRecovery: OperationalEvidenceStatus;
  legalComplianceEvidence: OperationalEvidenceStatus;
  commercialTermsPricing: OperationalEvidenceStatus;
  paymentOperations: OperationalEvidenceStatus;
  qaSecurityRegression: OperationalEvidenceStatus;
  protectedDeployment: OperationalEvidenceStatus;
};

export type CountryCriticalLaunchBlockerCode =
  | "ROOM_FACTORY_TEMPLATE_NOT_VERIFIED"
  | "TENANT_ISOLATION_NOT_VERIFIED"
  | "AUTH_RECOVERY_NOT_VERIFIED"
  | "LEGAL_COMPLIANCE_EVIDENCE_NOT_VERIFIED"
  | "COMMERCIAL_TERMS_PRICING_NOT_VERIFIED"
  | "PAYMENT_OPERATIONS_NOT_VERIFIED"
  | "QA_SECURITY_REGRESSION_NOT_VERIFIED"
  | "PROTECTED_DEPLOYMENT_NOT_VERIFIED";

export type CountryCriticalLaunchGate = {
  launchable: boolean;
  operationalGate: CountryOperationalLaunchGate;
  criticalBlockers: CountryCriticalLaunchBlockerCode[];
};

const CRITICAL_REQUIREMENTS: ReadonlyArray<{
  key: keyof CountryCriticalLaunchEvidence;
  blocker: CountryCriticalLaunchBlockerCode;
}> = [
  { key: "roomFactoryTemplate", blocker: "ROOM_FACTORY_TEMPLATE_NOT_VERIFIED" },
  { key: "tenantIsolation", blocker: "TENANT_ISOLATION_NOT_VERIFIED" },
  { key: "authRecovery", blocker: "AUTH_RECOVERY_NOT_VERIFIED" },
  { key: "legalComplianceEvidence", blocker: "LEGAL_COMPLIANCE_EVIDENCE_NOT_VERIFIED" },
  { key: "commercialTermsPricing", blocker: "COMMERCIAL_TERMS_PRICING_NOT_VERIFIED" },
  { key: "paymentOperations", blocker: "PAYMENT_OPERATIONS_NOT_VERIFIED" },
  { key: "qaSecurityRegression", blocker: "QA_SECURITY_REGRESSION_NOT_VERIFIED" },
  { key: "protectedDeployment", blocker: "PROTECTED_DEPLOYMENT_NOT_VERIFIED" },
] as const;

/**
 * Final fail-closed launch gate for country rollout.
 *
 * The existing country and operational gates intentionally remain unchanged.
 * This additional gate covers launch-critical evidence that must not be inferred
 * from static country configuration alone: Room Factory/template readiness,
 * tenant isolation, auth recovery, reviewed legal/compliance evidence,
 * commercial terms/pricing, payment operations, QA/security regression, and a
 * protected deployment path.
 *
 * This function does not activate a country, mutate data, or deploy anything.
 * Every critical requirement must be explicitly VERIFIED.
 */
export function evaluateCountryCriticalLaunch(
  config: CountryConfig,
  operationalEvidence: CountryOperationalEvidence,
  criticalEvidence: CountryCriticalLaunchEvidence,
): CountryCriticalLaunchGate {
  const operationalGate = evaluateCountryOperationalLaunch(config, operationalEvidence);
  const criticalBlockers = CRITICAL_REQUIREMENTS
    .filter(({ key }) => criticalEvidence[key] !== "VERIFIED")
    .map(({ blocker }) => blocker);

  return {
    launchable: operationalGate.launchable && criticalBlockers.length === 0,
    operationalGate,
    criticalBlockers,
  };
}
