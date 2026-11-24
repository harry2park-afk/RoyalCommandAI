import { describe, expect, it } from "vitest";
import { applyGlobalPreset, DEFAULT_GLOBAL_ROOM_SETTINGS } from "./global";

describe("global room defaults", () => {
  it("keeps Core neutral and applies Australia only as an overlay", () => {
    expect(DEFAULT_GLOBAL_ROOM_SETTINGS).toMatchObject({
      countryCode: "GLOBAL", languageTag: "en", timeZone: "UTC", currencyCode: "USD",
    });
    expect(applyGlobalPreset(DEFAULT_GLOBAL_ROOM_SETTINGS, "AU")).toMatchObject({
      countryCode: "AU", languageTag: "en-AU", timeZone: "Australia/Sydney", currencyCode: "AUD",
    });
  });
});
