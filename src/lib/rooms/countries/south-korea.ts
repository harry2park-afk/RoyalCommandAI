export const SOUTH_KOREA_COUNTRY_PACK = {
  id: "KR",
  name: "South Korea",
  locale: "ko-KR",
  languageTag: "ko-KR",
  timeZone: "Asia/Seoul",
  currencyCode: "KRW",
  phoneCountryCode: "+82",
  dateFormat: "YYYY-MM-DD",
  textDirection: "ltr" as const,
  encoding: "UTF-8" as const,
  addressFields: ["postalCode", "provinceOrSpecialCity", "cityDistrict", "roadNameAddress", "buildingDetail", "country"],
  roomDefaults: {
    clonePolicy: "structure-only" as const,
    cloneCustomerData: false as const,
    cloneMemory: false as const,
    cloneCredentials: false as const,
    cloneSecrets: false as const,
    humanApprovalForExternalActions: true,
  },
  packs: {
    legal: "KR Legal Pack",
    accounting: "KR Accounting & Tax Pack",
    customerSupport: "KR Customer Support Pack",
    technology: "KR Technology / Development Pack",
    learning: "KR Learning Pack",
  },
  policy: {
    globalCoreImmutable: true,
    countryRulesSeparateFromCore: true,
    customerDataIsolationRequired: true,
    customerSecretsNeverCopied: true,
    countrySpecificComplianceMustBeVersioned: true,
  },
} as const;

export type SouthKoreaCountryPack = typeof SOUTH_KOREA_COUNTRY_PACK;
