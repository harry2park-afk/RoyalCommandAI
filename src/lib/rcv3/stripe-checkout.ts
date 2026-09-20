import Stripe from "stripe";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { draftInputSchema, type RoomDraftInput } from "./room-draft";
import { requestedServices } from "./creation-commerce";

// Sandbox adapter only. OAuth access in ChatGPT is not an application API key.
// No fallback to a live key, old pricing constants, or a browser-supplied price.
const termsSchema = z.object({ version: z.string().min(1), text: z.string().min(20).max(40000) }).strict();
const bundleSchema = z.object({
  purpose: z.string(), services: z.array(z.string()).min(1).max(30),
  lines: z.array(z.object({ serviceId: z.string(), label: z.string().min(1), priceId: z.string().regex(/^price_[a-zA-Z0-9]+$/), amountMinor: z.number().int().positive() }).strict()).min(1).max(30),
}).strict().superRefine((b, ctx) => {
  const ids = b.lines.map(l => l.serviceId);
  if (new Set(b.services).size !== b.services.length || new Set(ids).size !== ids.length ||
      [...b.services].sort().join("|") !== ids.sort().join("|") || new Set(b.lines.map(l => l.priceId)).size !== b.lines.length) {
    ctx.addIssue({ code: "custom", message: "CATALOG_MISMATCH" });
  }
});
export const checkoutCatalogSchema = z.object({
  version: z.string().min(1), accountId: z.string().regex(/^acct_[a-zA-Z0-9]+$/),
  currency: z.literal("aud"), tax: z.literal("included"), terms: termsSchema,
  bundles: z.array(bundleSchema).min(1).max(200),
  countries: z.array(z.string().regex(/^[A-Z]{2}$/)).min(1).max(249).optional(),
}).strict();
export type CheckoutCatalog = z.infer<typeof checkoutCatalogSchema>;
export type CheckoutLine = CheckoutCatalog["bundles"][number]["lines"][number];
export type CheckoutOrder = {
  id: string; ownerId: string; draftId: string; draftHash: string; catalogVersion: string;
  termsVersion: string; termsHash: string; signature: string; acceptedAt: string;
  currency: "aud"; lines: CheckoutLine[]; expiresAt: number;
  integrationIdentifier: string;
};
export function draftFingerprint(draft: RoomDraftInput) {
  // Parse before hashing to give object keys a stable schema order.
  const d = draftInputSchema.parse(draft);
  const canonical = { ...d, step: 0, answers: Object.fromEntries(Object.entries(d.answers).sort(([a], [b]) => a.localeCompare(b)).map(([k,v]) => [k,[...v].sort()])), providers: [...d.providers].sort(), tasks: [...d.tasks].sort() };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
export function quoteFingerprint(catalog: CheckoutCatalog, draft: RoomDraftInput) {
  return createHash("sha256").update(JSON.stringify({draft:draftFingerprint(draft),version:catalog.version,account:catalog.accountId,currency:catalog.currency,terms:termsFingerprint(catalog.terms),lines:bundleForDraft(catalog,draft).lines})).digest("hex");
}
export function termsFingerprint(terms: CheckoutCatalog["terms"]) {
  return createHash("sha256").update(`${terms.version}\n${terms.text}`).digest("hex");
}
export function bundleForDraft(catalog: CheckoutCatalog, draft: RoomDraftInput) {
  if (draft.onboarding && (!draft.onboarding.country || !catalog.countries?.includes(draft.onboarding.country))) throw new Error("RCV3_COUNTRY_NOT_SUPPORTED");
  const wanted = requestedServices(draft).sort().join("|");
  const matches = catalog.bundles.filter(b => b.purpose === draft.purpose && [...b.services].sort().join("|") === wanted);
  if (draft.plan !== "paid" || matches.length !== 1) throw new Error("RCV3_PRICE_NOT_CONFIGURED");
  return matches[0];
}
export function readCheckoutConfiguration(env: NodeJS.ProcessEnv = process.env) {
  if (env.VERCEL_ENV !== "preview" && env.NODE_ENV !== "development") throw new Error("RCV3_NOT_FOUND");
  const key = env.RCV3_STRIPE_TEST_KEY;
  if (!key || !/^(rk|sk)_test_/.test(key)) throw new Error("RCV3_CHECKOUT_NOT_CONFIGURED");
  let raw: unknown;
  try { raw = JSON.parse(env.RCV3_CHECKOUT_CATALOG || ""); } catch { throw new Error("RCV3_PRICE_NOT_CONFIGURED"); }
  const parsed = checkoutCatalogSchema.safeParse(raw);
  if (!parsed.success) throw new Error("RCV3_PRICE_NOT_CONFIGURED");
  return { key, catalog: parsed.data };
}
export function previewStripe(key: string) {
  if (!/^(rk|sk)_test_/.test(key)) throw new Error("RCV3_CHECKOUT_NOT_CONFIGURED");
  return new Stripe(key, { maxNetworkRetries: 2, timeout: 15000 });
}
export function prepareOrder(args: { id: string; ownerId: string; draftId: string; draft: RoomDraftInput; catalog: CheckoutCatalog; signature: string; acceptedTermsHash: string; now?: number }): CheckoutOrder {
  const { catalog, draft } = args;
  const signature = z.string().trim().min(2).max(160).parse(args.signature);
  for (const id of [args.id,args.ownerId,args.draftId]) z.string().uuid().parse(id);
  if (args.acceptedTermsHash !== termsFingerprint(catalog.terms) || !draft.name.trim()) throw new Error("RCV3_CONSENT_REQUIRED");
  const now = args.now ?? Date.now();
  const letters = Array.from(randomBytes(8), byte => String.fromCharCode(97 + byte % 26)).join("");
  return { id: args.id, ownerId: args.ownerId, draftId: args.draftId, draftHash: draftFingerprint(draft),
    catalogVersion: catalog.version, termsVersion: catalog.terms.version, termsHash: args.acceptedTermsHash,
    signature, acceptedAt: new Date(now).toISOString(), currency: catalog.currency,
    lines: bundleForDraft(catalog, draft).lines.map(line=>({...line})), expiresAt: Math.floor(now / 1000) + 3600,
    integrationIdentifier: `rcv3-preview-${letters}` };
}
export async function validateStripePrices(stripe: Stripe, catalog: CheckoutCatalog, lines: CheckoutLine[]) {
  const account = await stripe.accounts.retrieve(null);
  if (account.id !== catalog.accountId) throw new Error("RCV3_PAYMENT_ACCOUNT");
  const prices = await Promise.all(lines.map(line => stripe.prices.retrieve(line.priceId)));
  for (let i = 0; i < prices.length; i++) {
    const p = prices[i], l = lines[i];
    if (p.livemode || !p.active || p.currency !== catalog.currency || p.unit_amount !== l.amountMinor ||
        p.type !== "recurring" || p.recurring?.interval !== "month" || p.recurring.interval_count !== 1 ||
        p.recurring.usage_type !== "licensed" || p.billing_scheme !== "per_unit" || p.transform_quantity ||
        p.tax_behavior !== "inclusive") throw new Error("RCV3_PRICE_CHANGED");
  }
}
// Caller must first atomically persist this immutable order in SERVER-OWNED
// storage. Retries reuse the stored order; they must not generate a new ID/time.
// This adapter does not grant entitlements or activate rooms.
export async function createTestCheckout(stripe: Stripe, order: CheckoutOrder, trustedOrigin: string) {
  const origin = new URL(trustedOrigin);
  if (origin.protocol !== "https:" || origin.origin !== trustedOrigin) throw new Error("RCV3_ORIGIN");
  // Reuse the exact persisted request even after expiry: Stripe returns its
  // idempotent result after a lost response, or rejects an expired new session.
  const metadata = { rcv3_order: order.id, rcv3_owner: order.ownerId, rcv3_draft: order.draftId, rcv3_hash: order.draftHash };
  const result = await stripe.checkout.sessions.create({
    mode: "subscription", line_items: order.lines.map(line => ({ price: line.priceId, quantity: 1 })),
    client_reference_id: order.id, metadata, subscription_data: { metadata },
    integration_identifier: order.integrationIdentifier, expires_at: order.expiresAt,
    success_url: `${trustedOrigin}/rcv3/create?draft=${order.draftId}&checkout={CHECKOUT_SESSION_ID}`,
    cancel_url: `${trustedOrigin}/rcv3/create?draft=${order.draftId}`,
  }, { idempotencyKey: `rcv3-checkout-${order.id}` });
  if (result.livemode || !result.url || new URL(result.url).origin !== "https://checkout.stripe.com") throw new Error("RCV3_PAYMENT_RESPONSE");
  return { id: result.id, url: result.url };
}
// sessionId must come from the server's persisted order→session mapping,
// never directly from the return URL. Payment verification does not activate.
export async function verifyTestCheckout(stripe: Stripe, order: CheckoutOrder, sessionId: string) {
  if (!/^cs_test_[a-zA-Z0-9]+$/.test(sessionId)) throw new Error("RCV3_PAYMENT_MISMATCH");
  const s = await stripe.checkout.sessions.retrieve(sessionId);
  if (s.livemode || s.mode !== "subscription" || s.client_reference_id !== order.id || s.metadata?.rcv3_owner !== order.ownerId ||
      s.metadata.rcv3_order !== order.id || s.metadata.rcv3_hash !== order.draftHash || s.metadata.rcv3_draft !== order.draftId) throw new Error("RCV3_PAYMENT_MISMATCH");
  if (s.status !== "complete" || s.payment_status !== "paid") return { paid: false as const };
  const expected = order.lines.reduce((sum, line) => sum + line.amountMinor, 0);
  if (s.currency !== order.currency || s.amount_total !== expected || s.total_details?.amount_discount) throw new Error("RCV3_PAYMENT_MISMATCH");
  const lines = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 100 });
  const expectedLines = order.lines.map(l => `${l.priceId}:1:${l.amountMinor}`).sort();
  const actualLines = lines.data.map(l => `${l.price?.id}:${l.quantity}:${l.amount_total}`).sort();
  if (lines.has_more || JSON.stringify(actualLines) !== JSON.stringify(expectedLines)) throw new Error("RCV3_PAYMENT_MISMATCH");
  const subId = typeof s.subscription === "string" ? s.subscription : s.subscription?.id;
  if (!subId) throw new Error("RCV3_PAYMENT_MISMATCH");
  const sub = await stripe.subscriptions.retrieve(subId, { expand: ["latest_invoice"] });
  if (sub.livemode || sub.metadata.rcv3_order !== order.id || sub.metadata.rcv3_owner !== order.ownerId || sub.status !== "active") return { paid: false as const };
  const customerId = (v: string | {id:string} | null) => typeof v === "string" ? v : v?.id;
  if (!customerId(s.customer) || customerId(s.customer) !== customerId(sub.customer) || sub.metadata.rcv3_draft !== order.draftId || sub.metadata.rcv3_hash !== order.draftHash) throw new Error("RCV3_PAYMENT_MISMATCH");
  const currentLines = sub.items.data.map(i => `${i.price.id}:${i.quantity}:${i.price.unit_amount}`).sort();
  if (sub.items.has_more || JSON.stringify(currentLines) !== JSON.stringify(expectedLines) ||
    sub.items.data.some(i => i.price.livemode || i.price.currency !== order.currency || i.price.recurring?.interval !== "month" || i.price.recurring.interval_count !== 1 || i.current_period_end * 1000 <= Date.now())) return {paid:false as const};
  const invoice = typeof sub.latest_invoice === "object" ? sub.latest_invoice : null;
  if (!invoice || invoice.livemode || invoice.status !== "paid" || invoice.currency !== order.currency ||
    invoice.amount_paid !== expected || invoice.amount_remaining !== 0 || customerId(invoice.customer) !== customerId(s.customer)) return {paid:false as const};
  return { paid: true as const, subscriptionId: subId, sessionId: s.id };
}
export function verifyTestWebhook(stripe: Stripe, raw: string, signature: string, secret: string) {
  if (!secret.startsWith("whsec_") || !signature || Buffer.byteLength(raw) > 1000000) throw new Error("RCV3_WEBHOOK_INVALID");
  try {
    const event = stripe.webhooks.constructEvent(raw, signature, secret);
    if (event.livemode) throw new Error("RCV3_WEBHOOK_INVALID");
    return event;
  } catch { throw new Error("RCV3_WEBHOOK_INVALID"); }
}
