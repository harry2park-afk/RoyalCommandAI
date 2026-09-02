import { describe, expect, it } from "vitest";
import type { CountryConfig } from "../types/countryConfig";
import { getConfiguredCountryCodes, getCountryConfigByCountryCode } from "./countryResolver";
import {
  evaluateCountryOperationalLaunch,
  type CountryOperationalEvidence,
} from "./countryOperationalLaunchGate";

const FIRST_WAVE_COUNTRY_CODES = ["AU", "CA", "GB", "JP", "KR", "US"] as const;

const unverifiedEvidence: CountryOperationalEvidence = {
  domainBinding: "NEEDS_REVIEW",
  authCallback: "NEEDS_REVIEW",
  sessionCookies: "NEEDS_REVIEW",
  communicationsRules: "NEEDS_REVIEW",
  dataResidency: "NEEDS_REVIEW",
  localization: "NEEDS_REVIEW",
  requiredIntegrations: "NEEDS_REVIEW",
  previewSmokeTest: "NEEDS_REVIEW",
  rollbackPath: "NEEDS_REVIEW",
  authRecovery: "NEEDS_REVIEW",
  tenantIsolation: "NEEDS_REVIEW",
  consentCapture: "NEEDS_REVIEW",
  paymentLifecycle: "NEEDS_REVIEW",
  recordingCompliance: "NEEDS_REVIEW",
  securityRegression: "NEEDS_REVIEW",
};

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
  authRecovery: "VERIFIED",
  tenantIsolation: "VERIFIED",
  consentCapture: "VERIFIED",
  paymentLifecycle: "VERIFIED",
  recordingCompliance: "VERIFIED",
  securityRegression: "VERIFIED",
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

describe("country operational launch readiness gate", () => {
  it("keeps all six first-wave countries configured and fails every configured country closed without operational evidence", () => {
    const configuredCountryCodes = getConfiguredCountryCodes();

    for (const countryCode of FIRST_WAVE_COUNTRY_CODES) {
      expect(configuredCountryCodes, countryCode).toContain(countryCode);
    }

    for (const countryCode of configuredCountryCodes) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();

      const gate = evaluateCountryOperationalLaunch(config!, unverifiedEvidence);
      expect(gate.launchable, countryCode).toBe(false);
      expect(gate.operationalBlockers, countryCode).toContain("DOMAIN_BINDING_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("AUTH_CALLBACK_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("PREVIEW_SMOKE_TEST_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("ROLLBACK_PATH_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("AUTH_RECOVERY_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("TENANT_ISOLATION_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("CONSENT_CAPTURE_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("PAYMENT_LIFECYCLE_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("RECORDING_COMPLIANCE_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("SECURITY_REGRESSION_NOT_VERIFIED");
    }
  });

  it("does not allow operational evidence to bypass legal, tax or payment blockers", () => {
    const config = getCountryConfigByCountryCode("AU");
    expect(config).not.toBeNull();

    const gate = evaluateCountryOperationalLaunch(config!, verifiedEvidence);
    expect(gate.launchable).toBe(false);
    expect(gate.operationalBlockers).toEqual([]);
    expect(gate.countryGate.blockers.length).toBeGreaterThan(0);
  });

  it("fails closed on any missing operational verification even when the country gate is ready", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);

    const gate = evaluateCountryOperationalLaunch(ready, {
      ...verifiedEvidence,
      dataResidency: "NEEDS_REVIEW",
    });

    expect(gate.launchable).toBe(false);
    expect(gate.countryGate.launchable).toBe(true);
    expect(gate.operationalBlockers).toEqual(["DATA_RESIDENCY_NOT_VERIFIED"]);
  });

  it("treats omitted launch-critical hardening evidence as blocked for backward-compatible callers", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);

    const legacyEvidence: CountryOperationalEvidence = {
      domainBinding: "VERIFIED",
      authCallback: "VERIFIED",
      sessionCookies: "VERIFIED",
      communicationsRules: "VERIFIED",
      dataResidency: "VERIFIED",
      localization: "VERIFIED",
      requiredIntegrations: "VERIFIED",
      previewSmokeTest: "VERIFIED",
      rollbackPath: "VERIFIED",
    };

    expect(evaluateCountryOperationalLaunch(ready, legacyEvidence)).toEqual({
      launchable: false,
      countryGate: { launchable: true, blockers: [] },
      operationalBlockers: [
        "AUTH_RECOVERY_NOT_VERIFIED",
        "TENANT_ISOLATION_NOT_VERIFIED",
        "CONSENT_CAPTURE_NOT_VERIFIED",
        "PAYMENT_LIFECYCLE_NOT_VERIFIED",
        "RECORDING_COMPLIANCE_NOT_VERIFIED",
        "SECURITY_REGRESSION_NOT_VERIFIED",
      ],
    });
  });

  it("only becomes launchable when both country and every operational evidence item are verified", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);

    expect(evaluateCountryOperationalLaunch(ready, verifiedEvidence)).toEqual({
      launchable: true,
      countryGate: { launchable: true, blockers: [] },
      operationalBlockers: [],
    });
  });
});
