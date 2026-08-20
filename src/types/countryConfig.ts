export type ReviewStatus = "READY" | "NEEDS_REVIEW" | "BLOCKED";
export type ConnectionStatus = "CONNECTED" | "NOT_CONNECTED";
export type RequirementStatus = "optional" | "required";

export interface SubdivisionConfig {
  name: string;
  taxStatus?: ReviewStatus;
  complianceStatus?: ReviewStatus;
}

export interface CountryConfig {
  countryCode: string;
  locale: string;
  secondaryLocale?: string | null;
  currency: string;
  phoneCountryCode: string;
  dateFormat: string;
  timeFormat: string;
  addressFormat: string[];
  timezone: {
    storage: string;
    display: string;
    supportedExamples: string[];
  };
  business: Record<string, RequirementStatus>;
  compliance: {
    legal: ReviewStatus;
    tax: ReviewStatus;
    medical: ReviewStatus;
    investment: ReviewStatus;
    privacy: ReviewStatus;
  };
  payments: {
    primary: string;
    status: ConnectionStatus;
    future: string[];
  };
  tax: {
    provider: string | null;
    status: ConnectionStatus;
    futureProviders: string[];
  };
  taxStructure?: {
    system: string;
    status: ReviewStatus;
  };
  integrations: Record<string, { status: ConnectionStatus; provider?: string }>;
  states?: Record<string, SubdivisionConfig>;
  provinces?: Record<string, SubdivisionConfig>;
}
