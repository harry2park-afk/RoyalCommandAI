export const COMMERCIAL_APPROVAL_POLICY = {
  policyName: "Harry-Only Customer Commercial Delivery Firewall",
  authority: "HARRY_ONLY",
  purpose:
    "No Royal Command assistant, automation, employee workflow or system channel may ever send, transmit, publish, display, forward or verbally communicate a customer-facing monetary quotation, price, fee, rate, discount, commercial offer or pricing document. Only Harry personally may communicate or deliver commercial monetary information to a customer.",
  mandatoryRules: [
    "No AI assistant may create or populate monetary figures for a customer-facing quotation.",
    "No AI assistant may issue, send, forward, publish, display or verbally communicate a customer price under any circumstance.",
    "No AI assistant may release a commercial document even after Harry has signed it.",
    "No automated email, SMS, portal notification, Room message, API action or other system function may deliver customer-facing monetary information.",
    "Harry alone may determine the customer-facing monetary amount and commercial conditions.",
    "Harry alone may personally sign the final customer commercial document.",
    "Harry alone may personally send or otherwise communicate the signed commercial document or monetary terms to the customer.",
    "A Harry signature is evidence of approval only; it never grants an assistant or system permission to deliver the document.",
    "A signature or approval for one customer or scope must never be reused for another customer, scope, revision or document.",
    "Any change after Harry's signature requires a new Harry review and signature before Harry may personally deliver it.",
  ],
  assistantResponseRule:
    "If a customer asks for price, fees, discounts, rates or a quotation, every assistant must state only that commercial terms are handled personally by authorised ownership and the request will be referred upward. The assistant must not provide an amount, estimate, range, hint, draft price, document or delivery promise.",
  deliveryGate: {
    assistantDeliveryAllowed: false,
    automatedDeliveryAllowed: false,
    systemDeliveryAllowed: false,
    onlyPermittedSender: "HARRY_PERSONALLY",
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
      "Katie may coordinate non-monetary scope information and Level assessment status, but must not know money and must never send or release commercial documents.",
    kevin:
      "Kevin may provide technical scope and non-monetary difficulty assessment, but must not know money and must never send or release commercial documents.",
    elizabeth:
      "Elizabeth may receive a customer's pricing request and route it upward, but must not know money and must never send or release commercial documents.",
    harry:
      "Harry alone determines monetary commercial terms, personally signs the final document, and personally communicates or sends it to the customer.",
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

// Deliberately always false: Royal Command systems and assistants never release customer pricing.
// Customer delivery is a manual owner-only action performed personally by Harry outside this gate.
export function canReleaseCommercialDocument(_status: CommercialReleaseStatus): boolean {
  return false;
}
