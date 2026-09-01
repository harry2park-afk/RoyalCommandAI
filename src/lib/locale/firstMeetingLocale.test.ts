import { describe, expect, it } from "vitest";
import { firstMeetingLocaleFrom, firstMeetingSpeechLanguage } from "./firstMeetingLocale";

describe("firstMeetingLocale", () => {
  it.each([
    ["Australia", "en-AU", "AU", "en", "en-AU"],
    ["United States", "en-US", "US", "en", "en-US"],
    ["Canada English", "en-CA", "CA", "en", "en-CA"],
    ["Canada French", "fr-CA", "CA", "fr", "fr-CA"],
    ["South Korea", "ko-KR", "KR", "ko", "ko-KR"],
    ["Japan", "ja-JP", "JP", "ja", "ja-JP"],
    ["United Kingdom", "en-GB", "GB", "en", "en-GB"],
  ])("maps the first-wave %s locale and speech tag", (_name, languageTag, countryCode, expectedLocale, expectedSpeech) => {
    const locale = firstMeetingLocaleFrom(languageTag, countryCode);
    expect(locale).toBe(expectedLocale);
    expect(firstMeetingSpeechLanguage(locale, countryCode)).toBe(expectedSpeech);
  });

  it("adds Canadian French without widening French to other countries", () => {
    expect(firstMeetingLocaleFrom("fr", "CA")).toBe("fr");
    expect(firstMeetingLocaleFrom("fr-FR", "CA")).toBe("fr");
    expect(firstMeetingLocaleFrom("fr-CA", "US")).toBe("en");
    expect(firstMeetingLocaleFrom("fr-FR", "GB")).toBe("en");
  });

  it("preserves the existing non-English language mappings", () => {
    expect(firstMeetingLocaleFrom("zh-CN", "US")).toBe("zh");
    expect(firstMeetingLocaleFrom("vi-VN", "AU")).toBe("vi");
    expect(firstMeetingLocaleFrom("id-ID", "AU")).toBe("id");
    expect(firstMeetingLocaleFrom("th-TH", "AU")).toBe("th");
    expect(firstMeetingLocaleFrom("hi-IN", "AU")).toBe("hi");
  });

  it("fails unknown or malformed English inputs to the existing Australian default", () => {
    expect(firstMeetingSpeechLanguage("en", "ZZ")).toBe("en-AU");
    expect(firstMeetingSpeechLanguage("en", "not-a-country")).toBe("en-AU");
    expect(firstMeetingLocaleFrom("not-a-locale", "CA")).toBe("en");
  });
});
