import type { CountryConfig } from "../types/countryConfig";

export type LaunchBlockerCode =
  | "LEGAL_REVIEW"
  | "TAX_REVIEW"
  | "TAX_STRUCTURE_REVIEW"
  | "MEDICAL_REVIEW"
  | "INVESTMENT_REVIEW"
  | "PRIVACY_REVIEW"
  | "PAYMENTS_NOT_CONNECTED"
  | "TAX_NOT_CONNECTED"
  | "COUNTRY_TERMS_NOT_REVIEWED"
  | "LOCAL_PRICE_NOT_READY"
  | "PROVIDER_OFFER_NOT_REVIEWED"
  | "RECORDING_POLICY_NOT_REVIEWED"
  | "PAYMENT_PROVIDER_REGISTRY_NOT_READY"
  | "PAYMENT_EVENT_LEDGER_NOT_READY"
  | "SERVICE_ORDER_IDEMPOTENCY_NOT_READY"
  | "AUTH_DATA_ISOLATION_NOT_VERIFIED"
  | "ROOM_FACTORY_ISOLATION_NOT_VERIFIED"
  | "LINKED_MIGRATION_APPLY_SET_NOT_VERIFIED"
  | "AUTH_RECOVERY_E2E_NOT_VERIFIED"
  | "LOCALIZATION_BROWSER_REGRESSION_NOT_VERIFIED"
  | "SECURITY_REGRESSION_NOT_VERIFIED"
  | "OBSERVABILITY_NOT_READY"
  | "ROLLBACK_NOT_VERIFIED";

export type CountryLaunchGate = {
  launchable: boolean;
  blockers: LaunchBlockerCode[];
};

/**
 * Operational evidence is deliberately separate from CountryConfig.
 *
 * CountryConfig describes reviewed configuration intent. These booleans must
 * come from verified Hosted/runtime evidence so a config-only READY flag can
 * never be mistaken for launch authorization.
 */
export type CountryOperationalEvidence = {
  countryTermsReviewed: boolean;
  positiveLocalPrice: boolean;
  providerOfferReviewed: boolean;
  recordingPolicyReviewed: boolean;
  paymentProviderRegistryReady: boolean;
  paymentEventLedgerReady: boolean;
  serviceOrderIdempotencyReady: boolean;
  authDataIsolationVerified: boolean;
  roomFactoryIsolationVerified: boolean;
  linkedMigrationApplySetVerified: boolean;
  authRecoveryE2EVerified: boolean;
  authenticatedLocalizationBrowserVerified: boolean;
  securityRegressionVerified: boolean;
  observabilityReady: boolean;
  rollbackVerified: boolean;
};

/**
 * Conservative country-launch gate.
 *
 * This does not activate a country or bind a domain. It gives deployment and
 * operations code a single evidence-based answer about whether a configured
 * country has cleared the minimum compliance/payment/tax prerequisites.
 *
 * Country-specific providers can remain implementation details; the public
 * launch decision is based on the reviewed/connected status fields only.
 */
export function evaluateCountryLaunch(config: CountryConfig): CountryLaunchGate {
  const blockers: LaunchBlockerCode[] = [];

  if (config.compliance.legal !== "READY") blockers.push("LEGAL_REVIEW");
  if (config.compliance.tax !== "READY") blockers.push("TAX_REVIEW");
  if (!config.taxStructure || config.taxStructure.status !== "READY") blockers.push("TAX_STRUCTURE_REVIEW");
  if (config.compliance.medical !== "READY") blockers.push("MEDICAL_REVIEW");
  if (config.compliance.investment !== "READY") blockers.push("INVESTMENT_REVIEW");
  if (config.compliance.privacy !== "READY") blockers.push("PRIVACY_REVIEW");
  if (config.payments.status !== "CONNECTED") blockers.push("PAYMENTS_NOT_CONNECTED");
  if (config.tax.status !== "CONNECTED") blockers.push("TAX_NOT_CONNECTED");

  return {
    launchable: blockers.length === 0,
    blockers,
  };
}

/**
 * Final fail-closed launch decision for a configured country.
 *
 * A country can pass configuration review and still remain blocked when
 * commercial/compliance records, payment safeguards, tenant isolation,
 * Room Factory isolation, exact migration evidence, authenticated browser
 * regressions, security checks, observability, or rollback proof have not
 * been verified against the intended Hosted environment. This function has
 * no side effects and grants no deployment or domain-binding authority by
 * itself.
 */
export function evaluateCountryOperationalLaunch(
  config: CountryConfig,
  evidence: CountryOperationalEvidence,
): CountryLaunchGate {
  const blockers: LaunchBlockerCode[] = [...evaluateCountryLaunch(config).blockers];

  if (!evidence.countryTermsReviewed) blockers.push("COUNTRY_TERMS_NOT_REVIEWED");
  if (!evidence.positiveLocalPrice) blockers.push("LOCAL_PRICE_NOT_READY");
  if (!evidence.providerOfferReviewed) blockers.push("PROVIDER_OFFER_NOT_REVIEWED");
  if (!evidence.recordingPolicyReviewed) blockers.push("RECORDING_POLICY_NOT_REVIEWED");
  if (!evidence.paymentProviderRegistryReady) blockers.push("PAYMENT_PROVIDER_REGISTRY_NOT_READY");
  if (!evidence.paymentEventLedgerReady) blockers.push("PAYMENT_EVENT_LEDGER_NOT_READY");
  if (!evidence.serviceOrderIdempotencyReady) blockers.push("SERVICE_ORDER_IDEMPOTENCY_NOT_READY");
  if (!evidence.authDataIsolationVerified) blockers.push("AUTH_DATA_ISOLATION_NOT_VERIFIED");
  if (!evidence.roomFactoryIsolationVerified) blockers.push("ROOM_FACTORY_ISOLATION_NOT_VERIFIED");
  if (!evidence.linkedMigrationApplySetVerified) blockers.push("LINKED_MIGRATION_APPLY_SET_NOT_VERIFIED");
  if (!evidence.authRecoveryE2EVerified) blockers.push("AUTH_RECOVERY_E2E_NOT_VERIFIED");
  if (!evidence.authenticatedLocalizationBrowserVerified) blockers.push("LOCALIZATION_BROWSER_REGRESSION_NOT_VERIFIED");
  if (!evidence.securityRegressionVerified) blockers.push("SECURITY_REGRESSION_NOT_VERIFIED");
  if (!evidence.observabilityReady) blockers.push("OBSERVABILITY_NOT_READY");
  if (!evidence.rollbackVerified) blockers.push("ROLLBACK_NOT_VERIFIED");

  return {
    launchable: blockers.length === 0,
    blockers,
  };
}
