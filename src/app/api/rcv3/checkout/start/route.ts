import { randomUUID } from "node:crypto";
import { z } from "zod";
import { session, stableId, input, reply, failure } from "@/lib/rcv3/access";
import { cloudStore } from "@/lib/rcv3/cloud-state";
import { readDraftRegistry } from "@/lib/rcv3/room-draft";
import { checkoutRuntime, validateCreationDraft, orderLedger, checkoutForOrder } from "@/lib/rcv3/checkout-ledger";
import { prepareOrder, quoteFingerprint, bundleForDraft, validateStripePrices } from "@/lib/rcv3/stripe-checkout";
import { verifyCustomerSetup } from "@/lib/rcv3/customer-setup";
export const maxDuration = 60;
export async function POST(request:Request) {
 try {
  const {user,db} = await session();
  const d = z.object({draftId:z.string().uuid(),expectedRevision:z.number().int().nonnegative(),quoteHash:z.string().length(64),termsHash:z.string().length(64),signature:z.string().trim().min(2).max(160),recurringConsent:z.literal(true)}).strict().parse(await input(request,2000));
  const {stripe,catalog,origin} = checkoutRuntime();
  const registry = await readDraftRegistry(cloudStore(db,user.id,stableId(user.id,"room-creation-drafts")));
  if(registry.revision!==d.expectedRevision)throw new Error("RCV3_CONFLICT");
  const saved = registry.drafts.find(x=>x.id===d.draftId);
  if(!saved)throw new Error("RCV3_NOT_FOUND");
  const draft = validateCreationDraft(saved.input);
  if(quoteFingerprint(catalog,draft)!==d.quoteHash)throw new Error("RCV3_PRICE_CHANGED");
  await verifyCustomerSetup(user.id,d.draftId,draft);
  const ledger = orderLedger();
  let row = await ledger.one("draft_id",d.draftId,user.id);
  if(row?.snapshot.paymentMethod === "bank")throw new Error("RCV3_ORDER_LOCKED");
  const order = prepareOrder({id:row?.id || randomUUID(),ownerId:user.id,draftId:d.draftId,draft,catalog,signature:d.signature,acceptedTermsHash:d.termsHash});
  if(row && (row.snapshot.order.draftHash!==order.draftHash || row.snapshot.order.termsHash!==order.termsHash || JSON.stringify(row.snapshot.order.lines)!==JSON.stringify(order.lines)))throw new Error("RCV3_ORDER_LOCKED");
  await validateStripePrices(stripe,catalog,bundleForDraft(catalog,draft).lines);
  row ??= await ledger.insert({order,draft,termsText:catalog.terms.text,accountId:catalog.accountId,origin,recurringConsent:true,paymentMethod:"card",billingContact:{email:user.email,name:user.fullName}});
  if(row.snapshot.order.draftHash!==order.draftHash || row.snapshot.order.termsHash!==order.termsHash || JSON.stringify(row.snapshot.order.lines)!==JSON.stringify(order.lines))throw new Error("RCV3_ORDER_LOCKED");
  return reply(await checkoutForOrder(row,ledger));
 } catch(e) {return failure(e);}
}
