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
  roomFactoryTemplates?: OperationalEvidenceStatus;
  roomFactoryWriteAuthority?: OperationalEvidenceStatus;
  tenantIsolation?: OperationalEvidenceStatus;
  customerAccountAuthority?: OperationalEvidenceStatus;
  paymentOperations?: OperationalEvidenceStatus;
  complianceEvidence?: OperationalEvidenceStatus;
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
  | "ROOM_FACTORY_TEMPLATES_NOT_VERIFIED"
  | "ROOM_FACTORY_WRITE_AUTHORITY_NOT_VERIFIED"
  | "TENANT_ISOLATION_NOT_VERIFIED"
  | "CUSTOMER_ACCOUNT_AUTHORITY_NOT_VERIFIED"
  | "PAYMENT_OPERATIONS_NOT_VERIFIED"
  | "COMPLIANCE_EVIDENCE_NOT_VERIFIED";

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
  { key: "roomFactoryTemplates", blocker: "ROOM_FACTORY_TEMPLATES_NOT_VERIFIED" },
  { key: "roomFactoryWriteAuthority", blocker: "ROOM_FACTORY_WRITE_AUTHORITY_NOT_VERIFIED" },
  { key: "tenantIsolation", blocker: "TENANT_ISOLATION_NOT_VERIFIED" },
  { key: "customerAccountAuthority", blocker: "CUSTOMER_ACCOUNT_AUTHORITY_NOT_VERIFIED" },
  { key: "paymentOperations", blocker: "PAYMENT_OPERATIONS_NOT_VERIFIED" },
  { key: "complianceEvidence", blocker: "COMPLIANCE_EVIDENCE_NOT_VERIFIED" },
] as const;

/**
 * Second-stage country activation gate.
 *
 * The existing country launch gate covers configured legal/tax/payment
 * readiness. This gate requires independent operational evidence for the
 * launch-critical runtime path without changing production routing or country
 * activation. Newly added evidence keys are optional at the type boundary so
 * older evidence producers still compile, but missing values fail closed.
 * Every item must be explicitly VERIFIED before a country can be launchable.
 *
 * Room Factory template/runtime proof and Room Factory write-authority proof
 * are deliberately separate. A country must not become launchable merely
 * because templates exist while direct client writes to the manifest surface
 * remain possible. Customer account authority is also independent from broad
 * tenant-isolation evidence so a country cannot launch while authenticated
 * clients retain unsafe direct writes or customer-number allocation is not
 * verified through the controlled account path.
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
