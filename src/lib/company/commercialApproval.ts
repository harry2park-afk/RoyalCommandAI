export type CommercialPriceMode = "PUBLISHED_CATALOG_PRICE" | "CUSTOM_QUOTE";

export const COMMERCIAL_APPROVAL_POLICY = {
  policyName: "Owner-Approved Published Price + Harry-Only Custom Quote Firewall",
  authority: "HARRY_ONLY_FOR_CUSTOM_QUOTES",
  purpose:
    "Royal Command may automatically display and collect only Owner-approved published catalog prices. Customer-specific negotiated prices, discounts, estimates, quotations and commercial documents remain Harry-only and may not be invented, modified or delivered by AI.",
  mandatoryRules: [
    "AI assistants must never invent, estimate, alter or negotiate a monetary figure.",
    "Only an active, versioned, Owner-approved PUBLISHED_CATALOG_PRICE may be displayed automatically by the system.",
    "A published price must identify its schedule/version and effective period before it may be shown or charged.",
    "CUSTOM_QUOTE pricing remains customer-specific and Harry-only.",
    "No AI assistant may create or populate monetary figures for a CUSTOM_QUOTE.",
    "No AI assistant may issue, send, forward, publish, display or verbally communicate a CUSTOM_QUOTE amount.",
    "No automated email, SMS, portal notification, Room message or API action may deliver a CUSTOM_QUOTE monetary amount.",
    "Harry alone determines customer-specific negotiated commercial terms, discounts and custom quotation amounts.",
    "A Harry signature or approval for one custom quote must never be reused for another customer, scope, revision or document.",
    "Any custom-quote change after Harry approval requires a new Harry review before delivery.",
    "Automated checkout may charge only the exact active Owner-approved published schedule resolved by the server at checkout time.",
  ],
  assistantResponseRule:
    "For a standard catalog Room, assistants may direct the customer to the system-displayed Owner-approved published price without inventing or restating a different amount. For a negotiated/custom request, assistants must say the scope will be reviewed and final custom commercial terms will be provided by authorised ownership; no estimate, range, discount or monetary hint may be supplied.",
  deliveryGate: {
    assistantCustomQuoteDeliveryAllowed: false,
    automatedCustomQuoteDeliveryAllowed: false,
    systemCustomQuoteDeliveryAllowed: false,
    systemPublishedCatalogPriceDisplayAllowed: true,
    systemPublishedCatalogCheckoutAllowed: true,
    onlyPermittedCustomQuoteSender: "HARRY_PERSONALLY",
    internalStatuses: [
      "DRAFT",
      "INTERNAL_REVIEW",
      "LEVEL_ASSESSED",
      "AWAITING_HARRY_REVIEW",
      "HARRY_APPROVED_NOT_SIGNED",
      "HARRY_SIGNED_OWNER_ONLY",
      "REVISED_AFTER_SIGNATURE",
    ],
  },
  separationOfDuties: {
    katie:
      "Katie may coordinate non-monetary scope information and recommend service level/scope. Katie may reference that a published catalog price exists but must not invent, change or negotiate money and must never release a custom quotation.",
    kevin:
      "Kevin may provide technical scope and difficulty. Kevin may not invent, change or negotiate customer pricing and must never release a custom quotation.",
    elizabeth:
      "Elizabeth may route pricing requests and direct customers to an approved published catalog checkout where applicable. Elizabeth must not invent, negotiate or disclose a custom quotation amount.",
    harry:
      "Harry approves published catalog price schedules and alone determines and communicates customer-specific negotiated/custom quotation amounts.",
  },
} as const;

export type CommercialReleaseStatus =
  | "DRAFT"
  | "INTERNAL_REVIEW"
  | "LEVEL_ASSESSED"
  | "AWAITING_HARRY_REVIEW"
  | "HARRY_APPROVED_NOT_SIGNED"
  | "HARRY_SIGNED_OWNER_ONLY"
  | "REVISED_AFTER_SIGNATURE";

export type PublishedPriceAuthority = {
  ownerApproved: boolean;
  active: boolean;
  scheduleId: string;
  effectiveFromMs: number;
  effectiveToMs?: number | null;
};

export function canDisplayCommercialPrice(
  mode: CommercialPriceMode,
  authority?: PublishedPriceAuthority,
  nowMs: number = Date.now(),
): boolean {
  if (mode === "CUSTOM_QUOTE") return false;
  if (!authority?.ownerApproved || !authority.active || !authority.scheduleId.trim()) return false;
  if (nowMs < authority.effectiveFromMs) return false;
  if (authority.effectiveToMs != null && nowMs >= authority.effectiveToMs) return false;
  return true;
}

// Custom quotation delivery remains manual owner-only. This deliberately stays false.
export function canReleaseCommercialDocument(_status: CommercialReleaseStatus): boolean {
  return false;
}
