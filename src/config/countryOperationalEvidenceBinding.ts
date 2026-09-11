export type CountryOperationalEvidenceEnvelope = {
  countryCode: string;
  exactHeadSha: string;
  evidenceId: string;
  capturedAtUtc: string;
};

export type CountryOperationalEvidenceBindingBlocker =
  | "COUNTRY_EVIDENCE_COUNTRY_MISSING"
  | "COUNTRY_EVIDENCE_COUNTRY_MISMATCH"
  | "COUNTRY_EVIDENCE_HEAD_SHA_INVALID"
  | "COUNTRY_EVIDENCE_ID_MISSING"
  | "COUNTRY_EVIDENCE_CAPTURE_TIME_INVALID";

export type CountryOperationalEvidenceBindingResult = {
  ready: boolean;
  blockers: CountryOperationalEvidenceBindingBlocker[];
};

const EXACT_GIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

/**
 * Validate only the provenance envelope around operational launch evidence.
 *
 * This deliberately does not decide whether the evidence itself is sufficient,
 * legally approved, or safe for Production. It prevents evidence captured for
 * one country or an unidentified source revision from being silently reused as
 * evidence for another country during rollout aggregation.
 */
export function evaluateCountryOperationalEvidenceBinding(
  targetCountryCode: string,
  evidence: CountryOperationalEvidenceEnvelope | null | undefined,
): CountryOperationalEvidenceBindingResult {
  const blockers: CountryOperationalEvidenceBindingBlocker[] = [];
  const target = targetCountryCode.trim().toUpperCase();
  const evidenceCountry = evidence?.countryCode?.trim().toUpperCase() ?? "";

  if (!evidenceCountry) {
    blockers.push("COUNTRY_EVIDENCE_COUNTRY_MISSING");
  } else if (evidenceCountry !== target) {
    blockers.push("COUNTRY_EVIDENCE_COUNTRY_MISMATCH");
  }

  if (!evidence?.exactHeadSha || !EXACT_GIT_SHA_PATTERN.test(evidence.exactHeadSha.trim())) {
    blockers.push("COUNTRY_EVIDENCE_HEAD_SHA_INVALID");
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
