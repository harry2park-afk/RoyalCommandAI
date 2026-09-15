export const UNITED_KINGDOM_COUNTRY_PACK = {
  id: "GB",
  name: "United Kingdom",
  locale: "en-GB",
  languageTag: "en-GB",
  timeZone: "Europe/London",
  currencyCode: "GBP",
  phoneCountryCode: "+44",
  dateFormat: "DD/MM/YYYY",
  textDirection: "ltr" as const,
  encoding: "UTF-8" as const,
  addressFields: ["buildingAndStreet", "addressLine2", "locality", "postTown", "postcode", "country"],
  roomDefaults: {
    clonePolicy: "structure-only" as const,
    cloneCustomerData: false as const,
    cloneMemory: false as const,
    cloneCredentials: false as const,
    cloneSecrets: false as const,
    humanApprovalForExternalActions: true,
  },
  packs: {
    legal: "GB Legal Pack",
    accounting: "GB Accounting & Tax Pack",
    customerSupport: "GB Customer Support Pack",
    technology: "GB Technology / Development Pack",
    learning: "GB Learning Pack",
  },
  policy: {
    globalCoreImmutable: true,
    countryRulesSeparateFromCore: true,
    customerDataIsolationRequired: true,
    customerSecretsNeverCopied: true,
    countrySpecificComplianceMustBeVersioned: true,
  },
} as const;

export type UnitedKingdomCountryPack = typeof UNITED_KINGDOM_COUNTRY_PACK;
