import { describe, expect, it } from "vitest";
import {
  evaluateRecordingPolicy,
  type RecordingPolicyRule,
} from "./recordingPolicy";

const readyCountryRule: RecordingPolicyRule = {
  countryCode: "AU",
  mode: "ALLOW_NO_NOTICE",
  reviewStatus: "READY",
  policyVersion: "test-v1",
};

describe("recording policy gate", () => {
  it("fails closed when no approved jurisdiction policy exists", () => {
    expect(
      evaluateRecordingPolicy({ countryCode: "AU", rules: [] }),
    ).toMatchObject({
      canStartRecording: false,
      reason: "NO_APPROVED_POLICY",
      policyVersion: null,
    });
  });

  it("fails closed while legal review is incomplete", () => {
    expect(
      evaluateRecordingPolicy({
        countryCode: "AU",
        rules: [{ ...readyCountryRule, reviewStatus: "NEEDS_REVIEW" }],
      }),
    ).toMatchObject({
      canStartRecording: false,
      reason: "POLICY_NOT_READY",
    });
  });

  it("does not start notice-required recording before notice is delivered", () => {
    const rule: RecordingPolicyRule = {
      ...readyCountryRule,
      mode: "ALLOW_WITH_NOTICE",
    };

    expect(
      evaluateRecordingPolicy({ countryCode: "AU", rules: [rule] }),
    ).toMatchObject({
      canStartRecording: false,
      requiresNotice: true,
      reason: "NOTICE_REQUIRED",
    });

    expect(
      evaluateRecordingPolicy({
        countryCode: "AU",
        noticeDelivered: true,
        rules: [rule],
      }),
    ).toMatchObject({
      canStartRecording: true,
      reason: "RECORDING_ALLOWED",
    });
  });

  it("requires notice and explicit consent when the approved rule requires both", () => {
    const rule: RecordingPolicyRule = {
      ...readyCountryRule,
      mode: "ALLOW_WITH_EXPLICIT_CONSENT",
    };

    expect(
      evaluateRecordingPolicy({
        countryCode: "AU",
        noticeDelivered: true,
        rules: [rule],
      }),
    ).toMatchObject({
      canStartRecording: false,
      requiresExplicitConsent: true,
      reason: "EXPLICIT_CONSENT_REQUIRED",
    });

    expect(
      evaluateRecordingPolicy({
        countryCode: "AU",
        noticeDelivered: true,
        explicitConsentCaptured: true,
        rules: [rule],
      }),
    ).toMatchObject({
      canStartRecording: true,
      requiresNotice: true,
      requiresExplicitConsent: true,
      reason: "RECORDING_ALLOWED",
    });
  });

  it("uses a matching region rule instead of the country fallback", () => {
    const regionRule: RecordingPolicyRule = {
      countryCode: "AU",
      regionCode: "NSW",
      mode: "BLOCK",
      reviewStatus: "READY",
      policyVersion: "test-nsw-v1",
    };

    expect(
      evaluateRecordingPolicy({
        countryCode: "au",
        regionCode: "nsw",
        rules: [readyCountryRule, regionRule],
      }),
    ).toMatchObject({
      canStartRecording: false,
      reason: "POLICY_BLOCKED",
      matchedRegionCode: "NSW",
      policyVersion: "test-nsw-v1",
    });
  });

  it("fails closed when more than one rule matches the same jurisdiction scope", () => {
    expect(
      evaluateRecordingPolicy({
        countryCode: "AU",
        rules: [readyCountryRule, { ...readyCountryRule, policyVersion: "test-v2" }],
      }),
    ).toMatchObject({
      canStartRecording: false,
      reason: "AMBIGUOUS_POLICY",
    });
  });
});
