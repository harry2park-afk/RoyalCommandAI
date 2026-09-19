import { describe, expect, it } from "vitest";
import { moveLanguageCountryLocale, normaliseLanguageCountryOrder, promoteLanguageCountryLocale } from "./languageCountryOrder";

describe("language and country order", () => {
  it("keeps only unique supported locales", () => {
    expect(normaliseLanguageCountryOrder(["en-US", "bad", "en-US", "ko-KR"], new Set(["en-US", "ko-KR"]))).toEqual(["en-US", "ko-KR"]);
  });

  it("puts a searched or restored locale first", () => {
    expect(promoteLanguageCountryLocale(["en-AU", "ko-KR"], "en-US")).toEqual(["en-US", "en-AU", "ko-KR"]);
  });

  it("moves a locale above or below another locale", () => {
    expect(moveLanguageCountryLocale(["en-AU", "en-US", "ko-KR"], "ko-KR", "en-AU", false)).toEqual(["ko-KR", "en-AU", "en-US"]);
    expect(moveLanguageCountryLocale(["en-AU", "en-US", "ko-KR"], "en-AU", "en-US", true)).toEqual(["en-US", "en-AU", "ko-KR"]);
  });
});
