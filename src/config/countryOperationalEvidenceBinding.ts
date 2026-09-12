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
  | "COUNTRY_EVIDENCE_CAPTURE_TIME_INVALID"
  | "COUNTRY_EVIDENCE_EVALUATION_TIME_INVALID"
  | "COUNTRY_EVIDENCE_STALE"
  | "COUNTRY_EVIDENCE_FROM_FUTURE";

export type CountryOperationalEvidenceBindingResult = {
  ready: boolean;
  blockers: CountryOperationalEvidenceBindingBlocker[];
};

export type CountryBoundOperationalLaunchGate = CountryOperationalLaunchGate & {
  evidenceBinding: CountryOperationalEvidenceBindingResult;
};

const EXACT_GIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const COUNTRY_EVIDENCE_MAX_AGE_MS = 60 * 60 * 1000;
const COUNTRY_EVIDENCE_MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

function isValidUtcTimestamp(value: string): boolean {
  return UTC_TIMESTAMP_PATTERN.test(value) && !Number.isNaN(Date.parse(value));
}

/**
 * Validate only the provenance envelope around operational launch evidence.
 *
 * This deliberately does not decide whether the evidence itself is sufficient,
 * legally approved, or safe for Production. It prevents evidence captured for
 * one country or a different/unidentified source revision from being silently
 * reused during rollout aggregation. When an explicit evaluation clock is
 * supplied by the release path, country operational evidence must also be fresh:
 * older than one hour or more than five minutes in the future fails closed.
 */
export function evaluateCountryOperationalEvidenceBinding(
  targetCountryCode: string,
  expectedExactHeadSha: string,
  evidence: CountryOperationalEvidenceEnvelope | null | undefined,
  evaluatedAtUtc?: string,
): CountryOperationalEvidenceBindingResult {
  const blockers: CountryOperationalEvidenceBindingBlocker[] = [];
  const target = targetCountryCode.trim().toUpperCase();
  const evidenceCountry = evidence?.countryCode?.trim().toUpperCase() ?? "";
  const expectedHead = expectedExactHeadSha.trim();
  const evidenceHead = evidence?.exactHeadSha?.trim() ?? "";
  const expectedHeadValid = EXACT_GIT_SHA_PATTERN.test(expectedHead);
  const evidenceHeadValid = EXACT_GIT_SHA_PATTERN.test(evidenceHead);
  const capturedAtUtc = evidence?.capturedAtUtc?.trim() ?? "";
  const capturedAtValid = isValidUtcTimestamp(capturedAtUtc);

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

  if (!capturedAtValid) {
    blockers.push("COUNTRY_EVIDENCE_CAPTURE_TIME_INVALID");
  }

  if (evaluatedAtUtc !== undefined) {
    const normalizedEvaluationTime = evaluatedAtUtc.trim();
    const evaluationTimeValid = isValidUtcTimestamp(normalizedEvaluationTime);

    if (!evaluationTimeValid) {
      blockers.push("COUNTRY_EVIDENCE_EVALUATION_TIME_INVALID");
    } else if (capturedAtValid) {
      const evaluatedAtMs = Date.parse(normalizedEvaluationTime);
      const capturedAtMs = Date.parse(capturedAtUtc);

      if (evaluatedAtMs - capturedAtMs > COUNTRY_EVIDENCE_MAX_AGE_MS) {
        blockers.push("COUNTRY_EVIDENCE_STALE");
      }

      if (capturedAtMs - evaluatedAtMs > COUNTRY_EVIDENCE_MAX_FUTURE_SKEW_MS) {
        blockers.push("COUNTRY_EVIDENCE_FROM_FUTURE");
      }
    }
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
  evaluatedAtUtc?: string,
): CountryBoundOperationalLaunchGate {
  const operationalGate = evaluateCountryOperationalLaunch(config, evidence);
  const evidenceBinding = evaluateCountryOperationalEvidenceBinding(
    config.countryCode,
    expectedExactHeadSha,
    envelope,
    evaluatedAtUtc,
  );

  return {
    ...operationalGate,
    launchable: operationalGate.launchable && evidenceBinding.ready,
    evidenceBinding,
  };
}
