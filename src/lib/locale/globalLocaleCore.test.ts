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
    expect(normalizeLegacyLanguage("en", "CA")).toBe("en-CA");
    expect(normalizeLegacyLanguage("en", "GB")).toBe("en-GB");
    expect(normalizeLegacyLanguage("en")).toBe("en-US");
  });

  it("maps first-wave legacy country values safely", () => {
    expect(normalizeLegacyLanguage("AU")).toBe("en-AU");
    expect(normalizeLegacyLanguage("US")).toBe("en-US");
    expect(normalizeLegacyLanguage("CA")).toBe("en-CA");
    expect(normalizeLegacyLanguage("GB")).toBe("en-GB");
    expect(normalizeLegacyLanguage("KR")).toBe("ko-KR");
    expect(normalizeLegacyLanguage("JP")).toBe("ja-JP");
  });

  it("maps current Korean legacy value safely", () => {
    expect(normalizeLegacyLanguage("ko", "AU")).toBe("ko-KR");
  });

  it("maps English country packs automatically", () => {
    expect(localeForEnglishCountry("AU")).toBe("en-AU");
    expect(localeForEnglishCountry("US")).toBe("en-US");
    expect(localeForEnglishCountry("CA")).toBe("en-CA");
    expect(localeForEnglishCountry("GB")).toBe("en-GB");
    expect(localeForEnglishCountry("KR")).toBe("en-US");
    expect(localeForEnglishCountry("JP")).toBe("en-US");
  });

  it("does not let a stale English regional preference defeat current country pack", () => {
    expect(resolveGlobalLocale({ explicitUiLocale: "en-AU", legacyLanguage: "en", countryCode: "US" }).locale).toBe("en-US");
    expect(resolveGlobalLocale({ explicitUiLocale: "en-US", legacyLanguage: "en", countryCode: "AU" }).locale).toBe("en-AU");
    expect(resolveGlobalLocale({ explicitUiLocale: "en-US", legacyLanguage: "en", countryCode: "CA" }).locale).toBe("en-CA");
    expect(resolveGlobalLocale({ explicitUiLocale: "en-US", legacyLanguage: "en", countryCode: "GB" }).locale).toBe("en-GB");
  });

  it("lets a non-English UI locale override country without changing country", () => {
    const result = resolveGlobalLocale({ explicitUiLocale: "ko-KR", legacyLanguage: "ko", countryCode: "AU" });
    expect(result.locale).toBe("ko-KR");
    expect(result.countryCode).toBe("AU");
  });

  it("uses first-wave country defaults when no language has been selected", () => {
    expect(resolveGlobalLocale({ countryCode: "AU" }).locale).toBe("en-AU");
    expect(resolveGlobalLocale({ countryCode: "US" }).locale).toBe("en-US");
    expect(resolveGlobalLocale({ countryCode: "CA" }).locale).toBe("en-CA");
    expect(resolveGlobalLocale({ countryCode: "KR" }).locale).toBe("ko-KR");
    expect(resolveGlobalLocale({ countryCode: "JP" }).locale).toBe("ja-JP");
    expect(resolveGlobalLocale({ countryCode: "GB" }).locale).toBe("en-GB");
  });

  it("rejects invalid locale input and falls back safely", () => {
    expect(resolveGlobalLocale({ explicitUiLocale: "not_a_locale" }).locale).toBe("en-US");
  });
});
