import { expect, it } from "vitest";
import { canActivatePaidRoom, creationCheckoutReadiness, type ActivationEvidence } from "./creation-commerce";
const now = Date.parse("2026-09-19T00:00:00Z");
const evidence: ActivationEvidence = {
  expectedDraftId: "10000000-0000-4000-8000-000000000001", expectedDraftRevision: 3,
  quote: { id: "20000000-0000-4000-8000-000000000001", draftId: "10000000-0000-4000-8000-000000000001", draftRevision: 3,
    currency: "aud", expiresAt: "2026-09-20T00:00:00Z", lines: [{ serviceId: "room", label: "Test fixture only", priceId: "price_test", amountMinor: 1, interval: "month" }], termsVersion: "test", termsHash: "a".repeat(64) },
  acceptedQuoteId: "20000000-0000-4000-8000-000000000001", acceptedTermsHash: "a".repeat(64), signature: "Test signer",
  paymentVerifiedByServer: true, paidQuoteId: "20000000-0000-4000-8000-000000000001",
};
it("keeps checkout unavailable until verified commercial configuration exists", () => { expect(creationCheckoutReadiness.ready).toBe(false); });
it("requires matching paid quote, draft version, terms and signature", () => {
  expect(canActivatePaidRoom(evidence, now)).toBe(true);
  for (const patch of [{ paymentVerifiedByServer: false }, { signature: "" }, { expectedDraftRevision: 4 }, { acceptedTermsHash: "changed" }, { paidQuoteId: "other" }, { expectedDraftId: "other" }]) {
    expect(canActivatePaidRoom({ ...evidence, ...patch }, now)).toBe(false);
  }
  expect(canActivatePaidRoom(evidence, Date.parse("2026-09-21T00:00:00Z"))).toBe(false);
});
