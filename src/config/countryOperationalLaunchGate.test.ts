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
  databaseMigrationSafety: "NEEDS_REVIEW",
  tenantDataIsolation: "NEEDS_REVIEW",
  authorizationRoleAuthority: "NEEDS_REVIEW",
  communicationsRules: "NEEDS_REVIEW",
  recordingConsentEvidence: "NEEDS_REVIEW",
  legalComplianceEvidence: "NEEDS_REVIEW",
  dataResidency: "NEEDS_REVIEW",
  localization: "NEEDS_REVIEW",
  requiredIntegrations: "NEEDS_REVIEW",
  commercialReadiness: "NEEDS_REVIEW",
  roomFactoryTemplate: "NEEDS_REVIEW",
  paymentOperations: "NEEDS_REVIEW",
  qaSecurityRegression: "NEEDS_REVIEW",
  previewSmokeTest: "NEEDS_REVIEW",
  deploymentProtection: "NEEDS_REVIEW",
  rollbackPath: "NEEDS_REVIEW",
};

const verifiedEvidence: CountryOperationalEvidence = {
  domainBinding: "VERIFIED",
  authCallback: "VERIFIED",
  sessionCookies: "VERIFIED",
  databaseMigrationSafety: "VERIFIED",
  tenantDataIsolation: "VERIFIED",
  authorizationRoleAuthority: "VERIFIED",
  communicationsRules: "VERIFIED",
  recordingConsentEvidence: "VERIFIED",
  legalComplianceEvidence: "VERIFIED",
  dataResidency: "VERIFIED",
  localization: "VERIFIED",
  requiredIntegrations: "VERIFIED",
  commercialReadiness: "VERIFIED",
  roomFactoryTemplate: "VERIFIED",
  paymentOperations: "VERIFIED",
  qaSecurityRegression: "VERIFIED",
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
      expect(gate.operationalBlockers, countryCode).toContain("DATABASE_MIGRATION_SAFETY_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("TENANT_DATA_ISOLATION_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("AUTHORIZATION_ROLE_AUTHORITY_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("RECORDING_CONSENT_EVIDENCE_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("LEGAL_COMPLIANCE_EVIDENCE_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("COMMERCIAL_READINESS_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("ROOM_FACTORY_TEMPLATE_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("PAYMENT_OPERATIONS_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("QA_SECURITY_REGRESSION_NOT_VERIFIED");
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

  it("fails closed when critical evidence added after older callers is omitted", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);
    const {
      databaseMigrationSafety: _databaseMigrationSafety,
      tenantDataIsolation: _tenantDataIsolation,
      authorizationRoleAuthority: _authorizationRoleAuthority,
      recordingConsentEvidence: _recordingConsentEvidence,
      legalComplianceEvidence: _legalComplianceEvidence,
      commercialReadiness: _commercialReadiness,
      paymentOperations: _paymentOperations,
      qaSecurityRegression: _qaSecurityRegression,
      deploymentProtection: _deploymentProtection,
      ...legacyEvidence
    } = verifiedEvidence;

    const gate = evaluateCountryOperationalLaunch(ready, legacyEvidence);

    expect(gate.launchable).toBe(false);
    expect(gate.countryGate.launchable).toBe(true);
    expect(gate.operationalBlockers).toEqual([
      "DATABASE_MIGRATION_SAFETY_NOT_VERIFIED",
      "TENANT_DATA_ISOLATION_NOT_VERIFIED",
      "AUTHORIZATION_ROLE_AUTHORITY_NOT_VERIFIED",
      "RECORDING_CONSENT_EVIDENCE_NOT_VERIFIED",
      "LEGAL_COMPLIANCE_EVIDENCE_NOT_VERIFIED",
      "COMMERCIAL_READINESS_NOT_VERIFIED",
      "PAYMENT_OPERATIONS_NOT_VERIFIED",
      "QA_SECURITY_REGRESSION_NOT_VERIFIED",
      "DEPLOYMENT_PROTECTION_NOT_VERIFIED",
    ]);
  });

  it("fails closed when room factory/template evidence is omitted by an older caller", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);
    const { roomFactoryTemplate: _roomFactoryTemplate, ...legacyEvidence } = verifiedEvidence;

    const gate = evaluateCountryOperationalLaunch(ready, legacyEvidence);

    expect(gate.launchable).toBe(false);
    expect(gate.countryGate.launchable).toBe(true);
    expect(gate.operationalBlockers).toEqual(["ROOM_FACTORY_TEMPLATE_NOT_VERIFIED"]);
  });

  it("requires database migration safety independently of application QA and deployment protection", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);

    const gate = evaluateCountryOperationalLaunch(ready, {
      ...verifiedEvidence,
      databaseMigrationSafety: "NEEDS_REVIEW",
      qaSecurityRegression: "VERIFIED",
      deploymentProtection: "VERIFIED",
    });

    expect(gate.launchable).toBe(false);
    expect(gate.operationalBlockers).toEqual(["DATABASE_MIGRATION_SAFETY_NOT_VERIFIED"]);
  });

  it("requires authorization-role authority independently of tenant isolation", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);

    const gate = evaluateCountryOperationalLaunch(ready, {
      ...verifiedEvidence,
      tenantDataIsolation: "VERIFIED",
      authorizationRoleAuthority: "NEEDS_REVIEW",
    });

    expect(gate.launchable).toBe(false);
    expect(gate.operationalBlockers).toEqual(["AUTHORIZATION_ROLE_AUTHORITY_NOT_VERIFIED"]);
  });

  it("requires reviewed recording/consent evidence independently of generic communications readiness", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);

    const gate = evaluateCountryOperationalLaunch(ready, {
      ...verifiedEvidence,
      communicationsRules: "VERIFIED",
      legalComplianceEvidence: "VERIFIED",
      recordingConsentEvidence: "NEEDS_REVIEW",
    });

    expect(gate.launchable).toBe(false);
    expect(gate.operationalBlockers).toEqual(["RECORDING_CONSENT_EVIDENCE_NOT_VERIFIED"]);
  });

  it("requires commercial readiness independently of integrations and payment operations", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);

    const gate = evaluateCountryOperationalLaunch(ready, {
      ...verifiedEvidence,
      requiredIntegrations: "VERIFIED",
      paymentOperations: "VERIFIED",
      commercialReadiness: "NEEDS_REVIEW",
    });

    expect(gate.launchable).toBe(false);
    expect(gate.operationalBlockers).toEqual(["COMMERCIAL_READINESS_NOT_VERIFIED"]);
  });

  it("requires exact-head QA/security evidence independently of preview smoke evidence", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);

    const gate = evaluateCountryOperationalLaunch(ready, {
      ...verifiedEvidence,
      qaSecurityRegression: "NEEDS_REVIEW",
    });

    expect(gate.launchable).toBe(false);
    expect(gate.operationalBlockers).toEqual(["QA_SECURITY_REGRESSION_NOT_VERIFIED"]);
  });

  it("requires protected deployment evidence independently of preview and rollback evidence", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);

    const gate = evaluateCountryOperationalLaunch(ready, {
      ...verifiedEvidence,
      deploymentProtection: "NEEDS_REVIEW",
    });

    expect(gate.launchable).toBe(false);
    expect(gate.operationalBlockers).toEqual(["DEPLOYMENT_PROTECTION_NOT_VERIFIED"]);
  });

  it("only becomes launchable when country and all operational evidence are verified", () => {
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
