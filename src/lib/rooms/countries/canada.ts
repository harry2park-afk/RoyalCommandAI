export const CANADA_COUNTRY_PACK = {
  id: "CA",
  name: "Canada",
  locale: "en-CA",
  languageTag: "en-CA",
  secondaryLanguageTags: ["fr-CA"] as const,
  timeZone: "America/Toronto",
  currencyCode: "CAD",
  phoneCountryCode: "+1",
  dateFormat: "YYYY-MM-DD",
  textDirection: "ltr" as const,
  encoding: "UTF-8" as const,
  addressFields: ["addressLine1", "addressLine2", "city", "province", "postalCode", "country"],
  provincesAndTerritories: ["AB", "BC", "MB", "NB", "NL", "NS", "ON", "PE", "QC", "SK", "NT", "NU", "YT"],
  roomDefaults: {
    clonePolicy: "structure-only" as const,
    cloneCustomerData: false as const,
    cloneMemory: false as const,
    cloneCredentials: false as const,
    cloneSecrets: false as const,
    humanApprovalForExternalActions: true,
  },
  packs: {
    legal: "CA Legal Pack",
    accounting: "CA Accounting & Tax Pack",
    customerSupport: "CA Customer Support Pack",
    technology: "CA Technology / Development Pack",
    learning: "CA Learning Pack",
  },
  policy: {
    globalCoreImmutable: true,
    countryRulesSeparateFromCore: true,
    customerDataIsolationRequired: true,
    customerSecretsNeverCopied: true,
    countrySpecificComplianceMustBeVersioned: true,
  },
} as const;

export type CanadaCountryPack = typeof CANADA_COUNTRY_PACK;
