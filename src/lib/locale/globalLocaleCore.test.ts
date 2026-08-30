import { describe, expect, it } from "vitest";
import { GLOBAL_FALLBACK_LOCALE, normalizeLegacyLanguage, resolveGlobalLocale } from "./globalLocaleCore";

describe("globalLocaleCore", () => {
  it("keeps the global fallback as US English", () => {
    expect(resolveGlobalLocale().locale).toBe("en-US");
    expect(GLOBAL_FALLBACK_LOCALE).toBe("en-US");
  });

  it("keeps current legacy English compatible with Australia during migration", () => {
    expect(normalizeLegacyLanguage("en")).toBe("en-AU");
    expect(resolveGlobalLocale({ legacyLanguage: "en" }).locale).toBe("en-AU");
  });

  it("maps current Korean legacy value safely", () => {
    expect(normalizeLegacyLanguage("ko")).toBe("ko-KR");
  });

  it("uses country defaults only when no user or legacy language exists", () => {
    expect(resolveGlobalLocale({ countryCode: "AU" }).locale).toBe("en-AU");
    expect(resolveGlobalLocale({ countryCode: "US" }).locale).toBe("en-US");
    expect(resolveGlobalLocale({ countryCode: "GB" }).locale).toBe("en-GB");
  });

  it("lets explicit UI locale override country without changing country", () => {
    const result = resolveGlobalLocale({ explicitUiLocale: "ko-KR", countryCode: "AU" });
    expect(result.locale).toBe("ko-KR");
    expect(result.countryCode).toBe("AU");
    expect(result.source).toBe("explicit");
  });

  it("rejects invalid locale input and falls back safely", () => {
    expect(resolveGlobalLocale({ explicitUiLocale: "not_a_locale" }).locale).toBe("en-US");
  });
});
