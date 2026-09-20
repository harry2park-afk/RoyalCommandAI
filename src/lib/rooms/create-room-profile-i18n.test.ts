import { describe, expect, it } from "vitest";
import {
  createRoomProfileCopy,
  normalizeCreateRoomProfileLocale,
} from "./create-room-profile-i18n";

describe("Create Room profile localization", () => {
  it("resolves the October first-wave account locales", () => {
    expect(normalizeCreateRoomProfileLocale("en-AU")).toBe("en");
    expect(normalizeCreateRoomProfileLocale("en-US")).toBe("en");
    expect(normalizeCreateRoomProfileLocale("en-CA")).toBe("en");
    expect(normalizeCreateRoomProfileLocale("fr-CA")).toBe("fr");
    expect(normalizeCreateRoomProfileLocale("ko-KR")).toBe("ko");
    expect(normalizeCreateRoomProfileLocale("ja-JP")).toBe("ja");
    expect(normalizeCreateRoomProfileLocale("en-GB")).toBe("en");
  });

  it("fails safely to English for unsupported or empty locales", () => {
    expect(normalizeCreateRoomProfileLocale("de-DE")).toBe("en");
    expect(normalizeCreateRoomProfileLocale("")).toBe("en");
    expect(normalizeCreateRoomProfileLocale()).toBe("en");
  });

  it("does not silently show the English profile shell for French, Korean, or Japanese", () => {
    const english = createRoomProfileCopy("en-AU");

    for (const locale of ["fr-CA", "ko-KR", "ja-JP"] as const) {
      const localized = createRoomProfileCopy(locale);
      expect(localized.title, locale).not.toBe(english.title);
      expect(localized.note, locale).not.toBe(english.note);
      expect(localized.roomNameLabel, locale).not.toBe(english.roomNameLabel);
      expect(localized.trainingTitle, locale).not.toBe(english.trainingTitle);
      expect(localized.trainingBody, locale).not.toBe(english.trainingBody);
    }
  });
});
