export type ProfessionalDomain = "legal" | "accounting";
export type VaultDomain = "legal" | "accounting" | "virtual_bridge";
export type ProfessionalRisk = "LOW" | "MEDIUM" | "HIGH" | "REGULATED";
export type CapabilityDefaultState = "ON" | "CANDIDATE" | "OFF";
export type GrantState = "NOT_REQUIRED" | "VALID" | "MISSING" | "EXPIRED" | "REVOKED";
export type ReviewState = "NOT_REQUIRED" | "VERIFIED_ACTIVE" | "VERIFIED_WITH_CONDITIONS" | "LEGAL_REVIEW_REQUIRED" | "EXPIRED_REVIEW" | "BLOCKED" | "NOT_SUPPORTED";

export type ProfessionalRoomDefinition = {
  catalogId: string;
  productId: string;
  domain: ProfessionalDomain;
  name: string;
  vault: VaultDomain;
  specialtyPacks: boolean;
};

export type CapabilityPolicyInput = {
  risk: ProfessionalRisk;
  externalSideEffect?: boolean;
  countryPackRequired?: boolean;
  countryPackVerified?: boolean;
  jurisdictionReview?: ReviewState;
  connectorRequired?: boolean;
  connectorVerified?: boolean;
  approvalGrant?: GrantState;
  delegationGrant?: GrantState;
};

export type CapabilityPolicyDecision = {
  defaultState: CapabilityDefaultState;
  humanConfirmationRequired: boolean;
  externalSideEffectAllowedByDefault: false;
  connected: boolean;
  reasons: string[];
};

const legal = (
  catalogId: string,
  productId: string,
  name: string,
  vault: VaultDomain = "legal",
): ProfessionalRoomDefinition => ({
  catalogId,
  productId,
  domain: "legal",
  name,
  vault,
  specialtyPacks: true,
});

const accounting = (
  catalogId: string,
  productId: string,
  name: string,
  vault: VaultDomain = "accounting",
): ProfessionalRoomDefinition => ({
  catalogId,
  productId,
  domain: "accounting",
  name,
  vault,
  specialtyPacks: true,
});

export const LEGAL_PROFESSIONAL_ROOMS: readonly ProfessionalRoomDefinition[] = [
  legal("legal_personal", "legal_personal", "Personal Legal Room"),
  legal("legal_litigation_dispute", "legal_litigation_dispute", "Litigation & Dispute Room"),
  legal("legal_lawyer_practice", "legal_lawyer_practice", "Lawyer Practice Room"),
  legal("legal_law_firm", "legal_law_firm", "Law Firm Room"),
  legal("legal_corporate_business", "legal_corporate_business", "Corporate & Business Legal Room"),
  legal("legal_bridge_la", "bridge_la", "Legal + Accounting Practice Room", "virtual_bridge"),
  legal("legal_operations_support", "legal_operations_support", "Legal Operations / Support Room"),
  legal("legal_professional_research", "legal_professional_research", "Professional Legal Research Room"),
  legal("legal_custom", "legal_custom", "Custom Legal Room"),
  legal("legal_personal_compliance", "legal_personal_compliance", "Personal Legal & Compliance Room"),
] as const;

export const ACCOUNTING_PROFESSIONAL_ROOMS: readonly ProfessionalRoomDefinition[] = [
  accounting("acct_personal", "acct_personal", "Personal Accounting"),
  accounting("acct_accountant_practice", "acct_accountant_practice", "Accountant Practice"),
  accounting("acct_accounting_firm", "acct_accounting_firm", "Accounting Firm"),
  accounting("acct_bookkeeping", "acct_bookkeeping", "Bookkeeping"),
  accounting("acct_tax_compliance", "acct_tax_compliance", "Tax Compliance"),
  accounting("acct_corporate_reporting", "acct_corporate_reporting", "Corporate Accounting & Management Reporting"),
  accounting("acct_bridge_la", "bridge_la", "Legal + Accounting Practice Room", "virtual_bridge"),
  accounting("acct_custom", "acct_custom", "Custom Accounting"),
] as const;

export const PROFESSIONAL_ROOM_CATALOG = [
  ...LEGAL_PROFESSIONAL_ROOMS,
  ...ACCOUNTING_PROFESSIONAL_ROOMS,
] as const;

function grantBlocks(state: GrantState | undefined, reason: string, reasons: string[]) {
  if (!state || state === "NOT_REQUIRED" || state === "VALID") return;
  reasons.push(`${reason}_${state}`);
}

function reviewBlocks(state: ReviewState | undefined, reasons: string[]) {
  if (!state || state === "NOT_REQUIRED" || state === "VERIFIED_ACTIVE" || state === "VERIFIED_WITH_CONDITIONS") return;
  reasons.push(`JURISDICTION_${state}`);
}

export function decideProfessionalCapability(input: CapabilityPolicyInput): CapabilityPolicyDecision {
  const reasons: string[] = [];
  const highRisk = input.risk === "HIGH" || input.risk === "REGULATED";

  if (input.countryPackRequired && !input.countryPackVerified) {
    reasons.push("COUNTRY_PACK_NOT_VERIFIED");
  }
  if (input.countryPackRequired) reviewBlocks(input.jurisdictionReview, reasons);
  if (input.connectorRequired && !input.connectorVerified) {
    reasons.push("CONNECTOR_NOT_VERIFIED");
  }

  grantBlocks(input.approvalGrant, "APPROVAL_GRANT", reasons);
  grantBlocks(input.delegationGrant, "DELEGATION_GRANT", reasons);

  if (input.externalSideEffect) {
    reasons.push("EXTERNAL_SIDE_EFFECT_DEFAULT_DENY");
    if (input.approvalGrant !== "VALID") reasons.push("APPROVAL_GRANT_REQUIRED_FOR_SIDE_EFFECT");
  }

  const blocked = reasons.length > 0;
  const defaultState: CapabilityDefaultState = blocked ? "OFF" : highRisk ? "CANDIDATE" : "ON";

  return {
    defaultState,
    humanConfirmationRequired: highRisk || Boolean(input.externalSideEffect),
    externalSideEffectAllowedByDefault: false,
    connected: Boolean(input.connectorRequired && input.connectorVerified),
    reasons,
  };
}

export function roomCatalogForDomain(domain: ProfessionalDomain) {
  return PROFESSIONAL_ROOM_CATALOG.filter((room) => room.domain === domain);
}
