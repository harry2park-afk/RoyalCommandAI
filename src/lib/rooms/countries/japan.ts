export const JAPAN_COUNTRY_PACK = {
  id: "JP",
  name: "Japan",
  locale: "ja-JP",
  languageTag: "ja-JP",
  timeZone: "Asia/Tokyo",
  currencyCode: "JPY",
  phoneCountryCode: "+81",
  dateFormat: "YYYY/MM/DD",
  textDirection: "ltr" as const,
  encoding: "UTF-8" as const,
  addressFields: ["postalCode", "prefecture", "cityWardTown", "streetBlock", "buildingDetail", "country"],
  roomDefaults: {
    clonePolicy: "structure-only" as const,
    cloneCustomerData: false as const,
    cloneMemory: false as const,
    cloneCredentials: false as const,
    cloneSecrets: false as const,
    humanApprovalForExternalActions: true,
  },
  packs: {
    legal: "JP Legal Pack",
    accounting: "JP Accounting & Tax Pack",
    customerSupport: "JP Customer Support Pack",
    technology: "JP Technology / Development Pack",
    learning: "JP Learning Pack",
  },
  policy: {
    globalCoreImmutable: true,
    countryRulesSeparateFromCore: true,
    customerDataIsolationRequired: true,
    customerSecretsNeverCopied: true,
    countrySpecificComplianceMustBeVersioned: true,
  },
} as const;

export type JapanCountryPack = typeof JAPAN_COUNTRY_PACK;
