export type LegalJurisdictionPack = {
  code: string;
  country: string;
  legalSystem: string;
  currency: string;
  monthlyAud: number;
  aiConnectorId?: string;
};

export const ROOM_MEMBERSHIP_MIN_AUD = 35;
export const LEGAL_PACK_START_AUD = 29;
export const FX_SERVICE_PERCENT = 3;

export const LEGAL_JURISDICTION_PACKS: LegalJurisdictionPack[] = [
  { code: "AU", country: "Australia", legalSystem: "Australian law", currency: "AUD", monthlyAud: 29, aiConnectorId: "legal-au" },
  { code: "NZ", country: "New Zealand", legalSystem: "New Zealand law", currency: "NZD", monthlyAud: 29, aiConnectorId: "legal-nz" },
  { code: "IN", country: "India", legalSystem: "Indian law", currency: "INR", monthlyAud: 29, aiConnectorId: "legal-in" },
  { code: "KR", country: "South Korea", legalSystem: "Korean law", currency: "KRW", monthlyAud: 35, aiConnectorId: "legal-kr" },
  { code: "SG", country: "Singapore", legalSystem: "Singapore law", currency: "SGD", monthlyAud: 35, aiConnectorId: "legal-sg" },
  { code: "GB", country: "United Kingdom", legalSystem: "UK law", currency: "GBP", monthlyAud: 39, aiConnectorId: "legal-gb" },
  { code: "CA", country: "Canada", legalSystem: "Canadian law", currency: "CAD", monthlyAud: 39, aiConnectorId: "legal-ca" },
  { code: "JP", country: "Japan", legalSystem: "Japanese law", currency: "JPY", monthlyAud: 39, aiConnectorId: "legal-jp" },
  { code: "HK", country: "Hong Kong", legalSystem: "Hong Kong law", currency: "HKD", monthlyAud: 39, aiConnectorId: "legal-hk" },
  { code: "DE", country: "Germany", legalSystem: "German law", currency: "EUR", monthlyAud: 39, aiConnectorId: "legal-de" },
  { code: "FR", country: "France", legalSystem: "French law", currency: "EUR", monthlyAud: 39, aiConnectorId: "legal-fr" },
  { code: "AE", country: "United Arab Emirates", legalSystem: "UAE law", currency: "AED", monthlyAud: 45, aiConnectorId: "legal-ae" },
  { code: "US", country: "United States", legalSystem: "US law", currency: "USD", monthlyAud: 49, aiConnectorId: "legal-us" },
];

export function legalPackMonthlyAud(codes: string[]) {
  const wanted = new Set(codes.map((code) => code.toUpperCase()));
  return LEGAL_JURISDICTION_PACKS
    .filter((pack) => wanted.has(pack.code))
    .reduce((sum, pack) => sum + pack.monthlyAud, 0);
}

export function legalRoomMonthlyAud(codes: string[]) {
  return ROOM_MEMBERSHIP_MIN_AUD + legalPackMonthlyAud(codes);
}

export function serializeLegalPricing(codes: string[]) {
  const selected = LEGAL_JURISDICTION_PACKS.filter((pack) => codes.includes(pack.code));
  return [
    `Room membership minimum: AUD ${ROOM_MEMBERSHIP_MIN_AUD}/month`,
    `Legal jurisdictions: ${selected.length ? selected.map((pack) => `${pack.country} (AUD ${pack.monthlyAud}/month)`).join(", ") : "None selected"}`,
    `Legal pack subtotal: AUD ${legalPackMonthlyAud(codes)}/month`,
    `Estimated recurring total before taxes/FX: AUD ${legalRoomMonthlyAud(codes)}/month`,
    `FX/payment service policy: up to ${FX_SERVICE_PERCENT}% when currency conversion/payment service applies`,
    "Local-currency checkout: use live FX at payment time; do not store hard-coded exchange rates",
    "Legal AI connection rule: a jurisdiction is marked connected only when its connector/API is actually configured",
  ];
}
