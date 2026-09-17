import { describe, expect, it } from "vitest";
import type { CountryConfig } from "../types/countryConfig";
import { getCountryConfigByCountryCode } from "./countryResolver";
import {
  evaluateCountryBoundOperationalLaunch,
  evaluateCountryOperationalEvidenceBinding,
  type CountryOperationalEvidenceEnvelope,
} from "./countryOperationalEvidenceBinding";
import type { CountryOperationalEvidence } from "./countryOperationalLaunchGate";

const FIRST_WAVE = ["AU", "US", "CA", "KR", "JP", "GB"] as const;
const EXACT_HEAD = "fa398d701d8059df403f581d6c646e769dc23e65";
const DIFFERENT_VALID_HEAD = "33da2a917dc6adcf266f59f0b27d18a56f1271d8";
const EVALUATED_AT = "2026-09-11T07:10:00Z";

const verifiedOperationalEvidence: CountryOperationalEvidence = {
  domainBinding: "VERIFIED",
  authCallback: "VERIFIED",
  sessionCookies: "VERIFIED",
  authRecoveryEvidence: "VERIFIED",
  databaseMigrationSafety: "VERIFIED",
  tenantDataIsolation: "VERIFIED",
  matterOwnershipAssignmentAuthority: "VERIFIED",
  authorizationRoleAuthority: "VERIFIED",
  communicationsRules: "VERIFIED",
  recordingConsentEvidence: "VERIFIED",
  legalComplianceEvidence: "VERIFIED",
  privacyLifecycleEvidence: "VERIFIED",
  dataResidency: "VERIFIED",
  localization: "VERIFIED",
  requiredIntegrations: "VERIFIED",
  commercialReadiness: "VERIFIED",
  roomFactoryTemplate: "VERIFIED",
  paymentOperations: "VERIFIED",
  observabilityIncidentResponse: "VERIFIED",
  qaSecurityRegression: "VERIFIED",
  previewSmokeTest: "VERIFIED",
  deploymentProtection: "VERIFIED",
  rollbackPath: "VERIFIED",
};

function envelope(
  countryCode: string,
  exactHeadSha = EXACT_HEAD,
): CountryOperationalEvidenceEnvelope {
  return {
    countryCode,
    exactHeadSha,
    evidenceId: `october-launch-${countryCode.toLowerCase()}-evidence`,
    capturedAtUtc: "2026-09-11T06:55:00Z",
  };
}

function makeCountryGateReady(config: CountryConfig): CountryConfig {
  return {
    ...config,
    compliance: {
      legal: "READY",
      tax: "READY",
      medical: "READY",
      investment: "READY",
      privacy: "READY",
    },
    taxStructure: config.taxStructure
      ? { ...config.taxStructure, status: "READY" }
      : { system: "verified-for-test", status: "READY" },
    payments: { ...config.payments, status: "CONNECTED" },
    tax: { ...config.tax, status: "CONNECTED" },
  };
}

describe("country operational evidence binding", () => {
  it("accepts a complete exact-head envelope only for its own first-wave country", () => {
    for (const countryCode of FIRST_WAVE) {
      expect(
        evaluateCountryOperationalEvidenceBinding(countryCode, EXACT_HEAD, envelope(countryCode)),
      ).toEqual({
        ready: true,
        blockers: [],
      });
    }
  });

  it("accepts fresh exact-head evidence when an explicit release clock is supplied", () => {
    expect(
      evaluateCountryOperationalEvidenceBinding("AU", EXACT_HEAD, envelope("AU"), EVALUATED_AT),
    ).toEqual({ ready: true, blockers: [] });
  });

  it("fails closed when country operational evidence is older than one hour", () => {
    expect(
      evaluateCountryOperationalEvidenceBinding(
        "AU",
        EXACT_HEAD,
        { ...envelope("AU"), capturedAtUtc: "2026-09-11T06:09:59Z" },
        EVALUATED_AT,
      ),
    ).toEqual({ ready: false, blockers: ["COUNTRY_EVIDENCE_STALE"] });
  });

  it("fails closed when country operational evidence is more than five minutes in the future", () => {
    expect(
      evaluateCountryOperationalEvidenceBinding(
        "AU",
        EXACT_HEAD,
        { ...envelope("AU"), capturedAtUtc: "2026-09-11T07:15:01Z" },
        EVALUATED_AT,
      ),
    ).toEqual({ ready: false, blockers: ["COUNTRY_EVIDENCE_FROM_FUTURE"] });
  });

  it("fails closed when the explicit release evaluation clock is invalid", () => {
    expect(
      evaluateCountryOperationalEvidenceBinding(
        "AU",
        EXACT_HEAD,
        envelope("AU"),
        "2026-09-11T17:10:00+10:00",
      ),
    ).toEqual({ ready: false, blockers: ["COUNTRY_EVIDENCE_EVALUATION_TIME_INVALID"] });
  });

  it("rejects cross-country evidence reuse", () => {
    expect(evaluateCountryOperationalEvidenceBinding("US", EXACT_HEAD, envelope("AU"))).toEqual({
      ready: false,
      blockers: ["COUNTRY_EVIDENCE_COUNTRY_MISMATCH"],
    });
  });

  it("rejects evidence from a different valid commit SHA", () => {
    expect(
      evaluateCountryOperationalEvidenceBinding(
        "AU",
        EXACT_HEAD,
        envelope("AU", DIFFERENT_VALID_HEAD),
      ),
    ).toEqual({
      ready: false,
      blockers: ["COUNTRY_EVIDENCE_HEAD_SHA_MISMATCH"],
    });
  });

  it("fails closed when the evidence envelope is missing", () => {
    expect(evaluateCountryOperationalEvidenceBinding("AU", EXACT_HEAD, null)).toEqual({
      ready: false,
      blockers: [
        "COUNTRY_EVIDENCE_COUNTRY_MISSING",
        "COUNTRY_EVIDENCE_HEAD_SHA_INVALID",
        "COUNTRY_EVIDENCE_ID_MISSING",
        "COUNTRY_EVIDENCE_CAPTURE_TIME_INVALID",
      ],
    });
  });

  it("rejects an invalid expected head even when the evidence head is well formed", () => {
    expect(
      evaluateCountryOperationalEvidenceBinding(
        "AU",
        "launch/room-factory-operational-gate-20260907",
        envelope("AU"),
      ),
    ).toEqual({
      ready: false,
      blockers: ["COUNTRY_EVIDENCE_EXPECTED_HEAD_SHA_INVALID"],
    });
  });

  it("rejects branch labels, empty evidence ids and timestamps without explicit UTC", () => {
    expect(
      evaluateCountryOperationalEvidenceBinding("AU", EXACT_HEAD, {
        countryCode: "AU",
        exactHeadSha: "launch/room-factory-operational-gate-20260907",
        evidenceId: " ",
        capturedAtUtc: "2026-09-11T16:55:00+10:00",
      }),
    ).toEqual({
      ready: false,
      blockers: [
        "COUNTRY_EVIDENCE_HEAD_SHA_INVALID",
        "COUNTRY_EVIDENCE_ID_MISSING",
        "COUNTRY_EVIDENCE_CAPTURE_TIME_INVALID",
      ],
    });
  });

  it("prevents otherwise launchable AU evidence from being reused for US", () => {
    const us = getCountryConfigByCountryCode("US");
    expect(us).not.toBeNull();

    const gate = evaluateCountryBoundOperationalLaunch(
      makeCountryGateReady(us!),
      verifiedOperationalEvidence,
      EXACT_HEAD,
      envelope("AU"),
    );

    expect(gate.countryGate.launchable).toBe(true);
    expect(gate.operationalBlockers).toEqual([]);
    expect(gate.evidenceBinding).toEqual({
      ready: false,
      blockers: ["COUNTRY_EVIDENCE_COUNTRY_MISMATCH"],
    });
    expect(gate.launchable).toBe(false);
  });

  it("prevents otherwise launchable evidence from being reused across exact heads", () => {
    const au = getCountryConfigByCountryCode("AU");
    expect(au).not.toBeNull();

    const gate = evaluateCountryBoundOperationalLaunch(
      makeCountryGateReady(au!),
      verifiedOperationalEvidence,
      EXACT_HEAD,
      envelope("AU", DIFFERENT_VALID_HEAD),
    );

    expect(gate.countryGate.launchable).toBe(true);
    expect(gate.operationalBlockers).toEqual([]);
    expect(gate.evidenceBinding).toEqual({
      ready: false,
      blockers: ["COUNTRY_EVIDENCE_HEAD_SHA_MISMATCH"],
    });
    expect(gate.launchable).toBe(false);
  });

  it("keeps a matching envelope subordinate to all existing launch gates", () => {
    const au = getCountryConfigByCountryCode("AU");
    expect(au).not.toBeNull();

    const gate = evaluateCountryBoundOperationalLaunch(
      makeCountryGateReady(au!),
      verifiedOperationalEvidence,
      EXACT_HEAD,
      envelope("AU"),
      EVALUATED_AT,
    );

    expect(gate.evidenceBinding).toEqual({ ready: true, blockers: [] });
    expect(gate.countryGate.launchable).toBe(true);
    expect(gate.operationalBlockers).toEqual([]);
    expect(gate.launchable).toBe(true);
  });
});
