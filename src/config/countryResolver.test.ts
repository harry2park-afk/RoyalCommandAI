import { describe, expect, it } from "vitest";
import {
  getConfiguredCountryCodes,
  getCountryCodeByDomain,
  getCountryConfigByCountryCode,
  getCountryConfigByDomain,
  getCountryConfigForRequest,
  hasCountryConfig,
} from "./countryResolver";

describe("country domain routing", () => {
  it("routes the Australian public domain to AU settings", () => {
    expect(getCountryConfigByDomain("atyourcommandai.com.au")?.countryCode).toBe("AU");
    expect(getCountryConfigByDomain("www.atyourcommandai.com.au")?.countryCode).toBe("AU");
  });

  it("routes the US public domain to US settings", () => {
    expect(getCountryConfigByDomain("atyourcommandai.com")?.countryCode).toBe("US");
    expect(getCountryConfigByDomain("www.atyourcommandai.com")?.countryCode).toBe("US");
  });

  it("normalizes host casing and ports", () => {
    expect(getCountryConfigByDomain("WWW.ATYOURCOMMANDAI.COM.AU:443")?.countryCode).toBe("AU");
    expect(getCountryConfigByDomain("ATYOURCOMMANDAI.COM:443")?.countryCode).toBe("US");
  });

  it("keeps the global Royal Command domains on Global Core", () => {
    expect(getCountryCodeByDomain("royalcommand.ai")).toBe("GLOBAL");
    expect(getCountryConfigByDomain("royalcommand.ai")).toBeNull();
    expect(getCountryConfigByDomain("www.royalcommand.ai")).toBeNull();
    expect(getCountryConfigByDomain("royalcommandai.com")).toBeNull();
  });

  it("allows explicit Canada selection only on the North America domain", () => {
    expect(getCountryConfigForRequest("atyourcommandai.com", "CA")?.countryCode).toBe("CA");
    expect(getCountryConfigForRequest("atyourcommandai.com.au", "CA")?.countryCode).toBe("AU");
  });

  it("does not guess a country for an unknown domain", () => {
    expect(getCountryCodeByDomain("example.invalid")).toBeNull();
    expect(getCountryConfigByDomain("example.invalid")).toBeNull();
  });

  it("registers the first six launch-country configs without activating unverified domains", () => {
    expect(getConfiguredCountryCodes()).toEqual(["AU", "CA", "GB", "JP", "KR", "US"]);
    expect(hasCountryConfig("au")).toBe(true);
    expect(hasCountryConfig("JP")).toBe(true);
    expect(hasCountryConfig("KR")).toBe(true);
    expect(hasCountryConfig("GB")).toBe(true);

    expect(getCountryConfigByCountryCode("US")?.currency).toBe("USD");
    expect(getCountryConfigByCountryCode("GB")?.currency).toBe("GBP");
    expect(getCountryConfigByCountryCode("JP")?.currency).toBe("JPY");
    expect(getCountryConfigByCountryCode("KR")?.currency).toBe("KRW");

    // Configuration is not activation. Country domains remain unbound until
    // ownership, hosting, auth callbacks and launch gates are verified.
    expect(getCountryCodeByDomain("royalcommand.example.uk")).toBeNull();
    expect(getCountryCodeByDomain("royalcommand.example.jp")).toBeNull();
    expect(getCountryCodeByDomain("royalcommand.example.kr")).toBeNull();
  });

  it("requires explicit tax-structure review metadata for every first-wave country", () => {
    for (const countryCode of getConfiguredCountryCodes()) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();
      expect(config?.taxStructure, countryCode).toBeDefined();
      expect(config?.taxStructure?.system.trim().length, countryCode).toBeGreaterThan(0);
      expect(["READY", "NEEDS_REVIEW", "BLOCKED"], countryCode).toContain(
        config?.taxStructure?.status,
      );
    }
  });
});
