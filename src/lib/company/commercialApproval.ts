export const COMMERCIAL_APPROVAL_POLICY = {
  policyName: "Harry-Signed Customer Commercial Release Gate",
  authority: "HARRY_ONLY",
  purpose:
    "No Royal Command commercial quotation, pricing notice, fee schedule, discount, rate, contract price or other customer-facing monetary document may be issued, transmitted, displayed or represented as approved unless Harry has personally approved and signed the specific customer document.",
  mandatoryRules: [
    "No AI assistant may create or populate monetary figures for a customer-facing quotation.",
    "No AI assistant may issue, send, publish, display or verbally communicate a customer price.",
    "No unsigned draft may be treated as a quotation, offer or approved commercial document.",
    "Harry must personally review the specific customer, scope and commercial document before release.",
    "Harry must personally sign the final customer-facing commercial document before release.",
    "A signature or approval for one customer or one scope must never be reused for another customer, scope, revision or document.",
    "Any change to scope, price, discount, commercial condition or validity period after Harry's signature requires a new Harry review and signature.",
    "Only the exact Harry-signed final revision may be released to the customer.",
  ],
  assistantResponseRule:
    "If a customer asks for price, fees, discounts, rates or a quotation, every assistant must state only that commercial terms require authorised management review and a signed official response. The assistant must not provide an amount, estimate, range, hint or draft price.",
  releaseGate: {
    requiredStatus: "HARRY_SIGNED_FINAL",
    requiredEvidence: [
      "customer identifier",
      "document identifier",
      "revision identifier",
      "scope reference",
      "Harry approval status",
      "Harry signature status",
      "signature date/time",
    ],
    blockedStatuses: [
      "DRAFT",
      "INTERNAL_REVIEW",
      "LEVEL_ASSESSED",
      "AWAITING_HARRY_REVIEW",
      "HARRY_APPROVED_NOT_SIGNED",
      "REVISED_AFTER_SIGNATURE",
    ],
  },
  separationOfDuties: {
    katie:
      "Katie may coordinate non-monetary scope information, Level assessment status and document routing, but must not know money and must not release commercial documents.",
    kevin:
      "Kevin may provide technical scope and non-monetary difficulty assessment, but must not know money and must not release commercial documents.",
    elizabeth:
      "Elizabeth may receive a customer's request for pricing and route it upward, but must not know money and must not release commercial documents.",
    harry:
      "Harry alone determines the customer-facing commercial amount and conditions, personally signs the final document, and authorises its release.",
  },
} as const;

export type CommercialReleaseStatus =
  | "DRAFT"
  | "INTERNAL_REVIEW"
  | "LEVEL_ASSESSED"
  | "AWAITING_HARRY_REVIEW"
  | "HARRY_APPROVED_NOT_SIGNED"
  | "HARRY_SIGNED_FINAL"
  | "REVISED_AFTER_SIGNATURE";

export function canReleaseCommercialDocument(status: CommercialReleaseStatus): boolean {
  return status === "HARRY_SIGNED_FINAL";
}
