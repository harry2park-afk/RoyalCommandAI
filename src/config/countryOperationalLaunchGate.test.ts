import { describe, expect, it } from "vitest";
import type { CountryConfig } from "../types/countryConfig";
import { getConfiguredCountryCodes, getCountryConfigByCountryCode } from "./countryResolver";
import type {
  CountryOperationalEvidence as ScopedCountryOperationalEvidence,
  CountryOperationalReleaseScope,
} from "./countryLaunchGate";
import {
  evaluateCountryOperationalLaunch,
  type CountryOperationalEvidence,
} from "./countryOperationalLaunchGate";

const FIRST_WAVE_COUNTRY_CODES = ["AU", "CA", "GB", "JP", "KR", "US"] as const;
const NEXT_PRIORITY_COUNTRY_CODES = ["SG", "CN", "HK", "TW", "IN"] as const;

const unverifiedEvidence: CountryOperationalEvidence = {
  domainBinding: "NEEDS_REVIEW",
  authCallback: "NEEDS_REVIEW",
  sessionCookies: "NEEDS_REVIEW",
  authRecoveryEvidence: "NEEDS_REVIEW",
  databaseMigrationSafety: "NEEDS_REVIEW",
  tenantDataIsolation: "NEEDS_REVIEW",
  matterOwnershipAssignmentAuthority: "NEEDS_REVIEW",
  authorizationRoleAuthority: "NEEDS_REVIEW",
  communicationsRules: "NEEDS_REVIEW",
  recordingConsentEvidence: "NEEDS_REVIEW",
  legalComplianceEvidence: "NEEDS_REVIEW",
  privacyLifecycleEvidence: "NEEDS_REVIEW",
  dataResidency: "NEEDS_REVIEW",
  localization: "NEEDS_REVIEW",
  requiredIntegrations: "NEEDS_REVIEW",
  commercialReadiness: "NEEDS_REVIEW",
  roomFactoryTemplate: "NEEDS_REVIEW",
  paymentOperations: "NEEDS_REVIEW",
  observabilityIncidentResponse: "NEEDS_REVIEW",
  qaSecurityRegression: "NEEDS_REVIEW",
  previewSmokeTest: "NEEDS_REVIEW",
  deploymentProtection: "NEEDS_REVIEW",
  rollbackPath: "NEEDS_REVIEW",
};

const verifiedEvidence: CountryOperationalEvidence = {
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

const expectedScope: CountryOperationalReleaseScope = {
  releaseCandidateSha: "release-sha-for-test",
  migrationApplySetFingerprint: "migration-fingerprint-for-test",
  roomFactoryTemplateFingerprint: "room-factory-fingerprint-for-test",
  hostedOperationalDataFingerprint: "hosted-data-fingerprint-for-test",
};

function makeScopedReleaseEvidence(countryCode: string): ScopedCountryOperationalEvidence {
  return {
    countryCode,
    environment: "HOSTED_PRODUCTION",
    ...expectedScope,
    countryTermsReviewed: true,
    positiveLocalPrice: true,
    providerOfferReviewed: true,
    recordingPolicyReviewed: true,
    paymentProviderRegistryReady: true,
    paymentEventLedgerReady: true,
    serviceOrderIdempotencyReady: true,
    authDataIsolationVerified: true,
    roomFactoryIsolationVerified: true,
    roomFactorySourceReconciled: true,
    linkedMigrationApplySetVerified: true,
    authRecoveryE2EVerified: true,
    authenticatedLocalizationBrowserVerified: true,
    securityRegressionVerified: true,
    observabilityReady: true,
    rollbackVerified: true,
  };
}

function makeSubdivisionReviewsReady(
  subdivisions: CountryConfig["states"],
): CountryConfig["states"] {
  if (!subdivisions) return undefined;

  return Object.fromEntries(
    Object.entries(subdivisions).map(([code, subdivision]) => [
      code,
      {
        ...subdivision,
        taxStatus: "READY" as const,
        complianceStatus: "READY" as const,
      },
    ]),
  );
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
    states: makeSubdivisionReviewsReady(config.states),
    provinces: makeSubdivisionReviewsReady(config.provinces),
  };
}

describe("country operational launch readiness gate", () => {
  it("keeps both rollout waves configured and fails every configured country closed without evidence", () => {
    const configuredCountryCodes = getConfiguredCountryCodes();

    for (const countryCode of [...FIRST_WAVE_COUNTRY_CODES, ...NEXT_PRIORITY_COUNTRY_CODES]) {
      expect(configuredCountryCodes, countryCode).toContain(countryCode);
    }

    for (const countryCode of configuredCountryCodes) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();

      const gate = evaluateCountryOperationalLaunch(config!, unverifiedEvidence);
      expect(gate.launchable, countryCode).toBe(false);
      expect(gate.operationalBlockers, countryCode).toContain("AUTH_RECOVERY_EVIDENCE_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("DATABASE_MIGRATION_SAFETY_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("TENANT_DATA_ISOLATION_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain(
        "MATTER_OWNERSHIP_ASSIGNMENT_AUTHORITY_NOT_VERIFIED",
      );
      expect(gate.operationalBlockers, countryCode).toContain("AUTHORIZATION_ROLE_AUTHORITY_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("RECORDING_CONSENT_EVIDENCE_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("LEGAL_COMPLIANCE_EVIDENCE_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("PRIVACY_LIFECYCLE_EVIDENCE_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("COMMERCIAL_READINESS_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("ROOM_FACTORY_TEMPLATE_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("PAYMENT_OPERATIONS_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain(
        "OBSERVABILITY_INCIDENT_RESPONSE_NOT_VERIFIED",
      );
      expect(gate.operationalBlockers, countryCode).toContain("QA_SECURITY_REGRESSION_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("DEPLOYMENT_PROTECTION_NOT_VERIFIED");
      expect(gate.operationalBlockers, countryCode).toContain("SCOPED_RELEASE_AUTHORITY_NOT_VERIFIED");
    }
  });

  it("does not allow complete operational evidence to bypass country legal, tax or payment blockers", () => {
    const config = getCountryConfigByCountryCode("AU");
    expect(config).not.toBeNull();

    const gate = evaluateCountryOperationalLaunch(config!, verifiedEvidence);
    expect(gate.launchable).toBe(false);
    expect(gate.operationalBlockers).toEqual([
      "SUBDIVISION_TAX_REVIEW_NOT_VERIFIED",
      "SUBDIVISION_COMPLIANCE_REVIEW_NOT_VERIFIED",
      "SCOPED_RELEASE_AUTHORITY_NOT_VERIFIED",
    ]);
    expect(gate.countryGate.blockers.length).toBeGreaterThan(0);
    expect(gate.scopedReleaseGate).toBeNull();
  });

  it("requires explicit READY tax and compliance review for every declared state or province", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const globallyReadyButSubdivisionUnreviewed = {
      ...makeCountryGateReady(base!),
      states: base!.states,
    };
    const scopedEvidence = makeScopedReleaseEvidence("AU");

    const unresolvedGate = evaluateCountryOperationalLaunch(
      globallyReadyButSubdivisionUnreviewed,
      verifiedEvidence,
      scopedEvidence,
      expectedScope,
    );

    expect(unresolvedGate.countryGate).toEqual({ launchable: true, blockers: [] });
    expect(unresolvedGate.scopedReleaseGate).toEqual({ launchable: true, blockers: [] });
    expect(unresolvedGate.launchable).toBe(false);
    expect(unresolvedGate.operationalBlockers).toEqual([
      "SUBDIVISION_TAX_REVIEW_NOT_VERIFIED",
      "SUBDIVISION_COMPLIANCE_REVIEW_NOT_VERIFIED",
    ]);

    const allReady = makeCountryGateReady(base!);
    expect(allReady.states?.NSW).toBeDefined();
    const oneTaxReviewRegressed: CountryConfig = {
      ...allReady,
      states: {
        ...allReady.states,
        NSW: {
          ...allReady.states!.NSW,
          taxStatus: "NEEDS_REVIEW",
        },
      },
    };
    const taxRegressionGate = evaluateCountryOperationalLaunch(
      oneTaxReviewRegressed,
      verifiedEvidence,
      scopedEvidence,
      expectedScope,
    );

    expect(taxRegressionGate.launchable).toBe(false);
    expect(taxRegressionGate.operationalBlockers).toEqual([
      "SUBDIVISION_TAX_REVIEW_NOT_VERIFIED",
    ]);
  });

  it("fails closed when hardened evidence added after legacy callers is omitted", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);
    const {
      authRecoveryEvidence: _authRecoveryEvidence,
      databaseMigrationSafety: _databaseMigrationSafety,
      tenantDataIsolation: _tenantDataIsolation,
      matterOwnershipAssignmentAuthority: _matterOwnershipAssignmentAuthority,
      authorizationRoleAuthority: _authorizationRoleAuthority,
      recordingConsentEvidence: _recordingConsentEvidence,
      legalComplianceEvidence: _legalComplianceEvidence,
      privacyLifecycleEvidence: _privacyLifecycleEvidence,
      commercialReadiness: _commercialReadiness,
      roomFactoryTemplate: _roomFactoryTemplate,
      paymentOperations: _paymentOperations,
      observabilityIncidentResponse: _observabilityIncidentResponse,
      qaSecurityRegression: _qaSecurityRegression,
      deploymentProtection: _deploymentProtection,
      ...legacyEvidence
    } = verifiedEvidence;

    const gate = evaluateCountryOperationalLaunch(ready, legacyEvidence);

    expect(gate.countryGate.launchable).toBe(true);
    expect(gate.launchable).toBe(false);
    expect(gate.operationalBlockers).toEqual([
      "AUTH_RECOVERY_EVIDENCE_NOT_VERIFIED",
      "DATABASE_MIGRATION_SAFETY_NOT_VERIFIED",
      "TENANT_DATA_ISOLATION_NOT_VERIFIED",
      "MATTER_OWNERSHIP_ASSIGNMENT_AUTHORITY_NOT_VERIFIED",
      "AUTHORIZATION_ROLE_AUTHORITY_NOT_VERIFIED",
      "RECORDING_CONSENT_EVIDENCE_NOT_VERIFIED",
      "LEGAL_COMPLIANCE_EVIDENCE_NOT_VERIFIED",
      "PRIVACY_LIFECYCLE_EVIDENCE_NOT_VERIFIED",
      "COMMERCIAL_READINESS_NOT_VERIFIED",
      "ROOM_FACTORY_TEMPLATE_NOT_VERIFIED",
      "PAYMENT_OPERATIONS_NOT_VERIFIED",
      "OBSERVABILITY_INCIDENT_RESPONSE_NOT_VERIFIED",
      "QA_SECURITY_REGRESSION_NOT_VERIFIED",
      "DEPLOYMENT_PROTECTION_NOT_VERIFIED",
      "SCOPED_RELEASE_AUTHORITY_NOT_VERIFIED",
    ]);
  });

  it("keeps database safety independent from QA and deployment evidence", () => {
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
    expect(gate.operationalBlockers).toEqual([
      "DATABASE_MIGRATION_SAFETY_NOT_VERIFIED",
      "SCOPED_RELEASE_AUTHORITY_NOT_VERIFIED",
    ]);
  });

  it("keeps Matter assignment authority and authorization-role authority independent from tenant isolation", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);

    const gate = evaluateCountryOperationalLaunch(ready, {
      ...verifiedEvidence,
      tenantDataIsolation: "VERIFIED",
      matterOwnershipAssignmentAuthority: "NEEDS_REVIEW",
      authorizationRoleAuthority: "NEEDS_REVIEW",
    });

    expect(gate.launchable).toBe(false);
    expect(gate.operationalBlockers).toEqual([
      "MATTER_OWNERSHIP_ASSIGNMENT_AUTHORITY_NOT_VERIFIED",
      "AUTHORIZATION_ROLE_AUTHORITY_NOT_VERIFIED",
      "SCOPED_RELEASE_AUTHORITY_NOT_VERIFIED",
    ]);
  });

  it("keeps complete generic VERIFIED flags blocked without scoped release authority", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);

    const gate = evaluateCountryOperationalLaunch(ready, verifiedEvidence);

    expect(gate.countryGate).toEqual({ launchable: true, blockers: [] });
    expect(gate.scopedReleaseGate).toBeNull();
    expect(gate.launchable).toBe(false);
    expect(gate.operationalBlockers).toEqual(["SCOPED_RELEASE_AUTHORITY_NOT_VERIFIED"]);
  });

  it("only becomes launchable when generic evidence and exact scoped release authority both pass", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);
    const scopedEvidence = makeScopedReleaseEvidence("AU");

    expect(
      evaluateCountryOperationalLaunch(
        ready,
        verifiedEvidence,
        scopedEvidence,
        expectedScope,
      ),
    ).toEqual({
      launchable: true,
      countryGate: { launchable: true, blockers: [] },
      scopedReleaseGate: { launchable: true, blockers: [] },
      operationalBlockers: [],
    });
  });

  it("fails closed when scoped release evidence is for another release fingerprint", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeCountryGateReady(base!);
    const scopedEvidence = {
      ...makeScopedReleaseEvidence("AU"),
      releaseCandidateSha: "different-release-sha",
    };

    const gate = evaluateCountryOperationalLaunch(
      ready,
      verifiedEvidence,
      scopedEvidence,
      expectedScope,
    );

    expect(gate.launchable).toBe(false);
    expect(gate.scopedReleaseGate?.blockers).toContain("OPERATIONAL_EVIDENCE_RELEASE_MISMATCH");
    expect(gate.operationalBlockers).toEqual(["SCOPED_RELEASE_AUTHORITY_NOT_VERIFIED"]);
  });
});
