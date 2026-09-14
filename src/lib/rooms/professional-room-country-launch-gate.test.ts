import { describe, expect, it } from "vitest";
import { evaluateCountryLaunch } from "../../config/countryLaunchGate";
import { getCountryConfigByCountryCode } from "../../config/countryResolver";
import { PROFESSIONAL_ROOM_DIRECTORY } from "./professional-room-directory";
import { buildProfessionalRoomFactoryPlan } from "./professional-room-factory-adapter";

const FIRST_WAVE = ["AU", "US", "CA", "KR", "JP", "GB"] as const;
const NEXT_PRIORITY = ["SG", "CN", "HK", "TW", "IN"] as const;

describe("Professional Room country launch boundary", () => {
  it("keeps all 18 Professional Room templates resolvable while every first-wave country remains fail-closed", () => {
    expect(PROFESSIONAL_ROOM_DIRECTORY).toHaveLength(18);

    for (const countryCode of FIRST_WAVE) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();
      expect(config?.countryCode).toBe(countryCode);

      const countryGate = evaluateCountryLaunch(config!);
      expect(countryGate.launchable, countryCode).toBe(false);
      expect(countryGate.blockers.length, countryCode).toBeGreaterThan(0);

      for (const room of PROFESSIONAL_ROOM_DIRECTORY) {
        const plan = buildProfessionalRoomFactoryPlan(room.id);
        expect(plan, `${countryCode}:${room.id}`).not.toBeNull();
        expect(plan?.safetyTier).toBe("regulated");
        expect(plan?.crossVaultStorageAllowed).toBe(false);

        // A resolvable template is source capability only. It must never be
        // interpreted as country launch approval while the country gate is blocked.
        expect(countryGate.launchable, `${countryCode}:${room.id}`).toBe(false);
      }
    }
  });

  it("keeps next-priority canonical CountryConfig integration fail-closed without hard-coding temporary absence", () => {
    expect(PROFESSIONAL_ROOM_DIRECTORY).toHaveLength(18);

    for (const countryCode of NEXT_PRIORITY) {
      const config = getCountryConfigByCountryCode(countryCode);

      // This Professional Room lane must remain compatible with the separately
      // reviewed country-config rollout. A next-priority country may still be
      // absent on this branch, but once its canonical config is integrated it must
      // enter only through the same fail-closed Country Gate used by the first wave.
      if (config === null) {
        expect(config, countryCode).toBeNull();
        continue;
      }

      expect(config.countryCode, countryCode).toBe(countryCode);

      const countryGate = evaluateCountryLaunch(config);
      expect(countryGate.launchable, countryCode).toBe(false);
      expect(countryGate.blockers.length, countryCode).toBeGreaterThan(0);

      for (const room of PROFESSIONAL_ROOM_DIRECTORY) {
        const plan = buildProfessionalRoomFactoryPlan(room.id);
        expect(plan, `${countryCode}:${room.id}`).not.toBeNull();
        expect(plan?.safetyTier, `${countryCode}:${room.id}`).toBe("regulated");
        expect(plan?.crossVaultStorageAllowed, `${countryCode}:${room.id}`).toBe(false);
        expect(countryGate.launchable, `${countryCode}:${room.id}`).toBe(false);
      }
    }
  });
});
