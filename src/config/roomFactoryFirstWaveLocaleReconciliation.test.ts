import { describe, expect, it } from "vitest";
import { getCountryConfigByCountryCode } from "./countryResolver";
import { COUNTRY_ROOM_PRESETS } from "../lib/rooms/countryPresets";

const FIRST_WAVE_COUNTRIES = ["AU", "US", "CA", "KR", "JP", "GB"] as const;

describe("Room Factory first-wave locale reconciliation", () => {
  it("keeps Room Factory locale defaults aligned with canonical CountryConfig", () => {
    for (const countryCode of FIRST_WAVE_COUNTRIES) {
      const config = getCountryConfigByCountryCode(countryCode);
      const preset = COUNTRY_ROOM_PRESETS.find((item) => item.id === countryCode);

      expect(config, `${countryCode} CountryConfig`).not.toBeNull();
      expect(preset, `${countryCode} Room Factory preset`).toBeDefined();
      if (!config || !preset) throw new Error(`Missing first-wave locale source for ${countryCode}`);

      expect(preset.languageTag, `${countryCode} language`).toBe(config.locale);
      expect(preset.currencyCode, `${countryCode} currency`).toBe(config.currency);
      expect(config.timezone.storage, `${countryCode} timezone storage`).toBe("UTC");
      expect(config.timezone.display, `${countryCode} timezone display`).toBe("IANA");
      expect(config.timezone.supportedExamples, `${countryCode} timezone`).toContain(preset.timeZone);
    }
  });

  it("does not turn locale reconciliation into launch approval", () => {
    for (const countryCode of FIRST_WAVE_COUNTRIES) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();
      if (!config) throw new Error(`Missing CountryConfig for ${countryCode}`);

      expect(config.payments.status, countryCode).toBe("NOT_CONNECTED");
      expect(config.tax.status, countryCode).toBe("NOT_CONNECTED");
      expect(config.taxStructure?.status, countryCode).toBe("NEEDS_REVIEW");
      expect(config.compliance.legal, countryCode).toBe("NEEDS_REVIEW");
      expect(config.compliance.tax, countryCode).toBe("NEEDS_REVIEW");
      expect(config.compliance.medical, countryCode).toBe("NEEDS_REVIEW");
      expect(config.compliance.investment, countryCode).toBe("NEEDS_REVIEW");
      expect(config.compliance.privacy, countryCode).toBe("NEEDS_REVIEW");
    }
  });
});
