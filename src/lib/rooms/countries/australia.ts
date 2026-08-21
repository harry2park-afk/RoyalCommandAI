export const AUSTRALIA_COUNTRY_PACK = {
  id: "AU",
  name: "Australia",
  locale: "en-AU",
  languageTag: "en-AU",
  timeZone: "Australia/Sydney",
  currencyCode: "AUD",
  phoneCountryCode: "+61",
  dateFormat: "DD/MM/YYYY",
  textDirection: "ltr" as const,
  encoding: "UTF-8" as const,
  addressFields: ["addressLine1", "addressLine2", "suburb", "state", "postcode", "country"],
  statesAndTerritories: ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"],
  roomDefaults: {
    clonePolicy: "structure-only" as const,
    cloneCustomerData: false as const,
    cloneMemory: false as const,
    cloneCredentials: false as const,
    cloneSecrets: false as const,
    humanApprovalForExternalActions: true,
  },
  packs: {
    legal: "AU Legal Pack",
    accounting: "AU Accounting & Tax Pack",
    customerSupport: "AU Customer Support Pack",
    technology: "AU Technology / Development Pack",
    learning: "AU Learning Pack",
  },
  policy: {
    globalCoreImmutable: true,
    countryRulesSeparateFromCore: true,
    customerDataIsolationRequired: true,
    customerSecretsNeverCopied: true,
    countrySpecificComplianceMustBeVersioned: true,
  },
} as const;

export type AustraliaCountryPack = typeof AUSTRALIA_COUNTRY_PACK;
