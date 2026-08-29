export type CommercialModel =
  | "included"
  | "customer_direct"
  | "rc_resale"
  | "wholesale"
  | "referral"
  | "commission"
  | "custom_quote";

export type OwnershipModel = "customer_owned" | "rc_managed" | "either" | "not_applicable";

export type CommercialMeta = {
  commercialModel: CommercialModel;
  ownershipModel: OwnershipModel;
  labelKo: string;
  labelEn: string;
  noteKo?: string;
  noteEn?: string;
};

const DEFAULT: CommercialMeta = {
  commercialModel: "custom_quote",
  ownershipModel: "either",
  labelKo: "연결 조건 확인",
  labelEn: "Terms to confirm",
  noteKo: "국가·공급업체·고객 플랜에 따라 가격과 연결 방식이 달라질 수 있습니다.",
  noteEn: "Pricing and connection method can vary by country, supplier and customer plan.",
};

const INCLUDED: CommercialMeta = {
  commercialModel: "included",
  ownershipModel: "not_applicable",
  labelKo: "기본 포함",
  labelEn: "Included",
};

const CUSTOMER_OWNED: CommercialMeta = {
  commercialModel: "customer_direct",
  ownershipModel: "customer_owned",
  labelKo: "고객 명의 연결",
  labelEn: "Customer-owned connection",
  noteKo: "고객 명의로 가입·소유하고 RC는 설정과 연결을 지원합니다.",
  noteEn: "The customer owns the supplier account; RC assists with setup and connection.",
};

const PARTNER_RESALE: CommercialMeta = {
  commercialModel: "rc_resale",
  ownershipModel: "either",
  labelKo: "RC 제휴/리셀 가능",
  labelEn: "RC partner/resale eligible",
  noteKo: "공급업체 계약이 허용하면 고객 할인과 RC 마진을 함께 적용할 수 있습니다.",
  noteEn: "Where supplier terms allow, RC can combine a customer discount with an RC margin.",
};

const REFERRAL: CommercialMeta = {
  commercialModel: "referral",
  ownershipModel: "customer_owned",
  labelKo: "고객 직접가입 + 제휴수익",
  labelEn: "Customer direct + referral",
  noteKo: "고객이 공급업체와 직접 계약하고, 제휴가 승인된 경우 RC는 공급업체 커미션을 받을 수 있습니다.",
  noteEn: "The customer contracts directly with the supplier; RC may earn supplier commission where an approved partner programme exists.",
};

export const COMMERCIAL_BY_SERVICE: Record<string, CommercialMeta> = {
  "files-basic": INCLUDED,
  "integration-learning": INCLUDED,
  "ai-own": CUSTOMER_OWNED,
  "personal-phone-custom": CUSTOMER_OWNED,
  "cloud-phone-basic": CUSTOMER_OWNED,
  "cloud-phone-notify": CUSTOMER_OWNED,
  "cloud-phone-ai": CUSTOMER_OWNED,
  "cloud-phone-business": CUSTOMER_OWNED,

  "accounting-xero": PARTNER_RESALE,
  "accounting-myob": PARTNER_RESALE,
  "accounting-quickbooks": PARTNER_RESALE,
  "accounting-reckon": PARTNER_RESALE,
  "accounting-other": DEFAULT,

  "legal-leap-lawconnect": REFERRAL,
  "legal-smokeball": REFERRAL,
  "legal-clio": REFERRAL,
  "legal-actionstep": REFERRAL,
  "legal-other": DEFAULT,
};

export function commercialMeta(serviceId: string): CommercialMeta {
  return COMMERCIAL_BY_SERVICE[serviceId] || DEFAULT;
}
