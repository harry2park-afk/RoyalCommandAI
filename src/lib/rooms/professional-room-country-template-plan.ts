import { getCountryConfigByCountryCode } from "../../config/countryResolver";
import type {
  ConnectionStatus,
  ReviewStatus,
  SubdivisionConfig,
} from "../../types/countryConfig";
import {
  buildProfessionalRoomFactoryPlan,
  type ProfessionalRoomFactoryPlan,
} from "./professional-room-factory-adapter";

export const REQUIRED_PROFESSIONAL_ROOM_COMPLIANCE_EVIDENCE = [
  "recordingConsentEvidence",
  "legalComplianceEvidence",
  "privacyLifecycleEvidence",
  "commercialReadiness",
] as const;

export type ProfessionalRoomComplianceEvidenceKey =
  (typeof REQUIRED_PROFESSIONAL_ROOM_COMPLIANCE_EVIDENCE)[number];

export type ProfessionalRoomCountryTemplatePlan = ProfessionalRoomFactoryPlan & {
  countryCode: string;
  locale: string;
  secondaryLocale: string | null;
  currency: string;
  phoneCountryCode: string;
  dateFormat: string;
  timeFormat: string;
  addressFormat: string[];
  timeZoneStorage: string;
  timeZoneDisplay: string;
  supportedTimeZones: string[];
  jurisdictionHook: {
    taxStructure: {
      system: string;
      status: ReviewStatus;
    } | null;
    states: Record<string, SubdivisionConfig>;
    provinces: Record<string, SubdivisionConfig>;
  };
  complianceHook: {
    legal: ReviewStatus;
    privacy: ReviewStatus;
    tax: ReviewStatus;
    medical: ReviewStatus;
    investment: ReviewStatus;
    requiredEvidence: readonly ProfessionalRoomComplianceEvidenceKey[];
    humanReviewRequired: true;
    automaticApprovalAllowed: false;
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

function copySubdivisions(
  subdivisions: Record<string, SubdivisionConfig> | undefined,
): Record<string, SubdivisionConfig> {
  return Object.fromEntries(
    Object.entries(subdivisions ?? {}).map(([code, subdivision]) => [code, { ...subdivision }]),
  );
}

/**
 * Prepare one governed Professional Room template for a canonical CountryConfig.
 *
 * This is a source-only planning adapter. It binds the room plan to the country's
 * localization plus jurisdiction, legal/privacy/tax/payment readiness hooks, and
 * the minimum human-reviewed compliance evidence surfaces required before launch.
 * It never turns those configuration values into execution authority. Regulated
 * execution and live payment execution remain explicitly denied until separate
 * reviewed gates authorize them.
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
    addressFormat: [...countryConfig.addressFormat],
    timeZoneStorage: countryConfig.timezone.storage,
    timeZoneDisplay: countryConfig.timezone.display,
    supportedTimeZones: [...countryConfig.timezone.supportedExamples],
    jurisdictionHook: {
      taxStructure: countryConfig.taxStructure ? { ...countryConfig.taxStructure } : null,
      states: copySubdivisions(countryConfig.states),
      provinces: copySubdivisions(countryConfig.provinces),
    },
    complianceHook: {
      legal: countryConfig.compliance.legal,
      privacy: countryConfig.compliance.privacy,
      tax: countryConfig.compliance.tax,
      medical: countryConfig.compliance.medical,
      investment: countryConfig.compliance.investment,
      requiredEvidence: [...REQUIRED_PROFESSIONAL_ROOM_COMPLIANCE_EVIDENCE],
      humanReviewRequired: true,
      automaticApprovalAllowed: false,
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
