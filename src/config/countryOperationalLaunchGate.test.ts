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
  securityRegression: "NEEDS_REVIEW",
  deploymentProvenance: "NEEDS_REVIEW",
  roomFactoryTemplates: "NEEDS_REVIEW",
  roomFactoryRuntime: "NEEDS_REVIEW",
  roomFactoryWriteAuthority: "NEEDS_REVIEW",
  tenantIsolation: "NEEDS_REVIEW",
  customerAccountAuthority: "NEEDS_REVIEW",
  countryCommercialCatalog: "NEEDS_REVIEW",
  commercialReviewAuthority: "NEEDS_REVIEW",
  recordingReviewAuthority: "NEEDS_REVIEW",
  paymentCommercialAuthority: "NEEDS_REVIEW",
  paymentOperations: "NEEDS_REVIEW",
  complianceReviewAuthority: "NEEDS_REVIEW",
  complianceEvidence: "NEEDS_REVIEW",
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
      expect(gate.operationalBlockers, countryCode).toContain("SECURITY_REGRESSION_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("DEPLOYMENT_PROVENANCE_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("ROOM_FACTORY_TEMPLATES_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("ROOM_FACTORY_RUNTIME_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("ROOM_FACTORY_WRITE_AUTHORITY_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("TENANT_ISOLATION_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("CUSTOMER_ACCOUNT_AUTHORITY_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("COUNTRY_COMMERCIAL_CATALOG_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("COMMERCIAL_REVIEW_AUTHORITY_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("RECORDING_REVIEW_AUTHORITY_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("PAYMENT_COMMERCIAL_AUTHORITY_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("PAYMENT_OPERATIONS_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("COMPLIANCE_REVIEW_AUTHORITY_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("COMPLIANCE_EVIDENCE_NOT_VERIFIED");
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

  it("fails closed when older evidence producers omit new launch-critical proof", () => {
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

    const gate = evaluateCountryOperationalLaunch(ready, legacyEvidence);
    expect(gate.launchable).toBe(false);
    expect(gate.operationalBlockers).toEqual([
      "SECURITY_REGRESSION_NOT_VERIFIED",
      "DEPLOYMENT_PROVENANCE_NOT_VERIFIED",
      "ROOM_FACTORY_TEMPLATES_NOT_VERIFIED",
      "ROOM_FACTORY_RUNTIME_NOT_VERIFIED",
      "ROOM_FACTORY_WRITE_AUTHORITY_NOT_VERIFIED",
      "TENANT_ISOLATION_NOT_VERIFIED",
      "CUSTOMER_ACCOUNT_AUTHORITY_NOT_VERIFIED",
      "COUNTRY_COMMERCIAL_CATALOG_NOT_VERIFIED",
      "COMMERCIAL_REVIEW_AUTHORITY_NOT_VERIFIED",
      "RECORDING_REVIEW_AUTHORITY_NOT_VERIFIED",
      "PAYMENT_COMMERCIAL_AUTHORITY_NOT_VERIFIED",
      "PAYMENT_OPERATIONS_NOT_VERIFIED",
      "COMPLIANCE_REVIEW_AUTHORITY_NOT_VERIFIED",
      "COMPLIANCE_EVIDENCE_NOT_VERIFIED",
    ]);
  });

  it("fails closed if security/regression proof has not been independently verified", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);

    const gate = evaluateCountryOperationalLaunch(ready, {
      ...verifiedEvidence,
      securityRegression: "BLOCKED",
    });

    expect(gate.launchable).toBe(false);
    expect(gate.countryGate.launchable).toBe(true);
    expect(gate.operationalBlockers).toEqual(["SECURITY_REGRESSION_NOT_VERIFIED"]);
  });

  it("fails closed if deployment provenance has not been independently verified", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);

    const gate = evaluateCountryOperationalLaunch(ready, {
      ...verifiedEvidence,
      deploymentProvenance: "BLOCKED",
    });

    expect(gate.launchable).toBe(false);
    expect(gate.countryGate.launchable).toBe(true);
    expect(gate.operationalBlockers).toEqual(["DEPLOYMENT_PROVENANCE_NOT_VERIFIED"]);
  });

  it("fails closed if Room Factory runtime creation has not been independently verified", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);

    const gate = evaluateCountryOperationalLaunch(ready, {
      ...verifiedEvidence,
      roomFactoryRuntime: "BLOCKED",
    });

    expect(gate.launchable).toBe(false);
    expect(gate.countryGate.launchable).toBe(true);
    expect(gate.operationalBlockers).toEqual(["ROOM_FACTORY_RUNTIME_NOT_VERIFIED"]);
  });

  it("fails closed if Room Factory client write authority has not been independently verified", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);

    const gate = evaluateCountryOperationalLaunch(ready, {
      ...verifiedEvidence,
      roomFactoryWriteAuthority: "BLOCKED",
    });

    expect(gate.launchable).toBe(false);
    expect(gate.countryGate.launchable).toBe(true);
    expect(gate.operationalBlockers).toEqual(["ROOM_FACTORY_WRITE_AUTHORITY_NOT_VERIFIED"]);
  });

  it("fails closed if customer-account authority has not been independently verified", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);

    const gate = evaluateCountryOperationalLaunch(ready, {
      ...verifiedEvidence,
      customerAccountAuthority: "BLOCKED",
    });

    expect(gate.launchable).toBe(false);
    expect(gate.countryGate.launchable).toBe(true);
    expect(gate.operationalBlockers).toEqual(["CUSTOMER_ACCOUNT_AUTHORITY_NOT_VERIFIED"]);
  });

  it("fails closed if country commercial catalog readiness has not been independently verified", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);

    const gate = evaluateCountryOperationalLaunch(ready, {
      ...verifiedEvidence,
      countryCommercialCatalog: "BLOCKED",
    });

    expect(gate.launchable).toBe(false);
    expect(gate.countryGate.launchable).toBe(true);
    expect(gate.operationalBlockers).toEqual(["COUNTRY_COMMERCIAL_CATALOG_NOT_VERIFIED"]);
  });

  it("fails closed if commercial reviewer authority has not been independently verified", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);

    const gate = evaluateCountryOperationalLaunch(ready, {
      ...verifiedEvidence,
      commercialReviewAuthority: "BLOCKED",
    });

    expect(gate.launchable).toBe(false);
    expect(gate.countryGate.launchable).toBe(true);
    expect(gate.operationalBlockers).toEqual(["COMMERCIAL_REVIEW_AUTHORITY_NOT_VERIFIED"]);
  });

  it("fails closed if recording/consent reviewer authority has not been independently verified", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);

    const gate = evaluateCountryOperationalLaunch(ready, {
      ...verifiedEvidence,
      recordingReviewAuthority: "BLOCKED",
    });

    expect(gate.launchable).toBe(false);
    expect(gate.countryGate.launchable).toBe(true);
    expect(gate.operationalBlockers).toEqual(["RECORDING_REVIEW_AUTHORITY_NOT_VERIFIED"]);
  });

  it("fails closed if payment commercial authority has not been independently verified", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);

    const gate = evaluateCountryOperationalLaunch(ready, {
      ...verifiedEvidence,
      paymentCommercialAuthority: "BLOCKED",
    });

    expect(gate.launchable).toBe(false);
    expect(gate.countryGate.launchable).toBe(true);
    expect(gate.operationalBlockers).toEqual(["PAYMENT_COMMERCIAL_AUTHORITY_NOT_VERIFIED"]);
  });

  it("fails closed if compliance reviewer authority has not been independently verified", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);

    const gate = evaluateCountryOperationalLaunch(ready, {
      ...verifiedEvidence,
      complianceReviewAuthority: "BLOCKED",
    });

    expect(gate.launchable).toBe(false);
    expect(gate.countryGate.launchable).toBe(true);
    expect(gate.operationalBlockers).toEqual(["COMPLIANCE_REVIEW_AUTHORITY_NOT_VERIFIED"]);
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

  it("only becomes launchable when both country and all operational evidence are verified", () => {
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
