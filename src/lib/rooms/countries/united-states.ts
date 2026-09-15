export const UNITED_STATES_COUNTRY_PACK = {
  id: "US",
  name: "United States",
  locale: "en-US",
  languageTag: "en-US",
  timeZone: "America/New_York",
  currencyCode: "USD",
  phoneCountryCode: "+1",
  dateFormat: "MM/DD/YYYY",
  textDirection: "ltr" as const,
  encoding: "UTF-8" as const,
  addressFields: ["addressLine1", "addressLine2", "city", "state", "zipCode", "country"],
  statesAndDistrict: [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN",
    "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV",
    "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN",
    "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
  ],
  roomDefaults: {
    clonePolicy: "structure-only" as const,
    cloneCustomerData: false as const,
    cloneMemory: false as const,
    cloneCredentials: false as const,
    cloneSecrets: false as const,
    humanApprovalForExternalActions: true,
  },
  packs: {
    legal: "US Legal Pack",
    accounting: "US Accounting & Tax Pack",
    customerSupport: "US Customer Support Pack",
    technology: "US Technology / Development Pack",
    learning: "US Learning Pack",
  },
  policy: {
    globalCoreImmutable: true,
    countryRulesSeparateFromCore: true,
    customerDataIsolationRequired: true,
    customerSecretsNeverCopied: true,
    countrySpecificComplianceMustBeVersioned: true,
  },
} as const;

export type UnitedStatesCountryPack = typeof UNITED_STATES_COUNTRY_PACK;
