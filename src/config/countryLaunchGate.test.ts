import { describe, expect, it } from "vitest";
import { evaluateCountryLaunch, evaluateCountryOperationalLaunch } from "./countryLaunchGate";
import { getConfiguredCountryCodes, getCountryConfigByCountryCode } from "./countryResolver";
import type { CountryConfig } from "../types/countryConfig";

const FIRST_WAVE = ["AU", "US", "CA", "KR", "JP", "GB"] as const;

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

    expect(evaluateCountryLaunch(otherwiseReady)).toEqual({
      launchable: false,
      blockers: ["TAX_STRUCTURE_REVIEW"],
    });
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

      const gate = evaluateCountryOperationalLaunch(asConfigReady(base!), {
        countryTermsReviewed: false,
        positiveLocalPrice: false,
        providerOfferReviewed: false,
        recordingPolicyReviewed: false,
        paymentProviderRegistryReady: false,
        paymentEventLedgerReady: false,
        serviceOrderIdempotencyReady: false,
        authDataIsolationVerified: false,
        roomFactoryIsolationVerified: false,
      });

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
        ],
      });
    }
  });

  it("only becomes operationally launchable when config and every launch-critical evidence class are verified", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();

    expect(
      evaluateCountryOperationalLaunch(asConfigReady(base!), {
        countryTermsReviewed: true,
        positiveLocalPrice: true,
        providerOfferReviewed: true,
        recordingPolicyReviewed: true,
        paymentProviderRegistryReady: true,
        paymentEventLedgerReady: true,
        serviceOrderIdempotencyReady: true,
        authDataIsolationVerified: true,
        roomFactoryIsolationVerified: true,
      }),
    ).toEqual({ launchable: true, blockers: [] });
  });
});
