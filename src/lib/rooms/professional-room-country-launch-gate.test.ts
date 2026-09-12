import { describe, expect, it } from "vitest";
import { evaluateCountryLaunch } from "../../config/countryLaunchGate";
import {
  getCountryConfigByCountryCode,
  getConfiguredCountryCodes,
} from "../../config/countryResolver";
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

  it("requires explicit canonical CountryConfig work before next-priority countries can enter the launch path", () => {
    const configured = new Set(getConfiguredCountryCodes());

    for (const countryCode of NEXT_PRIORITY) {
      expect(configured.has(countryCode), countryCode).toBe(false);
      expect(getCountryConfigByCountryCode(countryCode), countryCode).toBeNull();
    }
  });
});
