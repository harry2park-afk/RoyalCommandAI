import { describe, expect, it } from "vitest";
import { getCountryConfigByCountryCode } from "./countryResolver";
import { evaluateCountryLocalizationStructure } from "./countryLocalizationStructure";

describe("first-wave Create Room localization structure", () => {
  it.each(["KR", "JP"] as const)(
    "%s does not silently inherit critical English Create Room copy",
    (countryCode) => {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config).not.toBeNull();

      const gate = evaluateCountryLocalizationStructure(config!);
      expect(gate.blockers).not.toContain("PRIMARY_CREATE_ROOM_CRITICAL_COPY_INCOMPLETE");
    },
  );

  it("Canada does not silently inherit critical English copy for its French secondary locale", () => {
    const config = getCountryConfigByCountryCode("CA");
    expect(config).not.toBeNull();
    expect(config?.secondaryLocale).toBe("fr-CA");

    const gate = evaluateCountryLocalizationStructure(config!);
    expect(gate.blockers).not.toContain("SECONDARY_CREATE_ROOM_CRITICAL_COPY_INCOMPLETE");
  });
});
