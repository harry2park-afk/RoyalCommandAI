import { describe, expect, it } from "vitest";
import { GLOBAL_FALLBACK_LOCALE, localeForEnglishCountry, normalizeLegacyLanguage, resolveGlobalLocale } from "./globalLocaleCore";

describe("globalLocaleCore", () => {
  it("keeps the global fallback as US English", () => {
    expect(resolveGlobalLocale().locale).toBe("en-US");
    expect(GLOBAL_FALLBACK_LOCALE).toBe("en-US");
  });

  it("keeps one visible English choice and resolves its region from country", () => {
    expect(normalizeLegacyLanguage("en", "AU")).toBe("en-AU");
    expect(normalizeLegacyLanguage("English", "US")).toBe("en-US");
    expect(normalizeLegacyLanguage("en", "GB")).toBe("en-GB");
    expect(normalizeLegacyLanguage("en")).toBe("en-US");
  });

  it("maps current Korean legacy value safely", () => {
    expect(normalizeLegacyLanguage("ko", "AU")).toBe("ko-KR");
  });

  it("maps English country packs automatically", () => {
    expect(localeForEnglishCountry("AU")).toBe("en-AU");
    expect(localeForEnglishCountry("US")).toBe("en-US");
    expect(localeForEnglishCountry("GB")).toBe("en-GB");
    expect(localeForEnglishCountry("KR")).toBe("en-US");
  });

  it("does not let a stale English regional preference defeat current country pack", () => {
    expect(resolveGlobalLocale({ explicitUiLocale: "en-AU", legacyLanguage: "en", countryCode: "US" }).locale).toBe("en-US");
    expect(resolveGlobalLocale({ explicitUiLocale: "en-US", legacyLanguage: "en", countryCode: "AU" }).locale).toBe("en-AU");
    expect(resolveGlobalLocale({ explicitUiLocale: "en-US", legacyLanguage: "en", countryCode: "GB" }).locale).toBe("en-GB");
  });

  it("lets a non-English UI locale override country without changing country", () => {
    const result = resolveGlobalLocale({ explicitUiLocale: "ko-KR", legacyLanguage: "ko", countryCode: "AU" });
    expect(result.locale).toBe("ko-KR");
    expect(result.countryCode).toBe("AU");
  });

  it("uses country defaults when no language has been selected", () => {
    expect(resolveGlobalLocale({ countryCode: "AU" }).locale).toBe("en-AU");
    expect(resolveGlobalLocale({ countryCode: "US" }).locale).toBe("en-US");
    expect(resolveGlobalLocale({ countryCode: "GB" }).locale).toBe("en-GB");
  });

  it("rejects invalid locale input and falls back safely", () => {
    expect(resolveGlobalLocale({ explicitUiLocale: "not_a_locale" }).locale).toBe("en-US");
  });
});
