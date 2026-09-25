import { randomUUID } from "node:crypto";
import { z } from "zod";
import { session, stableId, input, reply, failure } from "@/lib/rcv3/access";
import { cloudStore } from "@/lib/rcv3/cloud-state";
import { readDraftRegistry } from "@/lib/rcv3/room-draft";
import { checkoutRuntime, validateCreationDraft, orderLedger } from "@/lib/rcv3/checkout-ledger";
import { prepareOrder, quoteFingerprint, bundleForDraft, validateStripePrices } from "@/lib/rcv3/stripe-checkout";
import { verifyCustomerSetup } from "@/lib/rcv3/customer-setup";

// Records an authenticated, signed, immutable bank-transfer request. A bank
// receipt, browser acknowledgement, or this route can never activate a room.
export async function POST(request: Request) {
 try {
  const { user, db } = await session();
  const body = z.object({draftId:z.string().uuid(),expectedRevision:z.number().int().nonnegative(),quoteHash:z.string().length(64),termsHash:z.string().length(64),signature:z.string().trim().min(2).max(160),termsConsent:z.literal(true)}).strict().parse(await input(request,2000));
  const {stripe,catalog,origin} = checkoutRuntime();
  const registry = await readDraftRegistry(cloudStore(db,user.id,stableId(user.id,"room-creation-drafts")));
  if(registry.revision !== body.expectedRevision)throw new Error("RCV3_CONFLICT");
  const saved=registry.drafts.find(x=>x.id===body.draftId);
  if(!saved)throw new Error("RCV3_NOT_FOUND");
  const draft=validateCreationDraft(saved.input);
  if(quoteFingerprint(catalog,draft)!==body.quoteHash)throw new Error("RCV3_PRICE_CHANGED");
  await verifyCustomerSetup(user.id,body.draftId,draft);
  await validateStripePrices(stripe,catalog,bundleForDraft(catalog,draft).lines);
  const ledger=orderLedger();
  let row=await ledger.one("draft_id",body.draftId,user.id);
  if(row && row.snapshot.paymentMethod!=="bank")throw new Error("RCV3_ORDER_LOCKED");
  const order=prepareOrder({id:row?.id||randomUUID(),ownerId:user.id,draftId:body.draftId,draft,catalog,signature:body.signature,acceptedTermsHash:body.termsHash});
  row??=await ledger.insert({order,draft,termsText:catalog.terms.text,accountId:catalog.accountId,origin,recurringConsent:false,paymentMethod:"bank",billingContact:{email:user.email,name:user.fullName}});
  if(row.snapshot.paymentMethod!=="bank"||row.snapshot.order.draftHash!==order.draftHash||row.snapshot.order.termsHash!==order.termsHash||row.snapshot.order.signature!==order.signature||JSON.stringify(row.snapshot.order.lines)!==JSON.stringify(order.lines))throw new Error("RCV3_ORDER_LOCKED");
  return reply({status:"pending",orderId:row.id});
 } catch(e) {return failure(e);}
}
