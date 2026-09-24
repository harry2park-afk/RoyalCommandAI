import { describe, expect, it } from "vitest";
import evidence from "./first-wave-country-identity-authority-readback-20260924.json";

describe("first-wave trusted country identity authority readback", () => {
  it("records a read-only production-safe snapshot", () => {
    expect(evidence.mode).toBe("READ_ONLY_AGGREGATE");
    expect(evidence.production_mutation).toBe(false);
  });

  it("does not treat self-editable user metadata as launch authority", () => {
    expect(evidence.auth_users_total).toBeGreaterThan(0);
    expect(evidence.self_editable_user_metadata_country_users).toBeGreaterThan(0);
    expect(evidence.trusted_app_metadata_country_users).toBe(0);
    expect(evidence.status).toBe("HOLD_TRUSTED_COUNTRY_IDENTITY_NOT_ESTABLISHED");
  });

  it("keeps the October first wave behind the same trusted-country gate", () => {
    expect(evidence.first_wave).toEqual(["AU", "US", "CA", "KR", "JP", "GB"]);
  });
});
