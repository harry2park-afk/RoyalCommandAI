export type RecordingPolicyMode =
  | "BLOCK"
  | "ALLOW_NO_NOTICE"
  | "ALLOW_WITH_NOTICE"
  | "ALLOW_WITH_EXPLICIT_CONSENT";

export type RecordingPolicyReviewStatus = "READY" | "NEEDS_REVIEW" | "BLOCKED";

export interface RecordingPolicyRule {
  countryCode: string;
  regionCode?: string | null;
  mode: RecordingPolicyMode;
  reviewStatus: RecordingPolicyReviewStatus;
  policyVersion: string;
}

export interface RecordingPolicyInput {
  countryCode: string;
  regionCode?: string | null;
  noticeDelivered?: boolean;
  explicitConsentCaptured?: boolean;
  rules: readonly RecordingPolicyRule[];
}

export type RecordingPolicyReason =
  | "NO_APPROVED_POLICY"
  | "AMBIGUOUS_POLICY"
  | "POLICY_NOT_READY"
  | "POLICY_BLOCKED"
  | "NOTICE_REQUIRED"
  | "EXPLICIT_CONSENT_REQUIRED"
  | "RECORDING_ALLOWED";

export interface RecordingPolicyDecision {
  canStartRecording: boolean;
  requiresNotice: boolean;
  requiresExplicitConsent: boolean;
  reason: RecordingPolicyReason;
  matchedCountryCode: string | null;
  matchedRegionCode: string | null;
  policyVersion: string | null;
}

function normalizeCode(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized || null;
}

function blockedDecision(
  reason: RecordingPolicyReason,
  rule?: RecordingPolicyRule,
): RecordingPolicyDecision {
  return {
    canStartRecording: false,
    requiresNotice:
      rule?.mode === "ALLOW_WITH_NOTICE" || rule?.mode === "ALLOW_WITH_EXPLICIT_CONSENT",
    requiresExplicitConsent: rule?.mode === "ALLOW_WITH_EXPLICIT_CONSENT",
    reason,
    matchedCountryCode: rule ? normalizeCode(rule.countryCode) : null,
    matchedRegionCode: rule ? normalizeCode(rule.regionCode) : null,
    policyVersion: rule?.policyVersion ?? null,
  };
}

/**
 * Evaluates an already legally-reviewed recording policy rule.
 *
 * This module intentionally contains no jurisdiction-specific legal conclusions.
 * Approved country/region rules must be supplied by a separate policy source.
 * Missing, ambiguous, blocked, or unreviewed policy always fails closed.
 */
export function evaluateRecordingPolicy(input: RecordingPolicyInput): RecordingPolicyDecision {
  const countryCode = normalizeCode(input.countryCode);
  const regionCode = normalizeCode(input.regionCode);

  if (!countryCode) {
    return blockedDecision("NO_APPROVED_POLICY");
  }

  const countryMatches = input.rules.filter(
    (rule) => normalizeCode(rule.countryCode) === countryCode && !normalizeCode(rule.regionCode),
  );
  const regionMatches = regionCode
    ? input.rules.filter(
        (rule) =>
          normalizeCode(rule.countryCode) === countryCode && normalizeCode(rule.regionCode) === regionCode,
      )
    : [];

  const matches = regionMatches.length > 0 ? regionMatches : countryMatches;
  if (matches.length === 0) {
    return blockedDecision("NO_APPROVED_POLICY");
  }
  if (matches.length !== 1) {
    return blockedDecision("AMBIGUOUS_POLICY");
  }

  const rule = matches[0];
  if (rule.reviewStatus !== "READY") {
    return blockedDecision(
      rule.reviewStatus === "BLOCKED" ? "POLICY_BLOCKED" : "POLICY_NOT_READY",
      rule,
    );
  }

  if (rule.mode === "BLOCK") {
    return blockedDecision("POLICY_BLOCKED", rule);
  }

  if (rule.mode === "ALLOW_WITH_NOTICE" && !input.noticeDelivered) {
    return blockedDecision("NOTICE_REQUIRED", rule);
  }

  if (rule.mode === "ALLOW_WITH_EXPLICIT_CONSENT") {
    if (!input.noticeDelivered) {
      return blockedDecision("NOTICE_REQUIRED", rule);
    }
    if (!input.explicitConsentCaptured) {
      return blockedDecision("EXPLICIT_CONSENT_REQUIRED", rule);
    }
  }

  return {
    canStartRecording: true,
    requiresNotice:
      rule.mode === "ALLOW_WITH_NOTICE" || rule.mode === "ALLOW_WITH_EXPLICIT_CONSENT",
    requiresExplicitConsent: rule.mode === "ALLOW_WITH_EXPLICIT_CONSENT",
    reason: "RECORDING_ALLOWED",
    matchedCountryCode: countryCode,
    matchedRegionCode: normalizeCode(rule.regionCode),
    policyVersion: rule.policyVersion,
  };
}
