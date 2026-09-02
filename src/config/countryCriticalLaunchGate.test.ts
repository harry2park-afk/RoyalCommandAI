import { describe, expect, it } from "vitest";
import type { CountryConfig } from "../types/countryConfig";
import { getConfiguredCountryCodes, getCountryConfigByCountryCode } from "./countryResolver";
import type { CountryOperationalEvidence } from "./countryOperationalLaunchGate";
import {
  evaluateCountryCriticalLaunch,
  type CountryCriticalLaunchEvidence,
} from "./countryCriticalLaunchGate";

const FIRST_WAVE_COUNTRY_CODES = ["AU", "CA", "GB", "JP", "KR", "US"] as const;

const verifiedOperationalEvidence: CountryOperationalEvidence = {
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

const unverifiedCriticalEvidence: CountryCriticalLaunchEvidence = {
  roomFactoryTemplate: "NEEDS_REVIEW",
  tenantIsolation: "NEEDS_REVIEW",
  authRecovery: "NEEDS_REVIEW",
  legalComplianceEvidence: "NEEDS_REVIEW",
  commercialTermsPricing: "NEEDS_REVIEW",
  paymentOperations: "NEEDS_REVIEW",
  qaSecurityRegression: "NEEDS_REVIEW",
  protectedDeployment: "NEEDS_REVIEW",
};

const verifiedCriticalEvidence: CountryCriticalLaunchEvidence = {
  roomFactoryTemplate: "VERIFIED",
  tenantIsolation: "VERIFIED",
  authRecovery: "VERIFIED",
  legalComplianceEvidence: "VERIFIED",
  commercialTermsPricing: "VERIFIED",
  paymentOperations: "VERIFIED",
  qaSecurityRegression: "VERIFIED",
  protectedDeployment: "VERIFIED",
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

describe("country critical launch gate", () => {
  it("keeps the October first-wave countries fail-closed on their current static configuration", () => {
    const configured = getConfiguredCountryCodes();

    for (const countryCode of FIRST_WAVE_COUNTRY_CODES) {
      expect(configured, countryCode).toContain(countryCode);
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();

      const gate = evaluateCountryCriticalLaunch(
        config!,
        verifiedOperationalEvidence,
        verifiedCriticalEvidence,
      );

      expect(gate.launchable, countryCode).toBe(false);
      expect(gate.operationalGate.countryGate.blockers.length, countryCode).toBeGreaterThan(0);
    }
  });

  it("does not let static READY flags or operational checks bypass missing critical evidence", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);

    const gate = evaluateCountryCriticalLaunch(
      ready,
      verifiedOperationalEvidence,
      unverifiedCriticalEvidence,
    );

    expect(gate.launchable).toBe(false);
    expect(gate.operationalGate.launchable).toBe(true);
    expect(gate.criticalBlockers).toEqual([
      "ROOM_FACTORY_TEMPLATE_NOT_VERIFIED",
      "TENANT_ISOLATION_NOT_VERIFIED",
      "AUTH_RECOVERY_NOT_VERIFIED",
      "LEGAL_COMPLIANCE_EVIDENCE_NOT_VERIFIED",
      "COMMERCIAL_TERMS_PRICING_NOT_VERIFIED",
      "PAYMENT_OPERATIONS_NOT_VERIFIED",
      "QA_SECURITY_REGRESSION_NOT_VERIFIED",
      "PROTECTED_DEPLOYMENT_NOT_VERIFIED",
    ]);
  });

  it("fails closed when any single launch-critical requirement is not verified", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);

    const gate = evaluateCountryCriticalLaunch(ready, verifiedOperationalEvidence, {
      ...verifiedCriticalEvidence,
      tenantIsolation: "BLOCKED",
    });

    expect(gate.launchable).toBe(false);
    expect(gate.criticalBlockers).toEqual(["TENANT_ISOLATION_NOT_VERIFIED"]);
  });

  it("only becomes launchable when country, operational, and critical evidence are all verified", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);

    const gate = evaluateCountryCriticalLaunch(
      ready,
      verifiedOperationalEvidence,
      verifiedCriticalEvidence,
    );

    expect(gate.launchable).toBe(true);
    expect(gate.operationalGate.launchable).toBe(true);
    expect(gate.criticalBlockers).toEqual([]);
  });
});
