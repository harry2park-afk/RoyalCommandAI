import { describe, expect, it } from "vitest";
import { COUNTRY_DEFAULT_LOCALE, resolveGlobalLocale } from "./globalLocaleCore";
import { uiTextLocale } from "./globalLocaleUiPolicy";

const FIRST_WAVE_COUNTRIES = [
  ["AU", "en-AU"],
  ["US", "en-US"],
  ["CA", "en-CA"],
  ["KR", "ko-KR"],
  ["JP", "ja-JP"],
  ["GB", "en-GB"],
] as const;

const SYSTEM_UI_ROLES = [
  "action",
  "navigation",
  "feature_title",
  "dialog_title",
  "description",
  "help",
  "status_detail",
  "ai_response",
] as const;

describe("October first-wave locale policy", () => {
  it.each(FIRST_WAVE_COUNTRIES)(
    "%s resolves its country default and applies it to every system-owned UI role",
    (countryCode, expectedLocale) => {
      expect(COUNTRY_DEFAULT_LOCALE[countryCode]).toBe(expectedLocale);

      const resolved = resolveGlobalLocale({ countryCode });
      expect(resolved.locale).toBe(expectedLocale);
      expect(resolved.source).toBe("country");

      for (const role of SYSTEM_UI_ROLES) {
        expect(uiTextLocale(role, resolved.locale)).toBe(expectedLocale);
      }
    },
  );

  it.each(FIRST_WAVE_COUNTRIES)(
    "%s preserves customer-authored content instead of auto-rewriting it",
    (countryCode) => {
      const resolved = resolveGlobalLocale({ countryCode });
      expect(uiTextLocale("customer_content", resolved.locale)).toBeNull();
    },
  );

  it("keeps an explicit supported locale ahead of the country default", () => {
    const resolved = resolveGlobalLocale({
      countryCode: "CA",
      explicitUiLocale: "fr-CA",
    });

    expect(resolved).toMatchObject({
      locale: "fr-CA",
      source: "explicit",
      countryCode: "CA",
    });
    expect(uiTextLocale("navigation", resolved.locale)).toBe("fr-CA");
  });
});
