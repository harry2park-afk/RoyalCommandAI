import { describe, expect, it } from "vitest";
import {
  createRoomProfileCopy,
  normalizeCreateRoomProfileLocale,
  normalizeCreateRoomWizardLocale,
} from "./create-room-profile-i18n";

describe("Create Room profile localization", () => {
  it("resolves the October first-wave account locales", () => {
    expect(normalizeCreateRoomWizardLocale("en-AU")).toBe("en");
    expect(normalizeCreateRoomWizardLocale("en-US")).toBe("en");
    expect(normalizeCreateRoomWizardLocale("en-CA")).toBe("en");
    expect(normalizeCreateRoomWizardLocale("fr-CA")).toBe("fr");
    expect(normalizeCreateRoomWizardLocale("ko-KR")).toBe("ko");
    expect(normalizeCreateRoomWizardLocale("ja-JP")).toBe("ja");
    expect(normalizeCreateRoomWizardLocale("en-GB")).toBe("en");
  });

  it("preserves the existing next-wave wizard locale routing", () => {
    expect(normalizeCreateRoomWizardLocale("zh-CN")).toBe("zh");
    expect(normalizeCreateRoomWizardLocale("zh-TW")).toBe("zh");
    expect(normalizeCreateRoomWizardLocale("vi-VN")).toBe("vi");
    expect(normalizeCreateRoomWizardLocale("id-ID")).toBe("id");
    expect(normalizeCreateRoomWizardLocale("th-TH")).toBe("th");
    expect(normalizeCreateRoomWizardLocale("hi-IN")).toBe("hi");
  });

  it("uses English profile-shell copy for locales not yet localized there without changing the wizard locale", () => {
    const chinese = createRoomProfileCopy("zh-CN");
    const english = createRoomProfileCopy("en-AU");

    expect(chinese.locale).toBe("zh");
    expect(chinese.profileLocale).toBe("en");
    expect(chinese.title).toBe(english.title);
  });

  it("fails safely to English for unsupported or empty locales", () => {
    expect(normalizeCreateRoomWizardLocale("de-DE")).toBe("en");
    expect(normalizeCreateRoomWizardLocale("")).toBe("en");
    expect(normalizeCreateRoomWizardLocale()).toBe("en");
    expect(normalizeCreateRoomProfileLocale("de-DE")).toBe("en");
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
