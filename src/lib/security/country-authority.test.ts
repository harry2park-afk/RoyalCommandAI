import { describe, expect, it } from "vitest";
import {
  getRequestedCountryCode,
  isCountryAuthorityAdmin,
  isCountryAuthorityEnabled,
  isFirstWaveCountryCode,
  parseCountryAuthorityAdminUserIds,
  requestedCountryMatchesAssignment,
} from "./country-authority";

describe("country authority guard", () => {
  it("accepts only the first-wave country codes", () => {
    for (const countryCode of ["AU", "US", "CA", "KR", "JP", "GB"]) {
      expect(isFirstWaveCountryCode(countryCode)).toBe(true);
    }
    for (const countryCode of ["SG", "au", "ZZ", "", null, 61]) {
      expect(isFirstWaveCountryCode(countryCode)).toBe(false);
    }
  });

  it("stays disabled unless the server explicitly enables it", () => {
    expect(isCountryAuthorityEnabled({})).toBe(false);
    expect(isCountryAuthorityEnabled({ RC_COUNTRY_AUTHORITY_ENABLED: "TRUE" })).toBe(false);
    expect(isCountryAuthorityEnabled({ RC_COUNTRY_AUTHORITY_ENABLED: "true" })).toBe(true);
  });

  it("requires both the kill switch and a server-side actor allowlist", () => {
    const enabled = {
      RC_COUNTRY_AUTHORITY_ENABLED: "true",
      RC_COUNTRY_AUTHORITY_ADMIN_USER_IDS: "admin-1, admin-2",
    };
    expect(isCountryAuthorityAdmin("admin-1", enabled)).toBe(true);
    expect(isCountryAuthorityAdmin("admin-2", enabled)).toBe(true);
    expect(isCountryAuthorityAdmin("customer-1", enabled)).toBe(false);
    expect(
      isCountryAuthorityAdmin("admin-1", {
        ...enabled,
        RC_COUNTRY_AUTHORITY_ENABLED: "false",
      }),
    ).toBe(false);
    expect(parseCountryAuthorityAdminUserIds(" one, ,two ")).toEqual(
      new Set(["one", "two"]),
    );
  });

  it("treats signup country only as a request and fails closed outside the first wave", () => {
    expect(
      getRequestedCountryCode({
        user_metadata: { requested_country_code: "AU" },
      }),
    ).toBe("AU");
    expect(
      getRequestedCountryCode({
        user_metadata: { requested_country_code: "SG" },
      }),
    ).toBe("");
    expect(getRequestedCountryCode({ user_metadata: {} })).toBe("");
  });

  it("allows assignment only when the target requested the exact first-wave country", () => {
    const target = { user_metadata: { requested_country_code: "CA" } };
    expect(requestedCountryMatchesAssignment(target, "CA")).toBe(true);
    expect(requestedCountryMatchesAssignment(target, "US")).toBe(false);
  });
});
