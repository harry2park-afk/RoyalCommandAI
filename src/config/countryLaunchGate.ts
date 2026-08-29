import type { CountryConfig } from "../types/countryConfig";

export type LaunchBlockerCode =
  | "LEGAL_REVIEW"
  | "TAX_REVIEW"
  | "MEDICAL_REVIEW"
  | "INVESTMENT_REVIEW"
  | "PRIVACY_REVIEW"
  | "PAYMENTS_NOT_CONNECTED"
  | "TAX_NOT_CONNECTED";

export type CountryLaunchGate = {
  launchable: boolean;
  blockers: LaunchBlockerCode[];
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
