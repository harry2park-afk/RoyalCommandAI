import { describe, expect, it } from "vitest";
import {
  FIRST_WAVE_COUNTRY_CODES,
  type FirstWaveCountryCode,
} from "./firstWaveCountryOperationalAggregation";
import {
  evaluateFirstWavePaymentRuntimeEvidence,
  type FirstWavePaymentRuntimeEvidence,
} from "./firstWavePaymentRuntimeEvidence";

const EXACT_HEAD = "63027b780539da2d4990eb329a2e2751fa4fce99";
const DIFFERENT_HEAD = "33da2a917dc6adcf266f59f0b27d18a56f1271d8";
const PREVIEW_DEPLOYMENT_ID = "vercel-preview-payment-evidence-only";

const currencies: Record<FirstWaveCountryCode, string> = {
  AU: "AUD",
  US: "USD",
  CA: "CAD",
  KR: "KRW",
  JP: "JPY",
  GB: "GBP",
};

function paymentEvidence(countryCode: FirstWaveCountryCode): FirstWavePaymentRuntimeEvidence {
  return {
    countryCode,
    currency: currencies[countryCode],
    providerKey: "sandbox-provider",
    environment: "SANDBOX",
    evidenceId: `payment-runtime-${countryCode.toLowerCase()}`,
    exactHeadSha: EXACT_HEAD,
    capturedAtUtc: "2026-09-11T12:54:00Z",
    previewDeploymentId: PREVIEW_DEPLOYMENT_ID,
    checkoutCreated: "VERIFIED",
    paymentSucceeded: "VERIFIED",
    signedWebhookVerified: "VERIFIED",
    duplicateWebhookRejected: "VERIFIED",
    idempotentRetryVerified: "VERIFIED",
    refundVerified: "VERIFIED",
    cancellationVerified: "VERIFIED",
    reconciliationVerified: "VERIFIED",
    liveModeDisabled: true,
  };
}

function allFirstWavePaymentEvidence(): FirstWavePaymentRuntimeEvidence[] {
  return FIRST_WAVE_COUNTRY_CODES.map(paymentEvidence);
}

describe("first-wave payment runtime evidence", () => {
  it("accepts only complete country-scoped sandbox proof for the exact head and Preview", () => {
    const result = evaluateFirstWavePaymentRuntimeEvidence(
      EXACT_HEAD,
      PREVIEW_DEPLOYMENT_ID,
      allFirstWavePaymentEvidence(),
    );

    expect(result.ready).toBe(true);
    expect(result.aggregationBlockers).toEqual([]);
    expect(result.countries.every(({ evaluated, ready }) => evaluated && ready)).toBe(true);
  });

  it("fails closed when one first-wave country is missing", () => {
    const result = evaluateFirstWavePaymentRuntimeEvidence(
      EXACT_HEAD,
      PREVIEW_DEPLOYMENT_ID,
      allFirstWavePaymentEvidence().filter(({ countryCode }) => countryCode !== "GB"),
    );

    expect(result.aggregationBlockers).toContainEqual({
      code: "PAYMENT_FIRST_WAVE_COUNTRY_MISSING",
      countryCode: "GB",
    });
    expect(result.ready).toBe(false);
  });

  it("rejects duplicate, unsupported and cross-country reused evidence", () => {
    const inputs = allFirstWavePaymentEvidence();
    const sharedId = inputs[0].evidenceId;
    inputs[1] = { ...inputs[1], evidenceId: sharedId };
    inputs.push({ ...paymentEvidence("AU") });
    inputs.push({ ...paymentEvidence("AU"), countryCode: "SG", evidenceId: "payment-runtime-sg" });

    const result = evaluateFirstWavePaymentRuntimeEvidence(
      EXACT_HEAD,
      PREVIEW_DEPLOYMENT_ID,
      inputs,
    );

    expect(result.aggregationBlockers).toEqual(
      expect.arrayContaining([
        { code: "PAYMENT_EVIDENCE_ID_REUSED", evidenceId: sharedId },
        { code: "PAYMENT_FIRST_WAVE_COUNTRY_DUPLICATE", countryCode: "AU" },
        { code: "PAYMENT_FIRST_WAVE_COUNTRY_UNSUPPORTED", countryCode: "SG" },
      ]),
    );
    expect(result.ready).toBe(false);
  });

  it("binds proof to the exact candidate SHA and Preview deployment", () => {
    const inputs = allFirstWavePaymentEvidence().map((item) =>
      item.countryCode === "KR"
        ? {
            ...item,
            exactHeadSha: DIFFERENT_HEAD,
            previewDeploymentId: "different-preview",
          }
        : item,
    );

    const result = evaluateFirstWavePaymentRuntimeEvidence(
      EXACT_HEAD,
      PREVIEW_DEPLOYMENT_ID,
      inputs,
    );
    const kr = result.countries.find(({ countryCode }) => countryCode === "KR");

    expect(kr?.blockers).toEqual(
      expect.arrayContaining([
        "PAYMENT_EVIDENCE_HEAD_SHA_MISMATCH",
        "PAYMENT_PREVIEW_DEPLOYMENT_ID_MISMATCH",
      ]),
    );
    expect(result.ready).toBe(false);
  });

  it("requires local currency, sandbox mode and disabled live processing", () => {
    const inputs = allFirstWavePaymentEvidence().map((item) =>
      item.countryCode === "JP"
        ? {
            ...item,
            currency: "USD",
            environment: "LIVE" as const,
            liveModeDisabled: false,
          }
        : item,
    );

    const result = evaluateFirstWavePaymentRuntimeEvidence(
      EXACT_HEAD,
      PREVIEW_DEPLOYMENT_ID,
      inputs,
    );
    const jp = result.countries.find(({ countryCode }) => countryCode === "JP");

    expect(jp?.blockers).toEqual(
      expect.arrayContaining([
        "PAYMENT_CURRENCY_MISMATCH",
        "PAYMENT_SANDBOX_REQUIRED",
        "PAYMENT_LIVE_MODE_NOT_DISABLED",
      ]),
    );
    expect(result.ready).toBe(false);
  });

  it("does not infer payment readiness from partial happy-path proof", () => {
    const inputs = allFirstWavePaymentEvidence().map((item) =>
      item.countryCode === "US"
        ? {
            ...item,
            checkoutCreated: "NOT_VERIFIED" as const,
            paymentSucceeded: "NOT_VERIFIED" as const,
            signedWebhookVerified: "NOT_VERIFIED" as const,
            duplicateWebhookRejected: "NOT_VERIFIED" as const,
            idempotentRetryVerified: "NOT_VERIFIED" as const,
            refundVerified: "NOT_VERIFIED" as const,
            cancellationVerified: "NOT_VERIFIED" as const,
            reconciliationVerified: "NOT_VERIFIED" as const,
          }
        : item,
    );

    const result = evaluateFirstWavePaymentRuntimeEvidence(
      EXACT_HEAD,
      PREVIEW_DEPLOYMENT_ID,
      inputs,
    );
    const us = result.countries.find(({ countryCode }) => countryCode === "US");

    expect(us?.blockers).toEqual(
      expect.arrayContaining([
        "PAYMENT_CHECKOUT_NOT_VERIFIED",
        "PAYMENT_SUCCESS_NOT_VERIFIED",
        "PAYMENT_SIGNED_WEBHOOK_NOT_VERIFIED",
        "PAYMENT_DUPLICATE_WEBHOOK_REJECTION_NOT_VERIFIED",
        "PAYMENT_IDEMPOTENT_RETRY_NOT_VERIFIED",
        "PAYMENT_REFUND_NOT_VERIFIED",
        "PAYMENT_CANCELLATION_NOT_VERIFIED",
        "PAYMENT_RECONCILIATION_NOT_VERIFIED",
      ]),
    );
    expect(result.ready).toBe(false);
  });

  it("rejects missing IDs, malformed timestamps and invalid commit provenance", () => {
    const inputs = allFirstWavePaymentEvidence().map((item) =>
      item.countryCode === "CA"
        ? {
            ...item,
            evidenceId: " ",
            exactHeadSha: "launch/room-factory-operational-gate-20260907",
            capturedAtUtc: "2026-09-11 12:54:00",
            providerKey: " ",
          }
        : item,
    );

    const result = evaluateFirstWavePaymentRuntimeEvidence(
      EXACT_HEAD,
      PREVIEW_DEPLOYMENT_ID,
      inputs,
    );
    const ca = result.countries.find(({ countryCode }) => countryCode === "CA");

    expect(ca?.blockers).toEqual(
      expect.arrayContaining([
        "PAYMENT_EVIDENCE_ID_MISSING",
        "PAYMENT_EVIDENCE_HEAD_SHA_INVALID",
        "PAYMENT_EVIDENCE_TIMESTAMP_INVALID",
        "PAYMENT_PROVIDER_KEY_MISSING",
      ]),
    );
    expect(result.ready).toBe(false);
  });
});
