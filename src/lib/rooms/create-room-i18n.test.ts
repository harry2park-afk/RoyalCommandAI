import { describe, expect, it } from "vitest";
import {
  CREATE_ROOM_COUNTRIES,
  CREATE_ROOM_LANGUAGES,
} from "./create-room-i18n";

const OCTOBER_FIRST_WAVE = ["AU", "US", "CA", "KR", "JP", "GB"] as const;

const EXPECTED_FIRST_WAVE_UI_LOCALES = {
  AU: "en",
  US: "en",
  CA: "en",
  KR: "ko",
  JP: "ja",
  GB: "en",
} as const;

const NEXT_PRIORITY_UI_LOCALES = {
  SG: "en",
  CN: "zh",
  HK: "zh",
  TW: "zh",
  IN: "en",
} as const;

describe("Create Room country selector", () => {
  it("includes every October first-wave country", () => {
    const codes = new Set(CREATE_ROOM_COUNTRIES.map((country) => country.code));
    for (const code of OCTOBER_FIRST_WAVE) expect(codes.has(code)).toBe(true);
  });

  it("keeps country codes unique", () => {
    const codes = CREATE_ROOM_COUNTRIES.map((country) => country.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("locks the verified first-wave Create Room locale mapping", () => {
    for (const code of OCTOBER_FIRST_WAVE) {
      expect(CREATE_ROOM_COUNTRIES.find((country) => country.code === code)?.locale).toBe(
        EXPECTED_FIRST_WAVE_UI_LOCALES[code],
      );
    }
  });

  it("ensures every first-wave country locale is backed by a supported Create Room language", () => {
    const supportedLocales = new Set(CREATE_ROOM_LANGUAGES.map(({ locale }) => locale));

    for (const code of OCTOBER_FIRST_WAVE) {
      const country = CREATE_ROOM_COUNTRIES.find((candidate) => candidate.code === code);
      expect(country).toBeDefined();
      expect(supportedLocales.has(country!.locale)).toBe(true);
    }
  });

  it("locks the next-priority Create Room primary locale mapping to Room Factory language families", () => {
    const supportedLocales = new Set(CREATE_ROOM_LANGUAGES.map(({ locale }) => locale));

    for (const [code, locale] of Object.entries(NEXT_PRIORITY_UI_LOCALES)) {
      const country = CREATE_ROOM_COUNTRIES.find((candidate) => candidate.code === code);
      expect(country).toBeDefined();
      expect(country?.locale).toBe(locale);
      expect(supportedLocales.has(locale)).toBe(true);
    }
  });

  it("registers Canada with English Create Room copy", () => {
    expect(CREATE_ROOM_COUNTRIES.find((country) => country.code === "CA")).toEqual({
      code: "CA",
      label: "Canada",
      locale: "en",
    });
  });
});
