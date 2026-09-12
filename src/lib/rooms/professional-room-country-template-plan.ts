import { getCountryConfigByCountryCode } from "../../config/countryResolver";
import {
  buildProfessionalRoomFactoryPlan,
  type ProfessionalRoomFactoryPlan,
} from "./professional-room-factory-adapter";

export type ProfessionalRoomCountryTemplatePlan = ProfessionalRoomFactoryPlan & {
  countryCode: string;
  locale: string;
  secondaryLocale: string | null;
  currency: string;
  phoneCountryCode: string;
  dateFormat: string;
  timeFormat: string;
  timeZoneStorage: string;
  timeZoneDisplay: string;
  supportedTimeZones: string[];
  launchAuthority: "COUNTRY_GATE_REQUIRED";
  createsRoom: false;
  activatesCountry: false;
};

/**
 * Prepare one governed Professional Room template for a canonical CountryConfig.
 *
 * This is a source-only planning adapter. It does not create a Room, persist a
 * manifest, activate a country, approve regulated advice, or bypass the country
 * launch gate. Unknown room IDs and countries without canonical CountryConfig
 * fail closed.
 */
export function buildProfessionalRoomCountryTemplatePlan(
  catalogId: string,
  countryCode: string,
): ProfessionalRoomCountryTemplatePlan | null {
  const roomPlan = buildProfessionalRoomFactoryPlan(catalogId);
  const normalizedCountryCode = countryCode.trim().toUpperCase();
  const countryConfig = getCountryConfigByCountryCode(normalizedCountryCode);

  if (
    !roomPlan ||
    !countryConfig ||
    countryConfig.countryCode.trim().toUpperCase() !== normalizedCountryCode
  ) {
    return null;
  }

  return {
    ...roomPlan,
    countryCode: normalizedCountryCode,
    locale: countryConfig.locale,
    secondaryLocale: countryConfig.secondaryLocale ?? null,
    currency: countryConfig.currency,
    phoneCountryCode: countryConfig.phoneCountryCode,
    dateFormat: countryConfig.dateFormat,
    timeFormat: countryConfig.timeFormat,
    timeZoneStorage: countryConfig.timezone.storage,
    timeZoneDisplay: countryConfig.timezone.display,
    supportedTimeZones: [...countryConfig.timezone.supportedExamples],
    launchAuthority: "COUNTRY_GATE_REQUIRED",
    createsRoom: false,
    activatesCountry: false,
  };
}
