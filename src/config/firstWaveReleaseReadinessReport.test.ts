import { describe, expect, it } from "vitest";
import type { CountryOperationalEvidenceEnvelope } from "./countryOperationalEvidenceBinding";
import type { CountryOperationalEvidence } from "./countryOperationalLaunchGate";
import {
  FIRST_WAVE_COUNTRY_CODES,
  type FirstWaveCountryEvidenceInput,
} from "./firstWaveCountryOperationalAggregation";
import { buildFirstWaveReleaseReadinessReport } from "./firstWaveReleaseReadinessReport";

const EXACT_HEAD = "fdb6c72529aaea3fd37b0d8ad7863fa168db7914";
const DIFFERENT_VALID_HEAD = "33da2a917dc6adcf266f59f0b27d18a56f1271d8";

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

function evidenceEnvelope(
  countryCode: string,
  exactHeadSha: string = EXACT_HEAD,
): CountryOperationalEvidenceEnvelope {
  return {
    countryCode,
    exactHeadSha,
    evidenceId: `release-readiness-${countryCode.toLowerCase()}`,
    capturedAtUtc: "2026-09-11T08:51:00Z",
  };
}

function allFirstWaveInputs(): FirstWaveCountryEvidenceInput[] {
  return FIRST_WAVE_COUNTRY_CODES.map((countryCode) => ({
    countryCode,
    operationalEvidence: verifiedOperationalEvidence,
    envelope: evidenceEnvelope(countryCode),
  }));
}

describe("first-wave release readiness report", () => {
  it("surfaces all six first-wave country decisions without promoting blocked configs", () => {
    const report = buildFirstWaveReleaseReadinessReport(EXACT_HEAD, allFirstWaveInputs());

    expect(report.candidateSha).toBe(EXACT_HEAD);
    expect(report.aggregationBlockers).toEqual([]);
    expect(report.countries.map(({ countryCode }) => countryCode)).toEqual([
      ...FIRST_WAVE_COUNTRY_CODES,
    ]);
    expect(report.countries.every(({ evaluated }) => evaluated)).toBe(true);

    // Current country configs intentionally remain fail-closed. A release-facing
    // report must preserve those blockers instead of treating complete evidence
    // coverage as permission to promote.
    expect(report.safeToPromote).toBe(false);
    expect(report.decision).toBe("HOLD");
    expect(report.countries.every(({ launchable }) => !launchable)).toBe(true);
    expect(report.countries.every(({ countryConfigBlockers }) => countryConfigBlockers.length > 0)).toBe(
      true,
    );
  });

  it("keeps missing country evidence visible and marks that country unevaluated", () => {
    const inputs = allFirstWaveInputs().filter(({ countryCode }) => countryCode !== "GB");
    const report = buildFirstWaveReleaseReadinessReport(EXACT_HEAD, inputs);
    const gb = report.countries.find(({ countryCode }) => countryCode === "GB");

    expect(report.aggregationBlockers).toContainEqual({
      code: "FIRST_WAVE_COUNTRY_MISSING",
      countryCode: "GB",
    });
    expect(gb).toEqual({
      countryCode: "GB",
      evaluated: false,
      launchable: false,
      countryConfigBlockers: [],
      operationalBlockers: [],
      evidenceBindingBlockers: [],
    });
    expect(report.decision).toBe("HOLD");
  });

  it("surfaces exact-head provenance mismatch in the affected country row", () => {
    const inputs = allFirstWaveInputs().map((item) =>
      item.countryCode === "KR"
        ? { ...item, envelope: evidenceEnvelope("KR", DIFFERENT_VALID_HEAD) }
        : item,
    );
    const report = buildFirstWaveReleaseReadinessReport(EXACT_HEAD, inputs);
    const kr = report.countries.find(({ countryCode }) => countryCode === "KR");

    expect(kr?.evidenceBindingBlockers).toEqual(["COUNTRY_EVIDENCE_HEAD_SHA_MISMATCH"]);
    expect(kr?.launchable).toBe(false);
    expect(report.safeToPromote).toBe(false);
    expect(report.decision).toBe("HOLD");
  });
});
