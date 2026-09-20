import { z } from "zod";
import type { RoomDraftInput } from "./room-draft";

// This is an activation decision, not a quotation calculator. Prices must come
// from an approved server catalogue and a verified payment provider, never from
// the browser, an AI reply or older mixed-currency constants.
export const approvedQuoteSchema = z.object({
  id: z.string().uuid(), draftId: z.string().uuid(), draftRevision: z.number().int().positive(),
  currency: z.string().regex(/^[a-z]{3}$/), expiresAt: z.string().datetime(),
  lines: z.array(z.object({
    serviceId: z.string().min(1), label: z.string().min(1),
    priceId: z.string().regex(/^price_/), amountMinor: z.number().int().nonnegative(),
    interval: z.enum(["month", "one_time"]),
  }).strict()).min(1),
  termsVersion: z.string().min(1), termsHash: z.string().min(32),
}).strict();
export type ApprovedQuote = z.infer<typeof approvedQuoteSchema>;
export type ActivationEvidence = {
  expectedDraftId: string; expectedDraftRevision: number;
  quote: ApprovedQuote; acceptedQuoteId: string; acceptedTermsHash: string;
  signature: string; paymentVerifiedByServer: boolean; paidQuoteId: string;
};
export function canActivatePaidRoom(e: ActivationEvidence, now = Date.now()): boolean {
  const quote = approvedQuoteSchema.safeParse(e.quote);
  return quote.success && quote.data.draftId === e.expectedDraftId &&
    quote.data.draftRevision === e.expectedDraftRevision &&
    Date.parse(quote.data.expiresAt) > now &&
    e.acceptedQuoteId === quote.data.id && e.acceptedTermsHash === quote.data.termsHash &&
    e.signature.trim().length > 1 && e.paymentVerifiedByServer === true && e.paidQuoteId === quote.data.id;
}
export function requestedServices(d: RoomDraftInput) {
  return ["room", ...d.providers.map(id => `${d.onboarding?.aiSources[id] === "personal" ? "ai-personal" : "ai"}:${id}`), ...(d.secretary ? ["secretary"] : []), ...(d.specialAI ? ["special-ai"] : [])];
}
// No live catalog/terms/payment evidence has been verified for this Preview.
// Keep the new paid activation flow closed until all three are configured.
// Do not wire a browser success URL, checkbox or draft field to this decision.
export const creationCheckoutReadiness = {
  ready: false,
  code: "RCV3_CHECKOUT_NOT_CONFIGURED",
} as const;
