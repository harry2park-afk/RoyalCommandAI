import { createHash } from "node:crypto";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { paidRoomEntitlement, orderLedger } from "./checkout-ledger";
import { cloudStore } from "./cloud-state";
export const RCV3_MARKER = "rcv3-private-preview-v1";
export function stableId(owner: string, kind: string) {
  const hex = createHash("sha256").update(`${RCV3_MARKER}:${owner}:${kind}`).digest("hex").slice(0,32).split("");
  hex[12] = "5"; hex[16] = "8"; const s = hex.join("");
  return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;
}
export async function session() {
  if (process.env.VERCEL_ENV !== "preview" && process.env.NODE_ENV !== "development") throw new Error("RCV3_NOT_FOUND");
  const user = await getCurrentUser();
  if (!user || user.mode !== "supabase") throw new Error("RCV3_AUTH");
  return { user, db: await createClient() };
}
export async function access(roomId: string, options: { allowUnpaidRead?: boolean } = {}) {
  const id = z.string().uuid().parse(roomId).toLowerCase();
  const ctx = await session();
  const result = await ctx.db.from("rooms").select("id,room_owner_id,household_id,description,status,name")
    .eq("id", id).eq("room_owner_id", ctx.user.id).eq("description", RCV3_MARKER).eq("status", "draft").maybeSingle();
  if (result.error) throw new Error("RCV3_STORAGE");
  if (!result.data || result.data.household_id !== stableId(ctx.user.id,"household")) throw new Error("RCV3_NOT_FOUND");
  let entitlement;
  let paymentRequired = false;
  try { entitlement = await paidRoomEntitlement(ctx.user.id,id); }
  catch(error) {
    if (!options.allowUnpaidRead || !(error instanceof Error) || error.message !== 'RCV3_PAYMENT_REQUIRED') throw error;
    const order = await orderLedger().one('room_id',id,ctx.user.id);
    if (!order?.activated_at) throw error;
    entitlement = order.snapshot.draft;
    paymentRequired = true;
  }
  return { ...ctx, entitlement, paymentRequired, room: result.data, store: cloudStore(ctx.db, ctx.user.id, id) };
}
export function reply(body: unknown, status = 200, timing?: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...(timing === undefined ? {} : { "Server-Timing": `rcv3;dur=${timing.toFixed(1)}` }) } });
}
export function failure(error: unknown) {
  const code = error instanceof Error && /^RCV3_[A-Z_]+$/.test(error.message) ? error.message : "RCV3_ERROR";
  const status = error instanceof z.ZodError || error instanceof SyntaxError ? 400 : code === "RCV3_AUTH" ? 401 : (code === "RCV3_TOOL_APPROVAL_REQUIRED" || code === "RCV3_EMAIL_APPROVAL_REQUIRED") ? 403 : code === "RCV3_NOT_FOUND" ? 404 : code === "RCV3_CONFLICT" ? 409 : code === "RCV3_LIMIT" ? 429 : 503;
  return reply({ error: status === 401 ? "Please sign in." : status === 403 ? "RC owner approval is required." : status === 409 ? "Another change was saved. Reload the saved version." : "Request failed. Your input is preserved.", code }, status);
}
export async function input(request: Request, max = 1500000) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new Error("RCV3_ORIGIN");
  if (Number(request.headers.get("content-length") || 0) > max) throw new Error("RCV3_SIZE");
  const body = await request.text();
  if (body.length > max) throw new Error("RCV3_SIZE");
  return JSON.parse(body) as unknown;
}
