import { z } from "zod";
import { session, stableId, input, reply, failure } from "@/lib/rcv3/access";
import { cloudStore } from "@/lib/rcv3/cloud-state";
import { readDraftRegistry } from "@/lib/rcv3/room-draft";
import { previewStripe, bundleForDraft, validateStripePrices, draftFingerprint, termsFingerprint, quoteFingerprint } from "@/lib/rcv3/stripe-checkout";

import { checkoutRuntime, validateCreationDraft } from "@/lib/rcv3/checkout-ledger";
export const maxDuration = 120;

// Read-only quote. This route neither creates a Stripe session nor activates a
// room. No amount, price ID, owner ID or payment status is accepted from clients.
export async function POST(request: Request) {
  try {
    const { user, db } = await session();
    const body = z.object({ draftId: z.string().uuid(), expectedRevision: z.number().int().nonnegative() }).strict().parse(await input(request, 1000));
    const registry = await readDraftRegistry(cloudStore(db, user.id, stableId(user.id, "room-creation-drafts")));
    if (registry.revision !== body.expectedRevision) throw new Error("RCV3_CONFLICT");
    const draft = registry.drafts.find(d => d.id === body.draftId);
    if (!draft) throw new Error("RCV3_NOT_FOUND");
    validateCreationDraft(draft.input);
    const { key, catalog } = checkoutRuntime();
    const bundle = bundleForDraft(catalog, draft.input);
    // A pending room can be created before its requested connections work.
    // Activation retains its separate owner-scoped setup checks.
    await validateStripePrices(previewStripe(key), catalog, bundle.lines);
    return reply({ draftId: draft.id, draftHash: draftFingerprint(draft.input), catalogVersion: catalog.version,
      currency: catalog.currency, interval: "month", tax: catalog.tax,
      lines: bundle.lines.map(({ serviceId, label, amountMinor }) => ({ serviceId, label, amountMinor })),
      totalMinor: bundle.lines.reduce((sum,line) => sum+line.amountMinor, 0),
      quoteHash: quoteFingerprint(catalog,draft.input),
      terms: catalog.terms, termsHash: termsFingerprint(catalog.terms),
      checkoutEnabled: true,
    });
  } catch (e) { return failure(e); }
}

// Authenticated readiness check for deployment verification. It exposes no
// variable names, secret values or customer data and does not call Stripe.
export async function GET() {
  try {
    await session();
    checkoutRuntime();
    return reply({ checkoutEnabled: true });
  } catch (e) { return failure(e); }
}
