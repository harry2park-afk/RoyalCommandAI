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
  securityRegression?: OperationalEvidenceStatus;
  deploymentProvenance?: OperationalEvidenceStatus;
  roomFactoryTemplates?: OperationalEvidenceStatus;
  roomFactoryRuntime?: OperationalEvidenceStatus;
  roomFactoryWriteAuthority?: OperationalEvidenceStatus;
  tenantIsolation?: OperationalEvidenceStatus;
  customerAccountAuthority?: OperationalEvidenceStatus;
  countryCommercialCatalog?: OperationalEvidenceStatus;
  commercialReviewAuthority?: OperationalEvidenceStatus;
  recordingReviewAuthority?: OperationalEvidenceStatus;
  paymentCommercialAuthority?: OperationalEvidenceStatus;
  paymentOperations?: OperationalEvidenceStatus;
  paymentProviderSandbox?: OperationalEvidenceStatus;
  legalEvidence?: OperationalEvidenceStatus;
  privacyEvidence?: OperationalEvidenceStatus;
  dataResidencyEvidence?: OperationalEvidenceStatus;
  taxEvidence?: OperationalEvidenceStatus;
  taxStructureEvidence?: OperationalEvidenceStatus;
  complianceReviewAuthority?: OperationalEvidenceStatus;
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
  | "SECURITY_REGRESSION_NOT_VERIFIED"
  | "DEPLOYMENT_PROVENANCE_NOT_VERIFIED"
  | "ROOM_FACTORY_TEMPLATES_NOT_VERIFIED"
  | "ROOM_FACTORY_RUNTIME_NOT_VERIFIED"
  | "ROOM_FACTORY_WRITE_AUTHORITY_NOT_VERIFIED"
  | "TENANT_ISOLATION_NOT_VERIFIED"
  | "CUSTOMER_ACCOUNT_AUTHORITY_NOT_VERIFIED"
  | "COUNTRY_COMMERCIAL_CATALOG_NOT_VERIFIED"
  | "COMMERCIAL_REVIEW_AUTHORITY_NOT_VERIFIED"
  | "RECORDING_REVIEW_AUTHORITY_NOT_VERIFIED"
  | "PAYMENT_COMMERCIAL_AUTHORITY_NOT_VERIFIED"
  | "PAYMENT_OPERATIONS_NOT_VERIFIED"
  | "PAYMENT_PROVIDER_SANDBOX_NOT_VERIFIED"
  | "LEGAL_EVIDENCE_NOT_VERIFIED"
  | "PRIVACY_EVIDENCE_NOT_VERIFIED"
  | "DATA_RESIDENCY_EVIDENCE_NOT_VERIFIED"
  | "TAX_EVIDENCE_NOT_VERIFIED"
  | "TAX_STRUCTURE_EVIDENCE_NOT_VERIFIED"
  | "COMPLIANCE_REVIEW_AUTHORITY_NOT_VERIFIED"
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
  { key: "securityRegression", blocker: "SECURITY_REGRESSION_NOT_VERIFIED" },
  { key: "deploymentProvenance", blocker: "DEPLOYMENT_PROVENANCE_NOT_VERIFIED" },
  { key: "roomFactoryTemplates", blocker: "ROOM_FACTORY_TEMPLATES_NOT_VERIFIED" },
  { key: "roomFactoryRuntime", blocker: "ROOM_FACTORY_RUNTIME_NOT_VERIFIED" },
  { key: "roomFactoryWriteAuthority", blocker: "ROOM_FACTORY_WRITE_AUTHORITY_NOT_VERIFIED" },
  { key: "tenantIsolation", blocker: "TENANT_ISOLATION_NOT_VERIFIED" },
  { key: "customerAccountAuthority", blocker: "CUSTOMER_ACCOUNT_AUTHORITY_NOT_VERIFIED" },
  { key: "countryCommercialCatalog", blocker: "COUNTRY_COMMERCIAL_CATALOG_NOT_VERIFIED" },
  { key: "commercialReviewAuthority", blocker: "COMMERCIAL_REVIEW_AUTHORITY_NOT_VERIFIED" },
  { key: "recordingReviewAuthority", blocker: "RECORDING_REVIEW_AUTHORITY_NOT_VERIFIED" },
  { key: "paymentCommercialAuthority", blocker: "PAYMENT_COMMERCIAL_AUTHORITY_NOT_VERIFIED" },
  { key: "paymentOperations", blocker: "PAYMENT_OPERATIONS_NOT_VERIFIED" },
  { key: "paymentProviderSandbox", blocker: "PAYMENT_PROVIDER_SANDBOX_NOT_VERIFIED" },
  { key: "legalEvidence", blocker: "LEGAL_EVIDENCE_NOT_VERIFIED" },
  { key: "privacyEvidence", blocker: "PRIVACY_EVIDENCE_NOT_VERIFIED" },
  { key: "dataResidencyEvidence", blocker: "DATA_RESIDENCY_EVIDENCE_NOT_VERIFIED" },
  { key: "taxEvidence", blocker: "TAX_EVIDENCE_NOT_VERIFIED" },
  { key: "taxStructureEvidence", blocker: "TAX_STRUCTURE_EVIDENCE_NOT_VERIFIED" },
  { key: "complianceReviewAuthority", blocker: "COMPLIANCE_REVIEW_AUTHORITY_NOT_VERIFIED" },
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
 * Security/regression proof is independent from preview smoke and rollback
 * proof: a country must not become launchable while the exact release candidate
 * lacks verified QA/security regression evidence or while known Hosted security
 * findings remain unreviewed. Deployment provenance is also independent from
 * preview smoke/rollback proof: a country must not become launchable while the
 * Hosted migration ledger contains an unresolved or unreviewed deployment whose
 * exact source cannot be tied to the approved repository history. Room Factory
 * template proof, runtime creation proof, and write-authority proof are
 * deliberately separate. Static templates are not enough: the country must also
 * prove a real non-null encounter-backed manifest with its exact runtime locale
 * through the controlled Room Factory path, and direct client manifest writes
 * must be blocked. Customer account authority is also independent from broad
 * tenant-isolation evidence so a country cannot launch while authenticated
 * clients retain unsafe direct writes or customer-number allocation is not
 * verified through the controlled account path. Country commercial catalog
 * proof is independent from commercial-review authority: a country must have
 * reviewed, available positive-priced terms and provider offers, and the
 * authority/provenance of the human commercial reviewer must itself be
 * independently verified before launch. Recording/consent reviewer authority is
 * independent from general communications-rules evidence: a country must not
 * launch merely because a recording policy row says approved when the human
 * reviewer identity and review chronology have not been independently verified.
 * Payment commercial authority is independent from payment operations so launch
 * cannot proceed while a client can author amount/currency/terms snapshots even
 * if checkout/webhook mechanics are otherwise operational. Payment provider
 * sandbox proof is independent again: disposable schema/idempotency tests are not
 * evidence that a real provider sandbox has passed signed-webhook verification,
 * replay/idempotency rejection, exact amount/currency checks, cancel/refund,
 * settlement/terminal-state handling, observability, and rollback. Legal,
 * privacy, and data-residency evidence are required independently because a
 * generic compliance flag or an operational routing check must not substitute
 * for current reviewer-backed evidence of each launch-critical evidence kind.
 * Tax and tax-structure evidence are independent from static READY flags and
 * provider connectivity: the rollout evidence registry must contain independently
 * reviewed current proof for both evidence kinds before a country can become
 * launchable. Compliance evidence and the authority/provenance of the human
 * compliance reviewer are also independent: a country cannot launch solely
 * because a compliance row says VERIFIED when reviewer identity and review
 * chronology have not themselves been verified.
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
