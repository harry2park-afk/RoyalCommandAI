import { describe, expect, it } from "vitest";
import type { CountryConfig } from "../types/countryConfig";
import { getConfiguredCountryCodes, getCountryConfigByCountryCode } from "./countryResolver";
import {
  evaluateCountryOperationalLaunch,
  type CountryOperationalEvidence,
} from "./countryOperationalLaunchGate";

const FIRST_WAVE_COUNTRY_CODES = ["AU", "CA", "GB", "JP", "KR", "US"] as const;

const allEvidence = (status: "VERIFIED" | "NEEDS_REVIEW" | "BLOCKED"): CountryOperationalEvidence => ({
  domainBinding: status,
  authCallback: status,
  sessionCookies: status,
  communicationsRules: status,
  dataResidency: status,
  localization: status,
  requiredIntegrations: status,
  previewSmokeTest: status,
  rollbackPath: status,
  nonProductionStaging: status,
  securityRegression: status,
  deploymentProvenance: status,
  roomFactoryTemplates: status,
  roomFactoryRuntime: status,
  roomFactoryWriteAuthority: status,
  tenantIsolation: status,
  profileRoleAuthority: status,
  customerAccountAuthority: status,
  legalMatterAssignmentAuthority: status,
  countryCommercialCatalog: status,
  commercialReviewAuthority: status,
  recordingReviewAuthority: status,
  paymentCommercialAuthority: status,
  paymentOperations: status,
  paymentProviderSandbox: status,
  legalEvidence: status,
  privacyEvidence: status,
  dataResidencyEvidence: status,
  taxEvidence: status,
  taxStructureEvidence: status,
  complianceReviewAuthority: status,
  complianceEvidence: status,
});

const unverifiedEvidence = allEvidence("NEEDS_REVIEW");
const verifiedEvidence = allEvidence("VERIFIED");

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
  it("keeps the first six rollout countries configured and fails closed without launch evidence", () => {
    const configuredCountryCodes = getConfiguredCountryCodes();
    for (const countryCode of FIRST_WAVE_COUNTRY_CODES) {
      expect(configuredCountryCodes, countryCode).toContain(countryCode);
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();
      const gate = evaluateCountryOperationalLaunch(config!, unverifiedEvidence);
      expect(gate.launchable, countryCode).toBe(false);
      expect(gate.operationalBlockers, countryCode).toContain("ROOM_FACTORY_RUNTIME_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("ROOM_FACTORY_WRITE_AUTHORITY_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("TENANT_ISOLATION_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("PROFILE_ROLE_AUTHORITY_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("PAYMENT_PROVIDER_SANDBOX_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("DEPLOYMENT_PROVENANCE_NOT_VERIFIED");
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

  it("fails closed when an older evidence producer omits the new launch-critical proof", () => {
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
    expect(gate.operationalBlockers).toContain("NON_PRODUCTION_STAGING_NOT_VERIFIED");
    expect(gate.operationalBlockers).toContain("SECURITY_REGRESSION_NOT_VERIFIED");
    expect(gate.operationalBlockers).toContain("DEPLOYMENT_PROVENANCE_NOT_VERIFIED");
    expect(gate.operationalBlockers).toContain("ROOM_FACTORY_RUNTIME_NOT_VERIFIED");
    expect(gate.operationalBlockers).toContain("PAYMENT_PROVIDER_SANDBOX_NOT_VERIFIED");
    expect(gate.operationalBlockers).toContain("COMPLIANCE_EVIDENCE_NOT_VERIFIED");
  });

  it("fails closed on any missing launch-critical verification even when the country gate is ready", () => {
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
