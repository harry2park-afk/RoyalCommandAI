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
  authRecovery: "NEEDS_REVIEW",
  sessionCookies: "NEEDS_REVIEW",
  legalCompliance: "NEEDS_REVIEW",
  taxCompliance: "NEEDS_REVIEW",
  privacyCompliance: "NEEDS_REVIEW",
  communicationsRules: "NEEDS_REVIEW",
  recordingCompliance: "NEEDS_REVIEW",
  dataResidency: "NEEDS_REVIEW",
  tenantIsolation: "NEEDS_REVIEW",
  localization: "NEEDS_REVIEW",
  roomFactoryPersistence: "NEEDS_REVIEW",
  schemaMigrationParity: "NEEDS_REVIEW",
  requiredIntegrations: "NEEDS_REVIEW",
  serviceCountryTerms: "NEEDS_REVIEW",
  paymentOperations: "NEEDS_REVIEW",
  previewSmokeTest: "NEEDS_REVIEW",
  deploymentProtection: "NEEDS_REVIEW",
  rollbackPath: "NEEDS_REVIEW",
};

const verifiedEvidence: CountryOperationalEvidence = {
  domainBinding: "VERIFIED",
  authCallback: "VERIFIED",
  authRecovery: "VERIFIED",
  sessionCookies: "VERIFIED",
  legalCompliance: "VERIFIED",
  taxCompliance: "VERIFIED",
  privacyCompliance: "VERIFIED",
  communicationsRules: "VERIFIED",
  recordingCompliance: "VERIFIED",
  dataResidency: "VERIFIED",
  tenantIsolation: "VERIFIED",
  localization: "VERIFIED",
  roomFactoryPersistence: "VERIFIED",
  schemaMigrationParity: "VERIFIED",
  requiredIntegrations: "VERIFIED",
  serviceCountryTerms: "VERIFIED",
  paymentOperations: "VERIFIED",
  previewSmokeTest: "VERIFIED",
  deploymentProtection: "VERIFIED",
  rollbackPath: "VERIFIED",
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
      expect(gate.operationalBlockers, countryCode).toContain("AUTH_RECOVERY_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("LEGAL_COMPLIANCE_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("TAX_COMPLIANCE_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("PRIVACY_COMPLIANCE_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("RECORDING_COMPLIANCE_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("TENANT_ISOLATION_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("ROOM_FACTORY_PERSISTENCE_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("SCHEMA_MIGRATION_PARITY_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("SERVICE_COUNTRY_TERMS_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("PAYMENT_OPERATIONS_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("PREVIEW_SMOKE_TEST_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("DEPLOYMENT_PROTECTION_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("ROLLBACK_PATH_NOT_VERIFIED");
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

  it.each([
    ["legalCompliance", "LEGAL_COMPLIANCE_NOT_VERIFIED"],
    ["taxCompliance", "TAX_COMPLIANCE_NOT_VERIFIED"],
    ["privacyCompliance", "PRIVACY_COMPLIANCE_NOT_VERIFIED"],
    ["authRecovery", "AUTH_RECOVERY_NOT_VERIFIED"],
    ["tenantIsolation", "TENANT_ISOLATION_NOT_VERIFIED"],
    ["roomFactoryPersistence", "ROOM_FACTORY_PERSISTENCE_NOT_VERIFIED"],
    ["schemaMigrationParity", "SCHEMA_MIGRATION_PARITY_NOT_VERIFIED"],
    ["serviceCountryTerms", "SERVICE_COUNTRY_TERMS_NOT_VERIFIED"],
    ["paymentOperations", "PAYMENT_OPERATIONS_NOT_VERIFIED"],
    ["recordingCompliance", "RECORDING_COMPLIANCE_NOT_VERIFIED"],
    ["deploymentProtection", "DEPLOYMENT_PROTECTION_NOT_VERIFIED"],
  ] as const)("fails closed when %s evidence is missing even when the static country gate is ready", (key, blocker) => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);

    const gate = evaluateCountryOperationalLaunch(ready, {
      ...verifiedEvidence,
      [key]: "NEEDS_REVIEW",
    });

    expect(gate.launchable).toBe(false);
    expect(gate.countryGate.launchable).toBe(true);
    expect(gate.operationalBlockers).toEqual([blocker]);
  });

  it("fails closed on any other missing operational verification even when the country gate is ready", () => {
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

  it("only becomes launchable when both country and operational evidence are verified", () => {
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
