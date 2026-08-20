export type ReviewStatus = "READY" | "NEEDS_REVIEW" | "BLOCKED";
export type ConnectionStatus = "CONNECTED" | "NOT_CONNECTED";

export interface StateConfig {
  name: string;
  taxStatus?: ReviewStatus;
  complianceStatus?: ReviewStatus;
}

export interface CountryConfig {
  countryCode: string;
  locale: string;
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
  business: {
    company_name: "optional" | "required";
    ein: "optional" | "required";
    state_of_incorporation: "optional" | "required";
  };
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
  integrations: Record<string, { status: ConnectionStatus; provider?: string }>;
  states: Record<string, StateConfig>;
}
