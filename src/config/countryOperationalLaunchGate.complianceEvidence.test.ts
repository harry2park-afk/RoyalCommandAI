import { describe, expect, it } from "vitest";
import type { CountryConfig } from "../types/countryConfig";
import { getCountryConfigByCountryCode } from "./countryResolver";
import {
  evaluateCountryOperationalLaunch,
  type CountryOperationalEvidence,
} from "./countryOperationalLaunchGate";

const verifiedEvidence: CountryOperationalEvidence = {
  domainBinding: "VERIFIED",
  authCallback: "VERIFIED",
  sessionCookies: "VERIFIED",
  communicationsRules: "VERIFIED",
  dataResidency: "VERIFIED",
  localization: "VERIFIED",
  requiredIntegrations: "VERIFIED",
  previewSmokeTest: "VERIFIED",
  rollbackPath: "VERIFIED",
  securityRegression: "VERIFIED",
  deploymentProvenance: "VERIFIED",
  roomFactoryTemplates: "VERIFIED",
  roomFactoryRuntime: "VERIFIED",
  roomFactoryWriteAuthority: "VERIFIED",
  tenantIsolation: "VERIFIED",
  customerAccountAuthority: "VERIFIED",
  countryCommercialCatalog: "VERIFIED",
  commercialReviewAuthority: "VERIFIED",
  recordingReviewAuthority: "VERIFIED",
  paymentCommercialAuthority: "VERIFIED",
  paymentOperations: "VERIFIED",
  paymentProviderSandbox: "VERIFIED",
  legalEvidence: "VERIFIED",
  privacyEvidence: "VERIFIED",
  dataResidencyEvidence: "VERIFIED",
  taxEvidence: "VERIFIED",
  taxStructureEvidence: "VERIFIED",
  complianceReviewAuthority: "VERIFIED",
  complianceEvidence: "VERIFIED",
};

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

function readyAustralia(): CountryConfig {
  const config = getCountryConfigByCountryCode("AU");
  expect(config).not.toBeNull();
  return makeCountryGateReady(config!);
}

describe("country operational launch compliance evidence kinds", () => {
  it.each([
    ["legalEvidence", "LEGAL_EVIDENCE_NOT_VERIFIED"],
    ["privacyEvidence", "PRIVACY_EVIDENCE_NOT_VERIFIED"],
    ["dataResidencyEvidence", "DATA_RESIDENCY_EVIDENCE_NOT_VERIFIED"],
  ] as const)("fails closed when %s is not verified", (key, blocker) => {
    const gate = evaluateCountryOperationalLaunch(readyAustralia(), {
      ...verifiedEvidence,
      [key]: "BLOCKED",
    });

    expect(gate.countryGate.launchable).toBe(true);
    expect(gate.launchable).toBe(false);
    expect(gate.operationalBlockers).toEqual([blocker]);
  });

  it("fails closed when an older evidence producer omits all three dedicated evidence kinds", () => {
    const {
      legalEvidence: _legalEvidence,
      privacyEvidence: _privacyEvidence,
      dataResidencyEvidence: _dataResidencyEvidence,
      ...legacyEvidence
    } = verifiedEvidence;

    const gate = evaluateCountryOperationalLaunch(readyAustralia(), legacyEvidence);

    expect(gate.countryGate.launchable).toBe(true);
    expect(gate.launchable).toBe(false);
    expect(gate.operationalBlockers).toEqual([
      "LEGAL_EVIDENCE_NOT_VERIFIED",
      "PRIVACY_EVIDENCE_NOT_VERIFIED",
      "DATA_RESIDENCY_EVIDENCE_NOT_VERIFIED",
    ]);
  });

  it("does not let generic compliance evidence replace the three dedicated evidence kinds", () => {
    const gate = evaluateCountryOperationalLaunch(readyAustralia(), {
      ...verifiedEvidence,
      legalEvidence: "NEEDS_REVIEW",
      privacyEvidence: "NEEDS_REVIEW",
      dataResidencyEvidence: "NEEDS_REVIEW",
      complianceEvidence: "VERIFIED",
      complianceReviewAuthority: "VERIFIED",
    });

    expect(gate.launchable).toBe(false);
    expect(gate.operationalBlockers).toEqual([
      "LEGAL_EVIDENCE_NOT_VERIFIED",
      "PRIVACY_EVIDENCE_NOT_VERIFIED",
      "DATA_RESIDENCY_EVIDENCE_NOT_VERIFIED",
    ]);
  });
});
