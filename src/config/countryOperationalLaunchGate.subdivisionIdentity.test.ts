import { describe, expect, it } from "vitest";
import type { CountryConfig } from "../types/countryConfig";
import {
  type CountryOperationalEvidence as ScopedCountryOperationalEvidence,
  type CountryOperationalReleaseScope,
} from "./countryLaunchGate";
import {
  evaluateCountryOperationalLaunch,
  type CountryOperationalEvidence,
} from "./countryOperationalLaunchGate";
import { getCountryConfigByCountryCode } from "./countryResolver";

const genericEvidence: CountryOperationalEvidence = {
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
  releaseCandidateSha: "subdivision-identity-test-release",
  migrationApplySetFingerprint: "subdivision-identity-test-migrations",
  roomFactoryTemplateFingerprint: "subdivision-identity-test-room-factory",
  hostedOperationalDataFingerprint: "subdivision-identity-test-hosted-data",
};

const scopedEvidence: ScopedCountryOperationalEvidence = {
  countryCode: "AU",
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

function makeReadyConfig(base: CountryConfig): CountryConfig {
  const readySubdivisions = (subdivisions: CountryConfig["states"]): CountryConfig["states"] =>
    subdivisions
      ? Object.fromEntries(
          Object.entries(subdivisions).map(([code, subdivision]) => [
            code,
            {
              ...subdivision,
              taxStatus: "READY" as const,
              complianceStatus: "READY" as const,
            },
          ]),
        )
      : undefined;

  return {
    ...base,
    compliance: {
      legal: "READY",
      tax: "READY",
      medical: "READY",
      investment: "READY",
      privacy: "READY",
    },
    taxStructure: base.taxStructure
      ? { ...base.taxStructure, status: "READY" }
      : { system: "verified-for-test", status: "READY" },
    payments: { ...base.payments, status: "CONNECTED" },
    tax: { ...base.tax, status: "CONNECTED" },
    states: readySubdivisions(base.states),
    provinces: readySubdivisions(base.provinces),
  };
}

describe("country operational launch subdivision identity guard", () => {
  it("keeps the reviewed AU subdivision inventory valid", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();

    const gate = evaluateCountryOperationalLaunch(
      makeReadyConfig(base!),
      genericEvidence,
      scopedEvidence,
      expectedScope,
    );

    expect(gate.operationalBlockers).not.toContain("SUBDIVISION_IDENTITY_NOT_VERIFIED");
  });

  it("fails closed on whitespace/case ambiguity, blank subdivision names, or state/province code collisions", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const ready = makeReadyConfig(base!);
    expect(ready.states?.NSW).toBeDefined();

    const malformedConfigs: CountryConfig[] = [
      {
        ...ready,
        states: {
          ...ready.states,
          NSW: undefined as never,
          " NSW": ready.states!.NSW,
        },
      },
      {
        ...ready,
        states: {
          ...ready.states,
          NSW: { ...ready.states!.NSW, name: "   " },
        },
      },
      {
        ...ready,
        provinces: {
          ...(ready.provinces ?? {}),
          NSW: {
            name: "Duplicate NSW jurisdiction",
            taxStatus: "READY",
            complianceStatus: "READY",
          },
        },
      },
    ];

    for (const config of malformedConfigs) {
      const gate = evaluateCountryOperationalLaunch(
        config,
        genericEvidence,
        scopedEvidence,
        expectedScope,
      );
      expect(gate.launchable).toBe(false);
      expect(gate.operationalBlockers).toContain("SUBDIVISION_IDENTITY_NOT_VERIFIED");
    }
  });
});
