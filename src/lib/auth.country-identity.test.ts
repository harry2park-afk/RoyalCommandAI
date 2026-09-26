import { describe, expect, it } from "vitest";
import { FIRST_WAVE_COUNTRY_CODES, getTrustedCountryCode } from "./auth";

describe("trusted country identity", () => {
  it("accepts every first-wave server-controlled country", () => {
    for (const countryCode of FIRST_WAVE_COUNTRY_CODES) {
      expect(
        getTrustedCountryCode({
          app_metadata: { country_code: countryCode },
        }),
      ).toBe(countryCode);
    }
  });

  it("does not treat user metadata as country authority", () => {
    const selfEditableUserMetadata = {
      country_code: "US",
      requested_country_code: "CA",
    };

    expect(
      getTrustedCountryCode({
        app_metadata: {},
        ...({ user_metadata: selfEditableUserMetadata } as Record<string, unknown>),
      }),
    ).toBe("");
  });

  it("keeps trusted app metadata authoritative over signup country requests", () => {
    expect(
      getTrustedCountryCode({
        app_metadata: { country_code: "GB" },
        ...({
          user_metadata: {
            country_code: "US",
            requested_country_code: "JP",
          },
        } as Record<string, unknown>),
      }),
    ).toBe("GB");
  });

  it("fails closed for countries outside the current launch allowlist", () => {
    expect(
      getTrustedCountryCode({ app_metadata: { country_code: "SG" } }),
    ).toBe("");
    expect(
      getTrustedCountryCode({ app_metadata: { country_code: "au" } }),
    ).toBe("");
    expect(
      getTrustedCountryCode({ app_metadata: { country_code: "ZZ" } }),
    ).toBe("");
  });

  it("fails closed when trusted country metadata is missing or malformed", () => {
    expect(getTrustedCountryCode({})).toBe("");
    expect(getTrustedCountryCode({ app_metadata: { country_code: 61 } })).toBe("");
    expect(getTrustedCountryCode({ app_metadata: { country_code: null } })).toBe("");
  });
});
