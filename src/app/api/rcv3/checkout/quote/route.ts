import { z } from "zod";
import { session, stableId, input, reply, failure } from "@/lib/rcv3/access";
import { cloudStore } from "@/lib/rcv3/cloud-state";
import { readDraftRegistry } from "@/lib/rcv3/room-draft";
import { readCheckoutConfiguration, previewStripe, bundleForDraft, validateStripePrices, draftFingerprint, termsFingerprint } from "@/lib/rcv3/stripe-checkout";

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
    const { key, catalog } = readCheckoutConfiguration();
    const bundle = bundleForDraft(catalog, draft.input);
    await validateStripePrices(previewStripe(key), catalog, bundle.lines);
    return reply({ draftId: draft.id, draftHash: draftFingerprint(draft.input), catalogVersion: catalog.version,
      currency: catalog.currency, interval: "month", tax: catalog.tax,
      lines: bundle.lines.map(({ serviceId, label, amountMinor }) => ({ serviceId, label, amountMinor })),
      totalMinor: bundle.lines.reduce((sum,line) => sum+line.amountMinor, 0),
      terms: catalog.terms, termsHash: termsFingerprint(catalog.terms),
      // Read-only integration until server order ledger / entitlement enforcement
      // and signed event processing are implemented and independently verified.
      checkoutEnabled: false,
    });
  } catch (e) { return failure(e); }
}

// Authenticated readiness check for deployment verification. It exposes no
// variable names, secret values or customer data and does not call Stripe.
export async function GET() {
  try {
    await session();
    readCheckoutConfiguration();
    return reply({ checkoutEnabled: false, code: "RCV3_ACTIVATION_NOT_READY" });
  } catch (e) { return failure(e); }
}
