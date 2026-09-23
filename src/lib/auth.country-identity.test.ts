import { describe, expect, it } from "vitest";
import { getTrustedCountryCode } from "./auth";

describe("trusted country identity", () => {
  it("accepts only server-controlled app_metadata country_code", () => {
    expect(
      getTrustedCountryCode({
        app_metadata: { country_code: "AU" },
      }),
    ).toBe("AU");
  });

  it("does not treat user metadata as country authority", () => {
    const selfEditableUserMetadata = { country_code: "US" };

    expect(
      getTrustedCountryCode({
        app_metadata: {},
        // Deliberately not part of the accepted helper input. This mirrors the
        // Supabase boundary: user_metadata can be changed by the signed-in user
        // and therefore cannot select legal/commercial/payment jurisdiction.
        ...({ user_metadata: selfEditableUserMetadata } as Record<string, unknown>),
      }),
    ).toBe("");
  });

  it("fails closed when trusted country metadata is missing or malformed", () => {
    expect(getTrustedCountryCode({})).toBe("");
    expect(getTrustedCountryCode({ app_metadata: { country_code: 61 } })).toBe("");
    expect(getTrustedCountryCode({ app_metadata: { country_code: null } })).toBe("");
  });
});
