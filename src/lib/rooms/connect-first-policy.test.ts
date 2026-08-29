import { describe, expect, it } from "vitest";
import { decideDelivery, rankProvider, type ProviderCandidate } from "./connect-first-policy";

function candidate(overrides: Partial<ProviderCandidate> = {}): ProviderCandidate {
  return {
    active: true,
    connectionStatus: "available",
    reviewStatus: "approved",
    apiAvailable: true,
    oauthAvailable: true,
    commercialModel: "rc_resale",
    priority: 10,
    ...overrides,
  };
}

describe("Royal Command first provider policy", () => {
  it("prefers RC embedded over external fallback", () => {
    const embedded = candidate({ deliverySurface: "rc_embedded" });
    const external = candidate({ deliverySurface: "external_fallback", providerFitScore: 1000 });
    const decision = decideDelivery("connect_first", [external, embedded]);
    expect(decision.mode).toBe("connect");
    expect(decision.provider).toBe(embedded);
  });

  it("prefers RC managed over external fallback", () => {
    const managed = candidate({ deliverySurface: "rc_managed" });
    const external = candidate({ deliverySurface: "external_fallback" });
    expect(rankProvider(managed)).toBeGreaterThan(rankProvider(external));
    expect(decideDelivery("connect_first", [external, managed]).provider).toBe(managed);
  });

  it("allows external fallback only when no RC-operated option exists", () => {
    const external = candidate({ deliverySurface: "external_fallback" });
    const decision = decideDelivery("connect_first", [external]);
    expect(decision.mode).toBe("connect");
    expect(decision.provider).toBe(external);
  });

  it("uses RC native when the service is explicitly strategic core", () => {
    const external = candidate({ deliverySurface: "rc_embedded" });
    const decision = decideDelivery("rc_native", [external]);
    expect(decision.mode).toBe("rc_native");
    expect(decision.provider).toBeNull();
  });
});
