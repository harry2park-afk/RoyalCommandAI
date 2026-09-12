import {
  FIRST_WAVE_COUNTRY_CODES,
  type FirstWaveCountryCode,
} from "./firstWaveCountryOperationalAggregation";

export type PaymentRuntimeVerificationState = "VERIFIED" | "NOT_VERIFIED";

export const PAYMENT_RUNTIME_EVIDENCE_MAX_AGE_MINUTES = 60;
export const PAYMENT_RUNTIME_EVIDENCE_MAX_FUTURE_SKEW_MINUTES = 5;

export type FirstWavePaymentRuntimeEvidence = {
  countryCode: string;
  currency: string;
  providerKey: string;
  environment: "SANDBOX" | "LIVE";
  evidenceId: string;
  exactHeadSha: string;
  capturedAtUtc: string;
  previewDeploymentId: string;
  checkoutCreated: PaymentRuntimeVerificationState;
  paymentSucceeded: PaymentRuntimeVerificationState;
  signedWebhookVerified: PaymentRuntimeVerificationState;
  duplicateWebhookRejected: PaymentRuntimeVerificationState;
  idempotentRetryVerified: PaymentRuntimeVerificationState;
  refundVerified: PaymentRuntimeVerificationState;
  cancellationVerified: PaymentRuntimeVerificationState;
  reconciliationVerified: PaymentRuntimeVerificationState;
  liveModeDisabled: boolean;
};

export type FirstWavePaymentRuntimeCountryBlocker =
  | "PAYMENT_EVIDENCE_ID_MISSING"
  | "PAYMENT_EVIDENCE_HEAD_SHA_INVALID"
  | "PAYMENT_EVIDENCE_HEAD_SHA_MISMATCH"
  | "PAYMENT_EVIDENCE_TIMESTAMP_INVALID"
  | "PAYMENT_EVIDENCE_EVALUATION_TIMESTAMP_INVALID"
  | "PAYMENT_EVIDENCE_STALE"
  | "PAYMENT_EVIDENCE_FROM_FUTURE"
  | "PAYMENT_PREVIEW_DEPLOYMENT_ID_MISMATCH"
  | "PAYMENT_PROVIDER_KEY_MISSING"
  | "PAYMENT_SANDBOX_REQUIRED"
  | "PAYMENT_CURRENCY_MISMATCH"
  | "PAYMENT_CHECKOUT_NOT_VERIFIED"
  | "PAYMENT_SUCCESS_NOT_VERIFIED"
  | "PAYMENT_SIGNED_WEBHOOK_NOT_VERIFIED"
  | "PAYMENT_DUPLICATE_WEBHOOK_REJECTION_NOT_VERIFIED"
  | "PAYMENT_IDEMPOTENT_RETRY_NOT_VERIFIED"
  | "PAYMENT_REFUND_NOT_VERIFIED"
  | "PAYMENT_CANCELLATION_NOT_VERIFIED"
  | "PAYMENT_RECONCILIATION_NOT_VERIFIED"
  | "PAYMENT_LIVE_MODE_NOT_DISABLED";

export type FirstWavePaymentRuntimeAggregationBlocker =
  | { code: "PAYMENT_FIRST_WAVE_COUNTRY_MISSING"; countryCode: FirstWaveCountryCode }
  | { code: "PAYMENT_FIRST_WAVE_COUNTRY_DUPLICATE"; countryCode: FirstWaveCountryCode }
  | { code: "PAYMENT_FIRST_WAVE_COUNTRY_UNSUPPORTED"; countryCode: string }
  | { code: "PAYMENT_EVIDENCE_ID_REUSED"; evidenceId: string };

export type FirstWavePaymentRuntimeCountryResult = {
  countryCode: FirstWaveCountryCode;
  evaluated: boolean;
  ready: boolean;
  blockers: FirstWavePaymentRuntimeCountryBlocker[];
};

export type FirstWavePaymentRuntimeEvidenceGate = {
  ready: boolean;
  candidateSha: string;
  previewDeploymentId: string;
  aggregationBlockers: FirstWavePaymentRuntimeAggregationBlocker[];
  countries: FirstWavePaymentRuntimeCountryResult[];
};

const EXACT_SHA_PATTERN = /^[0-9a-f]{40}$/i;
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const FIRST_WAVE_COUNTRY_SET = new Set<string>(FIRST_WAVE_COUNTRY_CODES);
const FIRST_WAVE_CURRENCY: Record<FirstWaveCountryCode, string> = {
  AU: "AUD",
  US: "USD",
  CA: "CAD",
  KR: "KRW",
  JP: "JPY",
  GB: "GBP",
};

function parseUtcTimestamp(value: string): number | null {
  const trimmed = value.trim();
  if (!UTC_TIMESTAMP_PATTERN.test(trimmed)) {
    return null;
  }

  const timestamp = Date.parse(trimmed);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function evaluateCountryPaymentEvidence(
  countryCode: FirstWaveCountryCode,
  expectedExactHeadSha: string,
  expectedPreviewDeploymentId: string,
  evidence: FirstWavePaymentRuntimeEvidence,
  evaluatedAtUtc: string,
  maxAgeMinutes: number,
  maxFutureSkewMinutes: number,
): FirstWavePaymentRuntimeCountryBlocker[] {
  const blockers: FirstWavePaymentRuntimeCountryBlocker[] = [];
  const evidenceHead = evidence.exactHeadSha.trim();
  const expectedHead = expectedExactHeadSha.trim();

  if (!evidence.evidenceId.trim()) {
    blockers.push("PAYMENT_EVIDENCE_ID_MISSING");
  }

  if (!EXACT_SHA_PATTERN.test(evidenceHead)) {
    blockers.push("PAYMENT_EVIDENCE_HEAD_SHA_INVALID");
  } else if (EXACT_SHA_PATTERN.test(expectedHead) && evidenceHead.toLowerCase() !== expectedHead.toLowerCase()) {
    blockers.push("PAYMENT_EVIDENCE_HEAD_SHA_MISMATCH");
  }

  const capturedAt = parseUtcTimestamp(evidence.capturedAtUtc);
  if (capturedAt === null) {
    blockers.push("PAYMENT_EVIDENCE_TIMESTAMP_INVALID");
  }

  const evaluatedAt = parseUtcTimestamp(evaluatedAtUtc);
  if (evaluatedAt === null) {
    blockers.push("PAYMENT_EVIDENCE_EVALUATION_TIMESTAMP_INVALID");
  }

  if (capturedAt !== null && evaluatedAt !== null) {
    const ageMinutes = (evaluatedAt - capturedAt) / 60_000;
    if (ageMinutes > maxAgeMinutes) {
      blockers.push("PAYMENT_EVIDENCE_STALE");
    }
    if (ageMinutes < -maxFutureSkewMinutes) {
      blockers.push("PAYMENT_EVIDENCE_FROM_FUTURE");
    }
  }

  if (
    !expectedPreviewDeploymentId.trim() ||
    !evidence.previewDeploymentId.trim() ||
    evidence.previewDeploymentId.trim() !== expectedPreviewDeploymentId.trim()
  ) {
    blockers.push("PAYMENT_PREVIEW_DEPLOYMENT_ID_MISMATCH");
  }

  if (!evidence.providerKey.trim()) {
    blockers.push("PAYMENT_PROVIDER_KEY_MISSING");
  }

  if (evidence.environment !== "SANDBOX") {
    blockers.push("PAYMENT_SANDBOX_REQUIRED");
  }

  if (evidence.currency.trim().toUpperCase() !== FIRST_WAVE_CURRENCY[countryCode]) {
    blockers.push("PAYMENT_CURRENCY_MISMATCH");
  }

  if (evidence.checkoutCreated !== "VERIFIED") {
    blockers.push("PAYMENT_CHECKOUT_NOT_VERIFIED");
  }
  if (evidence.paymentSucceeded !== "VERIFIED") {
    blockers.push("PAYMENT_SUCCESS_NOT_VERIFIED");
  }
  if (evidence.signedWebhookVerified !== "VERIFIED") {
    blockers.push("PAYMENT_SIGNED_WEBHOOK_NOT_VERIFIED");
  }
  if (evidence.duplicateWebhookRejected !== "VERIFIED") {
    blockers.push("PAYMENT_DUPLICATE_WEBHOOK_REJECTION_NOT_VERIFIED");
  }
  if (evidence.idempotentRetryVerified !== "VERIFIED") {
    blockers.push("PAYMENT_IDEMPOTENT_RETRY_NOT_VERIFIED");
  }
  if (evidence.refundVerified !== "VERIFIED") {
    blockers.push("PAYMENT_REFUND_NOT_VERIFIED");
  }
  if (evidence.cancellationVerified !== "VERIFIED") {
    blockers.push("PAYMENT_CANCELLATION_NOT_VERIFIED");
  }
  if (evidence.reconciliationVerified !== "VERIFIED") {
    blockers.push("PAYMENT_RECONCILIATION_NOT_VERIFIED");
  }
  if (!evidence.liveModeDisabled) {
    blockers.push("PAYMENT_LIVE_MODE_NOT_DISABLED");
  }

  return blockers;
}

/**
 * Bind first-wave payment runtime proof to the exact country, candidate SHA and
 * Preview deployment before it can be consumed by release tooling.
 *
 * Payment-provider state can drift independently of an immutable Preview SHA,
 * so evidence must also be recent. By default, proof older than 60 minutes or
 * more than five minutes in the future fails closed.
 *
 * This is evidence validation only. It never creates a checkout, calls a payment
 * provider, enables live mode, mutates Hosted Supabase, activates a country, or
 * grants Production approval. Evidence must come from sandbox execution, and
 * AU/US/CA/KR/JP/GB must each be proven independently.
 */
export function evaluateFirstWavePaymentRuntimeEvidence(
  expectedExactHeadSha: string,
  expectedPreviewDeploymentId: string,
  inputs: readonly FirstWavePaymentRuntimeEvidence[],
  evaluatedAtUtc = new Date().toISOString(),
  maxAgeMinutes = PAYMENT_RUNTIME_EVIDENCE_MAX_AGE_MINUTES,
  maxFutureSkewMinutes = PAYMENT_RUNTIME_EVIDENCE_MAX_FUTURE_SKEW_MINUTES,
): FirstWavePaymentRuntimeEvidenceGate {
  const candidateSha = expectedExactHeadSha.trim();
  const previewDeploymentId = expectedPreviewDeploymentId.trim();
  const aggregationBlockers: FirstWavePaymentRuntimeAggregationBlocker[] = [];
  const byCountry = new Map<FirstWaveCountryCode, FirstWavePaymentRuntimeEvidence>();
  const evidenceIds = new Map<string, FirstWaveCountryCode>();

  for (const input of inputs) {
    const countryCode = input.countryCode.trim().toUpperCase();
    if (!FIRST_WAVE_COUNTRY_SET.has(countryCode)) {
      aggregationBlockers.push({ code: "PAYMENT_FIRST_WAVE_COUNTRY_UNSUPPORTED", countryCode });
      continue;
    }

    const firstWaveCountryCode = countryCode as FirstWaveCountryCode;
    if (byCountry.has(firstWaveCountryCode)) {
      aggregationBlockers.push({
        code: "PAYMENT_FIRST_WAVE_COUNTRY_DUPLICATE",
        countryCode: firstWaveCountryCode,
      });
      continue;
    }

    byCountry.set(firstWaveCountryCode, input);

    const evidenceId = input.evidenceId.trim();
    if (evidenceId) {
      const priorCountry = evidenceIds.get(evidenceId);
      if (priorCountry && priorCountry !== firstWaveCountryCode) {
        aggregationBlockers.push({ code: "PAYMENT_EVIDENCE_ID_REUSED", evidenceId });
      } else {
        evidenceIds.set(evidenceId, firstWaveCountryCode);
      }
    }
  }

  const countries = FIRST_WAVE_COUNTRY_CODES.map((countryCode) => {
    const evidence = byCountry.get(countryCode);
    if (!evidence) {
      aggregationBlockers.push({ code: "PAYMENT_FIRST_WAVE_COUNTRY_MISSING", countryCode });
      return {
        countryCode,
        evaluated: false,
        ready: false,
        blockers: [] as FirstWavePaymentRuntimeCountryBlocker[],
      };
    }

    const blockers = evaluateCountryPaymentEvidence(
      countryCode,
      candidateSha,
      previewDeploymentId,
      evidence,
      evaluatedAtUtc,
      maxAgeMinutes,
      maxFutureSkewMinutes,
    );

    return {
      countryCode,
      evaluated: true,
      ready: blockers.length === 0,
      blockers,
    };
  });

  return {
    ready:
      EXACT_SHA_PATTERN.test(candidateSha) &&
      previewDeploymentId.length > 0 &&
      aggregationBlockers.length === 0 &&
      countries.every(({ ready }) => ready),
    candidateSha,
    previewDeploymentId,
    aggregationBlockers,
    countries,
  };
}
