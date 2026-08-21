import { describe, expect, it } from "vitest";
import {
  getCountryConfigByDomain,
  getCountryConfigForRequest,
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
    expect(getCountryConfigByDomain("royalcommand.ai")).toBeNull();
    expect(getCountryConfigByDomain("www.royalcommand.ai")).toBeNull();
    expect(getCountryConfigByDomain("royalcommandai.com")).toBeNull();
  });

  it("allows explicit Canada selection only on the North America domain", () => {
    expect(getCountryConfigForRequest("atyourcommandai.com", "CA")?.countryCode).toBe("CA");
    expect(getCountryConfigForRequest("atyourcommandai.com.au", "CA")?.countryCode).toBe("AU");
  });

  it("does not guess a country for an unknown domain", () => {
    expect(getCountryConfigByDomain("example.invalid")).toBeNull();
  });
});
