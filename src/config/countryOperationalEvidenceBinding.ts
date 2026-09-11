import type { CountryConfig } from "../types/countryConfig";
import {
  evaluateCountryOperationalLaunch,
  type CountryOperationalEvidence,
  type CountryOperationalLaunchGate,
} from "./countryOperationalLaunchGate";

export type CountryOperationalEvidenceEnvelope = {
  countryCode: string;
  exactHeadSha: string;
  evidenceId: string;
  capturedAtUtc: string;
};

export type CountryOperationalEvidenceBindingBlocker =
  | "COUNTRY_EVIDENCE_COUNTRY_MISSING"
  | "COUNTRY_EVIDENCE_COUNTRY_MISMATCH"
  | "COUNTRY_EVIDENCE_EXPECTED_HEAD_SHA_INVALID"
  | "COUNTRY_EVIDENCE_HEAD_SHA_INVALID"
  | "COUNTRY_EVIDENCE_HEAD_SHA_MISMATCH"
  | "COUNTRY_EVIDENCE_ID_MISSING"
  | "COUNTRY_EVIDENCE_CAPTURE_TIME_INVALID";

export type CountryOperationalEvidenceBindingResult = {
  ready: boolean;
  blockers: CountryOperationalEvidenceBindingBlocker[];
};

export type CountryBoundOperationalLaunchGate = CountryOperationalLaunchGate & {
  evidenceBinding: CountryOperationalEvidenceBindingResult;
};

const EXACT_GIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

/**
 * Validate only the provenance envelope around operational launch evidence.
 *
 * This deliberately does not decide whether the evidence itself is sufficient,
 * legally approved, or safe for Production. It prevents evidence captured for
 * one country or a different/unidentified source revision from being silently
 * reused during rollout aggregation.
 */
export function evaluateCountryOperationalEvidenceBinding(
  targetCountryCode: string,
  expectedExactHeadSha: string,
  evidence: CountryOperationalEvidenceEnvelope | null | undefined,
): CountryOperationalEvidenceBindingResult {
  const blockers: CountryOperationalEvidenceBindingBlocker[] = [];
  const target = targetCountryCode.trim().toUpperCase();
  const evidenceCountry = evidence?.countryCode?.trim().toUpperCase() ?? "";
  const expectedHead = expectedExactHeadSha.trim();
  const evidenceHead = evidence?.exactHeadSha?.trim() ?? "";
  const expectedHeadValid = EXACT_GIT_SHA_PATTERN.test(expectedHead);
  const evidenceHeadValid = EXACT_GIT_SHA_PATTERN.test(evidenceHead);

  if (!evidenceCountry) {
    blockers.push("COUNTRY_EVIDENCE_COUNTRY_MISSING");
  } else if (evidenceCountry !== target) {
    blockers.push("COUNTRY_EVIDENCE_COUNTRY_MISMATCH");
  }

  if (!expectedHeadValid) {
    blockers.push("COUNTRY_EVIDENCE_EXPECTED_HEAD_SHA_INVALID");
  }

  if (!evidenceHeadValid) {
    blockers.push("COUNTRY_EVIDENCE_HEAD_SHA_INVALID");
  } else if (expectedHeadValid && evidenceHead.toLowerCase() !== expectedHead.toLowerCase()) {
    blockers.push("COUNTRY_EVIDENCE_HEAD_SHA_MISMATCH");
  }

  if (!evidence?.evidenceId?.trim()) {
    blockers.push("COUNTRY_EVIDENCE_ID_MISSING");
  }

  if (
    !evidence?.capturedAtUtc ||
    !UTC_TIMESTAMP_PATTERN.test(evidence.capturedAtUtc) ||
    Number.isNaN(Date.parse(evidence.capturedAtUtc))
  ) {
    blockers.push("COUNTRY_EVIDENCE_CAPTURE_TIME_INVALID");
  }

  return {
    ready: blockers.length === 0,
    blockers,
  };
}

/**
 * Country-bound launch evaluator for rollout aggregation.
 *
 * The existing operational gate remains unchanged for source compatibility.
 * New launch aggregation should use this wrapper so otherwise-valid evidence
 * cannot authorize a different country or a different source revision. A valid
 * envelope is provenance only; all country, legal, operational, payment, QA and
 * deployment gates must still pass independently.
 */
export function evaluateCountryBoundOperationalLaunch(
  config: CountryConfig,
  evidence: CountryOperationalEvidence,
  expectedExactHeadSha: string,
  envelope: CountryOperationalEvidenceEnvelope | null | undefined,
): CountryBoundOperationalLaunchGate {
  const operationalGate = evaluateCountryOperationalLaunch(config, evidence);
  const evidenceBinding = evaluateCountryOperationalEvidenceBinding(
    config.countryCode,
    expectedExactHeadSha,
    envelope,
  );

  return {
    ...operationalGate,
    launchable: operationalGate.launchable && evidenceBinding.ready,
    evidenceBinding,
  };
}
