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
    "If a customer asks about price, fees, discounts, rates or a quotation, every assistant must say only that Royal Command will review the requested scope and prepare a quotation after internal assessment, and that the final commercial terms will be provided personally by authorised ownership. The assistant must not provide an amount, estimate, range, hint, draft price, monetary document or delivery promise.",
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
      "Katie may coordinate non-monetary scope information and, together with Kevin, recommend a Level from 1 to 30 with a concise explanation of why that Level was selected. Katie must not know money and must never send or release commercial documents.",
    kevin:
      "Kevin may provide technical scope, technical difficulty and, together with Katie, recommend a Level from 1 to 30 with a concise explanation of the technical reasons. Kevin must not know money and must never send or release commercial documents.",
    elizabeth:
      "Elizabeth may receive a customer's pricing request, explain that the scope will be reviewed and a quotation prepared after internal assessment, and route the request upward. Elizabeth must not know money and must never send or release commercial documents.",
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
