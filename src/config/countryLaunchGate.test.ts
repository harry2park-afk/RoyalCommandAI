import { describe, expect, it } from "vitest";
import {
  evaluateCountryLaunch,
  evaluateCountryOperationalLaunch,
  type CountryOperationalEvidence,
  type CountryOperationalReleaseScope,
  type LaunchBlockerCode,
} from "./countryLaunchGate";
import { getConfiguredCountryCodes, getCountryConfigByCountryCode } from "./countryResolver";
import type { CountryConfig } from "../types/countryConfig";

const FIRST_WAVE = ["AU", "US", "CA", "KR", "JP", "GB"] as const;
const RELEASE_SCOPE: CountryOperationalReleaseScope = {
  releaseCandidateSha: "1111111111111111111111111111111111111111",
  migrationApplySetFingerprint: "2222222222222222222222222222222222222222222222222222222222222222",
  roomFactoryTemplateFingerprint: "3333333333333333333333333333333333333333333333333333333333333333",
  hostedOperationalDataFingerprint: "4444444444444444444444444444444444444444444444444444444444444444",
};
type OperationalEvidenceFlag = Exclude<
  keyof CountryOperationalEvidence,
  | "countryCode"
  | "environment"
  | "releaseCandidateSha"
  | "migrationApplySetFingerprint"
  | "roomFactoryTemplateFingerprint"
  | "hostedOperationalDataFingerprint"
>;

function readyOperationalEvidence(countryCode: string): CountryOperationalEvidence {
  return {
    countryCode,
    environment: "HOSTED_PRODUCTION",
    ...RELEASE_SCOPE,
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

function asConfigReady(base: CountryConfig): CountryConfig {
  return {
    ...base,
    compliance: {
      legal: "READY",
      tax: "READY",
      medical: "READY",
      investment: "READY",
      privacy: "READY",
    },
    taxStructure: base.taxStructure ? { ...base.taxStructure, status: "READY" } : undefined,
    payments: { ...base.payments, status: "CONNECTED" },
    tax: { ...base.tax, status: "CONNECTED" },
  };
}

describe("country launch readiness gate", () => {
  it("keeps the first wave plus next-priority Singapore, China, Hong Kong, Taiwan and India blocked until launch-critical reviews and connections are verified", () => {
    expect(getConfiguredCountryCodes()).toEqual(["AU", "CA", "CN", "GB", "HK", "IN", "JP", "KR", "SG", "TW", "US"]);

    for (const countryCode of getConfiguredCountryCodes()) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();
      const gate = evaluateCountryLaunch(config!);
      expect(gate.launchable, countryCode).toBe(false);
      expect(gate.blockers.length, countryCode).toBeGreaterThan(0);
    }
  });

  it("keeps Singapore, China, Hong Kong, Taiwan and India explicitly blocked before human review and provider connection", () => {
    for (const countryCode of ["SG", "CN", "HK", "TW", "IN"] as const) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();
      const gate = evaluateCountryLaunch(config!);
      expect(gate.launchable, countryCode).toBe(false);
      expect(gate.blockers, countryCode).toEqual([
        "LEGAL_REVIEW",
        "TAX_REVIEW",
        "TAX_STRUCTURE_REVIEW",
        "MEDICAL_REVIEW",
        "INVESTMENT_REVIEW",
        "PRIVACY_REVIEW",
        "PAYMENTS_NOT_CONNECTED",
        "TAX_NOT_CONNECTED",
      ]);
    }
  });

  it("blocks launch while a country-specific tax structure still needs review", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base?.taxStructure?.status).toBe("NEEDS_REVIEW");
    expect(evaluateCountryLaunch(base!).blockers).toContain("TAX_STRUCTURE_REVIEW");
  });

  it("fails closed when country-specific tax structure evidence is missing", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const otherwiseReady: CountryConfig = {
      ...base!,
      compliance: {
        legal: "READY",
        tax: "READY",
        medical: "READY",
        investment: "READY",
        privacy: "READY",
      },
      taxStructure: undefined,
      payments: { ...base!.payments, status: "CONNECTED" },
      tax: { ...base!.tax, status: "CONNECTED" },
    };
    expect(evaluateCountryLaunch(otherwiseReady)).toEqual({ launchable: false, blockers: ["TAX_STRUCTURE_REVIEW"] });
  });

  it("only becomes config-launchable when compliance, tax structure, payments and tax are all explicitly verified", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    expect(evaluateCountryLaunch(asConfigReady(base!))).toEqual({ launchable: true, blockers: [] });
  });

  it("keeps all first-wave countries blocked when config is ready but Hosted operational evidence is still absent", () => {
    for (const countryCode of FIRST_WAVE) {
      const base = getCountryConfigByCountryCode(countryCode);
      expect(base, countryCode).not.toBeNull();
      const gate = evaluateCountryOperationalLaunch(
        asConfigReady(base!),
        {
          countryCode,
          environment: "HOSTED_PRODUCTION",
          ...RELEASE_SCOPE,
          countryTermsReviewed: false,
          positiveLocalPrice: false,
          providerOfferReviewed: false,
          recordingPolicyReviewed: false,
          paymentProviderRegistryReady: false,
          paymentEventLedgerReady: false,
          serviceOrderIdempotencyReady: false,
          authDataIsolationVerified: false,
          roomFactoryIsolationVerified: false,
          roomFactorySourceReconciled: false,
          linkedMigrationApplySetVerified: false,
          authRecoveryE2EVerified: false,
          authenticatedLocalizationBrowserVerified: false,
          securityRegressionVerified: false,
          observabilityReady: false,
          rollbackVerified: false,
        },
        RELEASE_SCOPE,
      );
      expect(gate, countryCode).toEqual({
        launchable: false,
        blockers: [
          "COUNTRY_TERMS_NOT_REVIEWED",
          "LOCAL_PRICE_NOT_READY",
          "PROVIDER_OFFER_NOT_REVIEWED",
          "RECORDING_POLICY_NOT_REVIEWED",
          "PAYMENT_PROVIDER_REGISTRY_NOT_READY",
          "PAYMENT_EVENT_LEDGER_NOT_READY",
          "SERVICE_ORDER_IDEMPOTENCY_NOT_READY",
          "AUTH_DATA_ISOLATION_NOT_VERIFIED",
          "ROOM_FACTORY_ISOLATION_NOT_VERIFIED",
          "ROOM_FACTORY_SOURCE_RECONCILIATION_NOT_VERIFIED",
          "LINKED_MIGRATION_APPLY_SET_NOT_VERIFIED",
          "AUTH_RECOVERY_E2E_NOT_VERIFIED",
          "LOCALIZATION_BROWSER_REGRESSION_NOT_VERIFIED",
          "SECURITY_REGRESSION_NOT_VERIFIED",
          "OBSERVABILITY_NOT_READY",
          "ROLLBACK_NOT_VERIFIED",
        ],
      });
    }
  });

  it("fails closed when any deployment/runtime safety evidence class is individually missing", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const cases: Array<[OperationalEvidenceFlag, LaunchBlockerCode]> = [
      ["roomFactorySourceReconciled", "ROOM_FACTORY_SOURCE_RECONCILIATION_NOT_VERIFIED"],
      ["linkedMigrationApplySetVerified", "LINKED_MIGRATION_APPLY_SET_NOT_VERIFIED"],
      ["authRecoveryE2EVerified", "AUTH_RECOVERY_E2E_NOT_VERIFIED"],
      ["authenticatedLocalizationBrowserVerified", "LOCALIZATION_BROWSER_REGRESSION_NOT_VERIFIED"],
      ["securityRegressionVerified", "SECURITY_REGRESSION_NOT_VERIFIED"],
      ["observabilityReady", "OBSERVABILITY_NOT_READY"],
      ["rollbackVerified", "ROLLBACK_NOT_VERIFIED"],
    ];
    for (const [key, expectedBlocker] of cases) {
      const evidence: CountryOperationalEvidence = { ...readyOperationalEvidence("AU"), [key]: false };
      expect(evaluateCountryOperationalLaunch(asConfigReady(base!), evidence, RELEASE_SCOPE)).toEqual({
        launchable: false,
        blockers: [expectedBlocker],
      });
    }
  });

  it("fails closed when operational evidence belongs to another country", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    expect(evaluateCountryOperationalLaunch(asConfigReady(base!), readyOperationalEvidence("US"), RELEASE_SCOPE)).toEqual({
      launchable: false,
      blockers: ["OPERATIONAL_EVIDENCE_COUNTRY_MISMATCH"],
    });
  });

  it("fails closed when otherwise-complete evidence comes from Preview or disposable environments", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    for (const environment of ["PREVIEW", "DISPOSABLE"] as const) {
      expect(
        evaluateCountryOperationalLaunch(
          asConfigReady(base!),
          { ...readyOperationalEvidence("AU"), environment },
          RELEASE_SCOPE,
        ),
        environment,
      ).toEqual({
        launchable: false,
        blockers: ["OPERATIONAL_EVIDENCE_ENVIRONMENT_MISMATCH"],
      });
    }
  });

  it("fails closed when otherwise-complete evidence is stale for another release candidate", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    expect(
      evaluateCountryOperationalLaunch(
        asConfigReady(base!),
        { ...readyOperationalEvidence("AU"), releaseCandidateSha: "2222222222222222222222222222222222222222" },
        RELEASE_SCOPE,
      ),
    ).toEqual({
      launchable: false,
      blockers: ["OPERATIONAL_EVIDENCE_RELEASE_MISMATCH"],
    });
  });

  it("fails closed when otherwise-complete evidence is stale for another migration apply set", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    expect(
      evaluateCountryOperationalLaunch(
        asConfigReady(base!),
        { ...readyOperationalEvidence("AU"), migrationApplySetFingerprint: "migration-set-v0" },
        RELEASE_SCOPE,
      ),
    ).toEqual({
      launchable: false,
      blockers: ["OPERATIONAL_EVIDENCE_MIGRATION_SCOPE_MISMATCH"],
    });
  });

  it("fails closed when otherwise-complete evidence is stale for another Room Factory/template contract", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    expect(
      evaluateCountryOperationalLaunch(
        asConfigReady(base!),
        { ...readyOperationalEvidence("AU"), roomFactoryTemplateFingerprint: "room-factory-template-set-v0" },
        RELEASE_SCOPE,
      ),
    ).toEqual({
      launchable: false,
      blockers: ["OPERATIONAL_EVIDENCE_ROOM_FACTORY_SCOPE_MISMATCH"],
    });
  });

  it("fails closed when otherwise-complete evidence is stale for another Hosted operational-data snapshot", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    expect(
      evaluateCountryOperationalLaunch(
        asConfigReady(base!),
        { ...readyOperationalEvidence("AU"), hostedOperationalDataFingerprint: "hosted-operational-data-v0" },
        RELEASE_SCOPE,
      ),
    ).toEqual({
      launchable: false,
      blockers: ["OPERATIONAL_EVIDENCE_HOSTED_DATA_SCOPE_MISMATCH"],
    });
  });

  it("fails closed when the expected release scope itself is incomplete", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    expect(
      evaluateCountryOperationalLaunch(asConfigReady(base!), readyOperationalEvidence("AU"), {
        releaseCandidateSha: "",
        migrationApplySetFingerprint: "",
        roomFactoryTemplateFingerprint: "",
        hostedOperationalDataFingerprint: "",
      }),
    ).toEqual({
      launchable: false,
      blockers: [
        "OPERATIONAL_EVIDENCE_RELEASE_MISMATCH",
        "OPERATIONAL_EVIDENCE_MIGRATION_SCOPE_MISMATCH",
        "OPERATIONAL_EVIDENCE_ROOM_FACTORY_SCOPE_MISMATCH",
        "OPERATIONAL_EVIDENCE_HOSTED_DATA_SCOPE_MISMATCH",
      ],
    });
  });

  it("only becomes operationally launchable when same-country Hosted Production evidence is bound to the exact release scope and every launch-critical class is verified", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    expect(evaluateCountryOperationalLaunch(asConfigReady(base!), readyOperationalEvidence("AU"), RELEASE_SCOPE)).toEqual({
      launchable: true,
      blockers: [],
    });
  });
});
