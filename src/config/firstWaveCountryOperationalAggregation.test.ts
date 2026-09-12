import { describe, expect, it } from "vitest";
import {
  evaluateFirstWaveCountryOperationalAggregation,
  FIRST_WAVE_COUNTRY_CODES,
  type FirstWaveCountryEvidenceInput,
} from "./firstWaveCountryOperationalAggregation";
import type { CountryOperationalEvidenceEnvelope } from "./countryOperationalEvidenceBinding";
import type { CountryOperationalEvidence } from "./countryOperationalLaunchGate";

const EXACT_HEAD = "b7c86681b6073d8b804b018c286ee452f618a33b";
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

function envelope(
  countryCode: string,
  options: { exactHeadSha?: string; evidenceId?: string } = {},
): CountryOperationalEvidenceEnvelope {
  return {
    countryCode,
    exactHeadSha: options.exactHeadSha ?? EXACT_HEAD,
    evidenceId: options.evidenceId ?? `october-launch-${countryCode.toLowerCase()}-evidence`,
    capturedAtUtc: "2026-09-11T07:50:00Z",
  };
}

function input(
  countryCode: string,
  options: { exactHeadSha?: string; evidenceId?: string } = {},
): FirstWaveCountryEvidenceInput {
  return {
    countryCode,
    operationalEvidence: verifiedOperationalEvidence,
    envelope: envelope(countryCode, options),
  };
}

function allFirstWaveInputs(): FirstWaveCountryEvidenceInput[] {
  return FIRST_WAVE_COUNTRY_CODES.map((countryCode) => input(countryCode));
}

describe("first-wave country operational aggregation", () => {
  it("binds all six first-wave countries independently while preserving existing country blockers", () => {
    const result = evaluateFirstWaveCountryOperationalAggregation(EXACT_HEAD, allFirstWaveInputs());

    expect(result.blockers).toEqual([]);
    expect(Object.keys(result.countryGates).sort()).toEqual([...FIRST_WAVE_COUNTRY_CODES].sort());

    for (const countryCode of FIRST_WAVE_COUNTRY_CODES) {
      expect(result.countryGates[countryCode]?.evidenceBinding).toEqual({
        ready: true,
        blockers: [],
      });
    }

    // Current first-wave configs intentionally remain fail-closed; complete
    // evidence coverage must not silently promote them.
    expect(result.launchable).toBe(false);
  });

  it("fails closed when a first-wave country is missing", () => {
    const inputs = allFirstWaveInputs().filter(({ countryCode }) => countryCode !== "GB");
    const result = evaluateFirstWaveCountryOperationalAggregation(EXACT_HEAD, inputs);

    expect(result.blockers).toContainEqual({
      code: "FIRST_WAVE_COUNTRY_MISSING",
      countryCode: "GB",
    });
    expect(result.launchable).toBe(false);
  });

  it("rejects duplicate first-wave country rows", () => {
    const result = evaluateFirstWaveCountryOperationalAggregation(EXACT_HEAD, [
      ...allFirstWaveInputs(),
      input("AU", { evidenceId: "october-launch-au-second-copy" }),
    ]);

    expect(result.blockers).toContainEqual({
      code: "FIRST_WAVE_COUNTRY_DUPLICATE",
      countryCode: "AU",
    });
    expect(result.launchable).toBe(false);
  });

  it("rejects next-wave or unsupported country rows from first-wave aggregation", () => {
    const result = evaluateFirstWaveCountryOperationalAggregation(EXACT_HEAD, [
      ...allFirstWaveInputs(),
      input("SG"),
    ]);

    expect(result.blockers).toContainEqual({
      code: "FIRST_WAVE_COUNTRY_UNSUPPORTED",
      countryCode: "SG",
    });
    expect(result.launchable).toBe(false);
  });

  it("rejects one evidence id reused across different first-wave countries", () => {
    const inputs = allFirstWaveInputs().map((item) =>
      item.countryCode === "AU" || item.countryCode === "US"
        ? {
            ...item,
            envelope: envelope(item.countryCode, { evidenceId: "shared-first-wave-evidence" }),
          }
        : item,
    );
    const result = evaluateFirstWaveCountryOperationalAggregation(EXACT_HEAD, inputs);

    expect(result.blockers).toContainEqual({
      code: "FIRST_WAVE_EVIDENCE_ID_REUSED",
      evidenceId: "shared-first-wave-evidence",
    });
    expect(result.launchable).toBe(false);
  });

  it("keeps exact-head mismatch visible inside the affected country gate", () => {
    const inputs = allFirstWaveInputs().map((item) =>
      item.countryCode === "KR"
        ? input("KR", { exactHeadSha: DIFFERENT_VALID_HEAD })
        : item,
    );
    const result = evaluateFirstWaveCountryOperationalAggregation(EXACT_HEAD, inputs);

    expect(result.blockers).toEqual([]);
    expect(result.countryGates.KR?.evidenceBinding).toEqual({
      ready: false,
      blockers: ["COUNTRY_EVIDENCE_HEAD_SHA_MISMATCH"],
    });
    expect(result.countryGates.KR?.launchable).toBe(false);
    expect(result.launchable).toBe(false);
  });
});
