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

function envelope(countryCode: string): CountryOperationalEvidenceEnvelope {
  return {
    countryCode,
    exactHeadSha: EXACT_HEAD,
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
      expect(evaluateCountryOperationalEvidenceBinding(countryCode, envelope(countryCode))).toEqual({
        ready: true,
        blockers: [],
      });
    }
  });

  it("rejects cross-country evidence reuse", () => {
    expect(evaluateCountryOperationalEvidenceBinding("US", envelope("AU"))).toEqual({
      ready: false,
      blockers: ["COUNTRY_EVIDENCE_COUNTRY_MISMATCH"],
    });
  });

  it("fails closed when the evidence envelope is missing", () => {
    expect(evaluateCountryOperationalEvidenceBinding("AU", null)).toEqual({
      ready: false,
      blockers: [
        "COUNTRY_EVIDENCE_COUNTRY_MISSING",
        "COUNTRY_EVIDENCE_HEAD_SHA_INVALID",
        "COUNTRY_EVIDENCE_ID_MISSING",
        "COUNTRY_EVIDENCE_CAPTURE_TIME_INVALID",
      ],
    });
  });

  it("rejects branch labels, empty evidence ids and timestamps without explicit UTC", () => {
    expect(
      evaluateCountryOperationalEvidenceBinding("AU", {
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

  it("keeps a matching envelope subordinate to all existing launch gates", () => {
    const au = getCountryConfigByCountryCode("AU");
    expect(au).not.toBeNull();

    const gate = evaluateCountryBoundOperationalLaunch(
      makeCountryGateReady(au!),
      verifiedOperationalEvidence,
      envelope("AU"),
    );

    expect(gate.evidenceBinding).toEqual({ ready: true, blockers: [] });
    expect(gate.countryGate.launchable).toBe(true);
    expect(gate.operationalBlockers).toEqual([]);
    expect(gate.launchable).toBe(true);
  });
});
