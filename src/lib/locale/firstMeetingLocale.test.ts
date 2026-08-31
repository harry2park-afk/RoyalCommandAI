import { describe, expect, it } from "vitest";
import { firstMeetingLocaleFrom, firstMeetingSpeechLanguage } from "./firstMeetingLocale";

describe("firstMeetingLocale", () => {
  it("adds Canadian French without widening other countries", () => {
    expect(firstMeetingLocaleFrom("fr-CA", "CA")).toBe("fr");
    expect(firstMeetingLocaleFrom("fr", "CA")).toBe("fr");
    expect(firstMeetingLocaleFrom("fr-CA", "US")).toBe("en");
  });

  it("preserves the existing non-English language mappings", () => {
    expect(firstMeetingLocaleFrom("ko-KR", "KR")).toBe("ko");
    expect(firstMeetingLocaleFrom("ja-JP", "JP")).toBe("ja");
    expect(firstMeetingLocaleFrom("zh-CN", "US")).toBe("zh");
    expect(firstMeetingLocaleFrom("vi-VN", "AU")).toBe("vi");
  });

  it("uses launch-country English speech locales", () => {
    expect(firstMeetingSpeechLanguage("en", "AU")).toBe("en-AU");
    expect(firstMeetingSpeechLanguage("en", "US")).toBe("en-US");
    expect(firstMeetingSpeechLanguage("en", "CA")).toBe("en-CA");
    expect(firstMeetingSpeechLanguage("en", "GB")).toBe("en-GB");
  });

  it("keeps Korean and Japanese speech locales unchanged", () => {
    expect(firstMeetingSpeechLanguage("ko", "KR")).toBe("ko-KR");
    expect(firstMeetingSpeechLanguage("ja", "JP")).toBe("ja-JP");
  });

  it("uses Canadian French speech and fails unknown English countries safely", () => {
    expect(firstMeetingSpeechLanguage("fr", "CA")).toBe("fr-CA");
    expect(firstMeetingSpeechLanguage("en", "ZZ")).toBe("en-AU");
    expect(firstMeetingLocaleFrom("not-a-locale", "CA")).toBe("en");
  });
});
