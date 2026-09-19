import { describe, expect, it } from "vitest";
import { CREATE_ROOM_COUNTRIES, createRoomCopy } from "./create-room-i18n";

const OCTOBER_FIRST_WAVE = ["AU", "US", "CA", "KR", "JP", "GB"];

describe("Create Room country selector", () => {
  it("uses English for AU and US and Korean only for Korea", () => {
    const localeFor = (countryCode: string) => CREATE_ROOM_COUNTRIES.find((country) => country.code === countryCode)?.locale || "en";

    expect(createRoomCopy(localeFor("AU")).buttonLabel).toBe("Create Room");
    expect(createRoomCopy(localeFor("US")).buttonLabel).toBe("Create Room");
    expect(createRoomCopy(localeFor("KR")).buttonLabel).toBe("Room 만들기");
  });

  it("includes every October first-wave country", () => {
    const codes = new Set(CREATE_ROOM_COUNTRIES.map((country) => country.code));
    for (const code of OCTOBER_FIRST_WAVE) expect(codes.has(code)).toBe(true);
  });

  it("keeps country codes unique", () => {
    const codes = CREATE_ROOM_COUNTRIES.map((country) => country.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("registers Canada with English Create Room copy", () => {
    expect(CREATE_ROOM_COUNTRIES.find((country) => country.code === "CA")).toEqual({
      code: "CA",
      label: "Canada",
      locale: "en",
    });
  });
});
