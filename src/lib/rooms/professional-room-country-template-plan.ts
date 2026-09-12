import { getCountryConfigByCountryCode } from "../../config/countryResolver";
import type { ConnectionStatus, ReviewStatus } from "../../types/countryConfig";
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
  complianceHook: {
    legal: ReviewStatus;
    privacy: ReviewStatus;
    tax: ReviewStatus;
    medical: ReviewStatus;
    investment: ReviewStatus;
  };
  paymentHook: {
    primaryProvider: string;
    connectionStatus: ConnectionStatus;
  };
  taxHook: {
    provider: string | null;
    connectionStatus: ConnectionStatus;
  };
  launchAuthority: "COUNTRY_GATE_REQUIRED";
  humanApprovalRequired: true;
  regulatedExecutionAllowed: false;
  livePaymentExecutionAllowed: false;
  createsRoom: false;
  activatesCountry: false;
};

/**
 * Prepare one governed Professional Room template for a canonical CountryConfig.
 *
 * This is a source-only planning adapter. It binds the room plan to the country's
 * localization plus legal/privacy/tax/payment readiness hooks, but it never turns
 * those configuration values into execution authority. Regulated execution and
 * live payment execution remain explicitly denied until separate reviewed gates
 * authorize them.
 *
 * It does not create a Room, persist a manifest, activate a country, approve
 * regulated advice, connect a provider, take payment, or bypass the country
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
    complianceHook: {
      legal: countryConfig.compliance.legal,
      privacy: countryConfig.compliance.privacy,
      tax: countryConfig.compliance.tax,
      medical: countryConfig.compliance.medical,
      investment: countryConfig.compliance.investment,
    },
    paymentHook: {
      primaryProvider: countryConfig.payments.primary,
      connectionStatus: countryConfig.payments.status,
    },
    taxHook: {
      provider: countryConfig.tax.provider,
      connectionStatus: countryConfig.tax.status,
    },
    launchAuthority: "COUNTRY_GATE_REQUIRED",
    humanApprovalRequired: true,
    regulatedExecutionAllowed: false,
    livePaymentExecutionAllowed: false,
    createsRoom: false,
    activatesCountry: false,
  };
}
