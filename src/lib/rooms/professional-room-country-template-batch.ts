import { PROFESSIONAL_ROOM_DIRECTORY } from "./professional-room-directory";
import {
  buildProfessionalRoomCountryTemplatePlan,
  type ProfessionalRoomCountryTemplatePlan,
} from "./professional-room-country-template-plan";

export type ProfessionalRoomCountryTemplateBatch = {
  countryCode: string;
  plans: readonly ProfessionalRoomCountryTemplatePlan[];
  roomCount: number;
  launchAuthority: "COUNTRY_GATE_REQUIRED";
  createsRooms: false;
  activatesCountry: false;
};

/**
 * Prepare the complete governed Professional Room template batch for one country.
 *
 * The batch is all-or-nothing: every catalog entry must resolve through the
 * existing Factory adapter and canonical CountryConfig, catalog IDs must remain
 * unique, and every plan must remain source-only/fail-closed. Any missing or
 * inconsistent plan returns null instead of creating a partial rollout batch.
 *
 * This function performs no persistence and grants no launch authority.
 */
export function buildProfessionalRoomCountryTemplateBatch(
  countryCode: string,
): ProfessionalRoomCountryTemplateBatch | null {
  const normalizedCountryCode = countryCode.trim().toUpperCase();
  if (!normalizedCountryCode) return null;

  const plans = PROFESSIONAL_ROOM_DIRECTORY.map((room) =>
    buildProfessionalRoomCountryTemplatePlan(room.id, normalizedCountryCode),
  );

  if (plans.some((plan) => plan === null)) return null;

  const resolvedPlans = plans as ProfessionalRoomCountryTemplatePlan[];
  const catalogIds = new Set(resolvedPlans.map((plan) => plan.catalogId));

  if (
    resolvedPlans.length !== PROFESSIONAL_ROOM_DIRECTORY.length ||
    catalogIds.size !== PROFESSIONAL_ROOM_DIRECTORY.length ||
    resolvedPlans.some(
      (plan) =>
        plan.countryCode !== normalizedCountryCode ||
        plan.launchAuthority !== "COUNTRY_GATE_REQUIRED" ||
        plan.humanApprovalRequired !== true ||
        plan.regulatedExecutionAllowed !== false ||
        plan.livePaymentExecutionAllowed !== false ||
        plan.createsRoom !== false ||
        plan.activatesCountry !== false,
    )
  ) {
    return null;
  }

  return {
    countryCode: normalizedCountryCode,
    plans: resolvedPlans,
    roomCount: resolvedPlans.length,
    launchAuthority: "COUNTRY_GATE_REQUIRED",
    createsRooms: false,
    activatesCountry: false,
  };
}
