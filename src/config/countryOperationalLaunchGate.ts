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
  { key: "communicationsRules", blocker: "COMMUNICATIONS_RULES_NOT_VERIFIED" },
  { key: "dataResidency", blocker: "DATA_RESIDENCY_NOT_VERIFIED" },
  { key: "localization", blocker: "LOCALIZATION_NOT_VERIFIED" },
  { key: "requiredIntegrations", blocker: "REQUIRED_INTEGRATIONS_NOT_VERIFIED" },
  { key: "previewSmokeTest", blocker: "PREVIEW_SMOKE_TEST_NOT_VERIFIED" },
  { key: "rollbackPath", blocker: "ROLLBACK_PATH_NOT_VERIFIED" },
] as const;

/**
 * Second-stage country activation gate.
 *
 * The existing country launch gate covers legal/tax/payment readiness. This
 * gate adds the operational evidence required by the 100-country onboarding
 * contract without changing any existing production routing or activation.
 * Every item fails closed until evidence is explicitly VERIFIED.
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
