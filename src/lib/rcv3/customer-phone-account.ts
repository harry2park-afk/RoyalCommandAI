import { createCipheriv, createDecipheriv, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const uuid = z.uuid(), accountId = z.string().regex(/^AC[a-f0-9]{32}$/i), numberId = z.string().regex(/^PN[a-f0-9]{32}$/i);
const tokenSchema = z.string().regex(/^[a-f0-9]{32}$/i);
const numberSchema = z.object({ sid: numberId, account_sid: accountId, phone_number: z.string().regex(/^\+[1-9]\d{6,14}$/), capabilities: z.object({ voice: z.boolean() }), voice_url: z.string().nullable().optional(), voice_method: z.string().nullable().optional(), voice_application_sid: z.string().nullable().optional(), trunk_sid: z.string().nullable().optional() });
export const customerCarrierSchema = z.object({ accountSid: accountId, authToken: tokenSchema }).strict();
type Credential = z.infer<typeof customerCarrierSchema>;
const accounts = "rcv3_customer_phone_accounts", bindings = "rcv3_customer_phone_bindings", calls = "rcv3_customer_phone_calls";
function encryptionKey() {
  const key = process.env.RCV3_CREDENTIAL_ENCRYPTION_KEY || "";
  if (!/^[a-f0-9]{64}$/i.test(key)) throw new Error("RCV3_PHONE_NOT_CONFIGURED");
  return Buffer.from(key, "hex");
}
export function sealCustomerCarrier(owner: string, credential: Credential) {
  uuid.parse(owner); customerCarrierSchema.parse(credential);
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(`rcv3-customer-phone:v1:${owner}`));
  const data = Buffer.concat([cipher.update(JSON.stringify(credential), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64url");
}
export function openCustomerCarrier(owner: string, value: string): Credential {
  try {
    uuid.parse(owner); const bytes = Buffer.from(value, "base64url");
    if (bytes.length < 29 || bytes.length > 1024) throw new Error();
    const cipher = createDecipheriv("aes-256-gcm", encryptionKey(), bytes.subarray(0, 12));
    cipher.setAAD(Buffer.from(`rcv3-customer-phone:v1:${owner}`)); cipher.setAuthTag(bytes.subarray(12, 28));
    return customerCarrierSchema.parse(JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString("utf8")));
  } catch { throw new Error("RCV3_PHONE_RECONNECT"); }
}
export function customerVoiceConfiguration() {
  const origin = process.env.RCV3_CUSTOMER_PHONE_ORIGIN || "", agentId = process.env.RCV3_CUSTOMER_RETELL_AGENT_ID || "", key = process.env.RCV3_CUSTOMER_RETELL_API_KEY || "";
  let url: URL;
  try { url = new URL(origin); } catch { throw new Error("RCV3_PHONE_ROUTING_NOT_CONFIGURED"); }
  if (url.origin !== origin || url.protocol !== "https:" || url.username || url.password || !key || !/^agent_[A-Za-z0-9_-]+$/.test(agentId) || process.env.RCV3_CUSTOMER_RETELL_AGENT_APPROVED !== "true") throw new Error("RCV3_PHONE_ROUTING_NOT_CONFIGURED");
  if (agentId === process.env.RETELL_OWNER_REPORT_INBOUND_AGENT_ID || agentId === process.env.RETELL_OWNER_REPORT_AGENT_ID) throw new Error("RCV3_PHONE_ROUTING_NOT_CONFIGURED");
  if (key === process.env.RETELL_API_KEY || key === process.env.RETELL_API_KEY_PREVIEW) throw new Error("RCV3_PHONE_ROUTING_NOT_CONFIGURED");
  return { origin, agentId, key };
}
async function verifyCustomerVoiceAgent() {
  const config = customerVoiceConfiguration();
  try {
    const response = await fetch(`https://api.retellai.com/get-agent/${encodeURIComponent(config.agentId)}`, { headers: { Authorization: `Bearer ${config.key}` }, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error();
    z.object({ agent_id: z.literal(config.agentId), is_published: z.literal(true) }).parse(await response.json());
  } catch { throw new Error("RCV3_PHONE_AGENT_UNAVAILABLE"); }
  return config;
}
async function carrierRequest(credential: Credential, suffix: string, body?: URLSearchParams) {
  let response: Response;
  try { response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${credential.accountSid}/${suffix}`, { method: body ? "POST" : "GET", headers: { Authorization: `Basic ${Buffer.from(`${credential.accountSid}:${credential.authToken}`).toString("base64")}`, ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) }, body, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(12000) }); }
  catch { throw new Error("RCV3_PHONE_PROVIDER_UNAVAILABLE"); }
  if (!response.ok) throw new Error("RCV3_PHONE_ACCOUNT_UNVERIFIED");
  try { return await response.json(); } catch { throw new Error("RCV3_PHONE_PROVIDER_UNAVAILABLE"); }
}
async function reserveCheck(owner: string) {
  const db = createAdminClient(), hour = new Date().toISOString().slice(0, 13);
  for (let slot = 0; slot < 6; slot++) {
    const { error } = await db.from("rcv3_customer_phone_checks").insert({ owner_id: owner, hour, slot });
    if (!error) return;
    if (error.code !== "23505") throw new Error("RCV3_PHONE_NOT_CONFIGURED");
  }
  throw new Error("RCV3_LIMIT");
}
async function credentialFor(owner: string) {
  uuid.parse(owner);
  const { data, error } = await createAdminClient().from(accounts).select("ciphertext").eq("owner_id", owner).maybeSingle();
  if (error || !data) throw new Error("RCV3_PHONE_RECONNECT");
  return openCustomerCarrier(owner, data.ciphertext);
}
async function ownedNumber(credential: Credential, sid: string) {
  numberId.parse(sid);
  let n: z.infer<typeof numberSchema>;
  try { n = numberSchema.parse(await carrierRequest(credential, `IncomingPhoneNumbers/${sid}.json`)); }
  catch { throw new Error("RCV3_PHONE_NUMBER_UNVERIFIED"); }
  if (n.account_sid !== credential.accountSid || !n.capabilities.voice || n.sid !== sid || n.phone_number === process.env.RETELL_OWNER_REPORT_FROM || n.phone_number === process.env.TWILIO_FROM_NUMBER) throw new Error("RCV3_PHONE_NUMBER_UNVERIFIED");
  return n;
}
export async function saveCustomerPhoneAccount(owner: string, candidate: unknown) {
  uuid.parse(owner); const credential = customerCarrierSchema.parse(candidate);
  if (credential.accountSid === process.env.TWILIO_ACCOUNT_SID) throw new Error("RCV3_PHONE_USE_OWN_ACCOUNT");
  const ciphertext = sealCustomerCarrier(owner, credential); await reserveCheck(owner);
  const list = z.object({ incoming_phone_numbers: z.array(numberSchema) }).parse(await carrierRequest(credential, "IncomingPhoneNumbers.json?PageSize=100"));
  if (list.incoming_phone_numbers.some(n => n.account_sid !== credential.accountSid)) throw new Error("RCV3_PHONE_ACCOUNT_UNVERIFIED");
  const { error } = await createAdminClient().from(accounts).upsert({ owner_id: owner, account_sid: credential.accountSid, ciphertext, verified_at: new Date().toISOString() }, { onConflict: "owner_id" });
  if (error) throw new Error("RCV3_PHONE_ACCOUNT_UNVERIFIED");
  return { connected: true, numbers: list.incoming_phone_numbers.filter(n => n.capabilities.voice).map(n => ({ id: n.sid, number: n.phone_number })), billingOwner: "customer", billingChannel: "carrier", rcPhoneCharges: false };
}
export async function customerPhoneAccountStatus(owner: string) {
  uuid.parse(owner);
  const accountConnectionAvailable = /^[a-f0-9]{64}$/i.test(process.env.RCV3_CREDENTIAL_ENCRYPTION_KEY || "");
  let routingReady = false; try { customerVoiceConfiguration(); routingReady = true; } catch { /* Separate account verification from voice readiness. */ }
  try {
    const credential = await credentialFor(owner);
    const list = z.object({ incoming_phone_numbers: z.array(numberSchema) }).parse(await carrierRequest(credential, "IncomingPhoneNumbers.json?PageSize=100"));
    return { connected: true, numbers: list.incoming_phone_numbers.filter(n => n.account_sid === credential.accountSid && n.capabilities.voice).map(n => ({ id: n.sid, number: n.phone_number })), routingReady, accountConnectionAvailable, billingOwner: "customer", billingChannel: "carrier", rcPhoneCharges: false };
  } catch { return { connected: false, numbers: [], routingReady, accountConnectionAvailable, billingOwner: "customer", billingChannel: "carrier", rcPhoneCharges: false }; }
}
export async function validateCustomerOwnedPhone(owner: string, sid: string) {
  customerVoiceConfiguration();
  const credential = await credentialFor(owner), n = await ownedNumber(credential, sid);
  if (n.trunk_sid || n.voice_application_sid) throw new Error("RCV3_PHONE_EXISTING_ROUTING");
  await verifyCustomerVoiceAgent();
  return { id: n.sid, number: n.phone_number, accountSid: credential.accountSid };
}
async function paidSecretaryRoom(owner: string, roomId: string) {
  uuid.parse(owner); uuid.parse(roomId);
  const { paidRoomEntitlement } = await import("./checkout-ledger");
  const entitlement = await paidRoomEntitlement(owner, roomId);
  if (!entitlement?.secretary) throw new Error("RCV3_PHONE_PAID_ROOM_REQUIRED");
  const { data, error } = await createAdminClient().from("rooms").select("id").eq("id", roomId).eq("room_owner_id", owner).maybeSingle();
  if (error || !data) throw new Error("RCV3_NOT_FOUND");
  return entitlement;
}
export async function bindCustomerPhone(owner: string, roomId: string, sid: string, consent: boolean) {
  if (consent !== true) throw new Error("RCV3_PHONE_CONSENT_REQUIRED");
  const entitlement = await paidSecretaryRoom(owner, roomId);
  if (!entitlement.onboarding?.phoneRequested || entitlement.onboarding.phoneNumberId !== sid || !entitlement.onboarding.phoneConsent) throw new Error("RCV3_PHONE_CONSENT_REQUIRED");
  return bindOwnedNumber(owner, roomId, sid);
}
export async function bindCustomerPhoneForPaidOrder(owner: string, roomId: string, sid: string, consent: boolean, orderId: string) {
  if (consent !== true) throw new Error("RCV3_PHONE_CONSENT_REQUIRED");
  uuid.parse(owner); uuid.parse(roomId); uuid.parse(orderId);
  const { orderLedger, checkoutRuntime } = await import("./checkout-ledger");
  const { verifyTestCheckout } = await import("./stripe-checkout");
  const row = await orderLedger().one("id", orderId, owner);
  if (!row || row.room_id !== roomId || !row.session_id || !row.snapshot.draft.secretary) throw new Error("RCV3_PHONE_PAID_ROOM_REQUIRED");
  const selection = row.snapshot.draft.onboarding;
  if (!selection?.phoneRequested || selection.phoneNumberId !== sid || !selection.phoneConsent) throw new Error("RCV3_PHONE_CONSENT_REQUIRED");
  const { stripe, catalog } = checkoutRuntime();
  if (row.snapshot.accountId !== catalog.accountId || !(await verifyTestCheckout(stripe, row.snapshot.order, row.session_id)).paid) throw new Error("RCV3_PHONE_PAID_ROOM_REQUIRED");
  const room = await createAdminClient().from("rooms").select("id").eq("id", roomId).eq("room_owner_id", owner).maybeSingle();
  if (room.error || !room.data) throw new Error("RCV3_NOT_FOUND");
  return bindOwnedNumber(owner, roomId, sid);
}
async function bindOwnedNumber(owner: string, roomId: string, sid: string) {
  const config = await verifyCustomerVoiceAgent(), credential = await credentialFor(owner), n = await ownedNumber(credential, sid);
  if (n.trunk_sid || n.voice_application_sid) throw new Error("RCV3_PHONE_EXISTING_ROUTING");
  const db = createAdminClient();
  const previous = await db.from(bindings).select("*").eq("number_sid", sid).maybeSingle();
  if (previous.error) throw new Error("RCV3_STORAGE");
  if (previous.data && (previous.data.owner_id !== owner || previous.data.room_id !== roomId || previous.data.account_sid !== credential.accountSid)) throw new Error("RCV3_PHONE_ALREADY_BOUND");
  const id = previous.data?.id || randomUUID(), webhook = `${config.origin}/api/rcv3/customer-phone/inbound?binding=${id}`;
  if (previous.data && n.voice_url === webhook && n.voice_method === "POST") {
    // Reconcile an uncertain prior carrier response using an authoritative GET,
    // never by repeating the VoiceUrl mutation. Also refresh a rotated token.
    const saved = await db.from(bindings).update({ state: "configured", ciphertext: sealCustomerCarrier(owner, credential) }).eq("id", id).eq("owner_id", owner);
    if (saved.error) throw new Error("RCV3_STORAGE");
    return { status: "configured", number: n.phone_number, connected: false };
  }
  if (previous.data && previous.data.state !== "configured") throw new Error("RCV3_PHONE_RECONCILE_REQUIRED");
  const row = { id, owner_id: owner, room_id: roomId, account_sid: credential.accountSid, number_sid: sid, phone_e164: n.phone_number, ciphertext: sealCustomerCarrier(owner, credential), agent_id: config.agentId, webhook_url: webhook, prior_voice_url: n.voice_url || "", prior_voice_method: n.voice_method || "POST", state: "binding" };
  const insert = await db.from(bindings).insert(row);
  if (insert.error) throw new Error(insert.error.code === "23505" ? "RCV3_PHONE_RECONCILE_REQUIRED" : "RCV3_STORAGE");
  try {
    const result = numberSchema.parse(await carrierRequest(credential, `IncomingPhoneNumbers/${sid}.json`, new URLSearchParams({ VoiceUrl: webhook, VoiceMethod: "POST" })));
    if (result.sid !== sid || result.account_sid !== credential.accountSid || result.voice_url !== webhook || result.voice_method !== "POST") throw new Error();
    const saved = await db.from(bindings).update({ state: "configured" }).eq("id", id).eq("state", "binding");
    if (saved.error) throw new Error();
    return { status: "configured", number: n.phone_number, connected: false };
  } catch {
    await db.from(bindings).update({ state: "reconcile" }).eq("id", id);
    throw new Error("RCV3_PHONE_RECONCILE_REQUIRED");
  }
}
export function validTwilioSignature(url: string, params: URLSearchParams, signature: string | null, token: string) {
  if (!signature || !/^[A-Za-z0-9+/]{27}=$/.test(signature)) return false;
  const keys = Array.from(new Set(params.keys())).sort();
  if (keys.some(k => params.getAll(k).length !== 1)) return false;
  const payload = url + keys.map(k => k + params.get(k)).join("");
  const expected = createHmac("sha1", token).update(payload).digest();
  const actual = Buffer.from(signature, "base64");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export function callSipXml(callId: string) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(callId)) throw new Error("RCV3_PHONE_PROVIDER_UNAVAILABLE");
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Dial><Sip>sip:${callId}@sip.retellai.com</Sip></Dial></Response>`;
}
export async function customerInboundCall(bindingId: string, params: URLSearchParams, signature: string | null) {
  uuid.parse(bindingId); const config = customerVoiceConfiguration(), db = createAdminClient();
  const { data: binding, error } = await db.from(bindings).select("*").eq("id", bindingId).eq("state", "configured").maybeSingle();
  if (error || !binding || binding.agent_id !== config.agentId) throw new Error("RCV3_PHONE_SIGNATURE");
  const credential = openCustomerCarrier(binding.owner_id, binding.ciphertext);
  if (params.get("AccountSid") !== binding.account_sid || params.get("To") !== binding.phone_e164 || !validTwilioSignature(binding.webhook_url, params, signature, credential.authToken)) throw new Error("RCV3_PHONE_SIGNATURE");
  const entitlement = await paidSecretaryRoom(binding.owner_id, binding.room_id);
  if (!entitlement.onboarding?.phoneRequested || entitlement.onboarding.phoneNumberId !== binding.number_sid || !entitlement.onboarding.phoneConsent) throw new Error("RCV3_PHONE_CONSENT_REQUIRED");
  const sid = z.string().regex(/^CA[a-f0-9]{32}$/i).parse(params.get("CallSid"));
  // Customers know their own carrier token: a valid signature alone must not
  // let a synthetic CallSid spend the platform's voice-agent credits.
  let carrierCall: { sid: string; account_sid: string; to: string; from: string; direction: string; status: string };
  try { carrierCall = z.object({ sid: z.literal(sid), account_sid: z.literal(binding.account_sid), to: z.literal(binding.phone_e164), from: z.string(), direction: z.literal("inbound"), status: z.enum(["queued", "ringing", "in-progress"]) }).parse(await carrierRequest(credential, `Calls/${sid}.json`)); }
  catch { throw new Error("RCV3_PHONE_CALL_UNVERIFIED"); }
  if (carrierCall.from !== params.get("From")) throw new Error("RCV3_PHONE_CALL_UNVERIFIED");
  const claim = await db.from(calls).insert({ twilio_call_sid: sid, binding_id: binding.id, room_id: binding.room_id, agent_id: binding.agent_id, state: "registering" });
  if (claim.error) {
    if (claim.error.code !== "23505") throw new Error("RCV3_STORAGE");
    const prior = await db.from(calls).select("retell_call_id,created_at").eq("twilio_call_sid", sid).eq("binding_id", binding.id).eq("state", "registered").maybeSingle();
    if (prior.error || !prior.data?.retell_call_id || Date.now() - Date.parse(prior.data.created_at) > 240000) throw new Error("RCV3_PHONE_RECONCILE_REQUIRED");
    return callSipXml(prior.data.retell_call_id);
  }
  try {
    const { reserve } = await import("./execution");
    await reserve({ db, user: { id: binding.owner_id } }, randomUUID(), "customer-phone");
    const response = await fetch("https://api.retellai.com/v2/register-phone-call", { method: "POST", headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000), body: JSON.stringify({ agent_id: config.agentId, agent_version: "latest_published", direction: "inbound", from_number: params.get("From") || undefined, to_number: binding.phone_e164, metadata: { rcv3_customer_call: true, room_id: binding.room_id }, agent_override: { agent: { webhook_url: `${config.origin}/api/webhooks/retell/post-call`, webhook_events: ["call_ended", "call_analyzed"] } } }) });
    if (!response.ok) throw new Error();
    const registered = z.object({ call_id: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/), agent_id: z.literal(config.agentId) }).parse(await response.json());
    const save = await db.from(calls).update({ state: "registered", retell_call_id: registered.call_id }).eq("twilio_call_sid", sid).eq("state", "registering");
    if (save.error) throw new Error();
    return callSipXml(registered.call_id);
  } catch {
    await db.from(calls).update({ state: "reconcile" }).eq("twilio_call_sid", sid);
    throw new Error("RCV3_PHONE_RECONCILE_REQUIRED");
  }
}
export async function resolveCustomerRetellCall(callId: string, agentId: string) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(callId)) return null;
  const { data, error } = await createAdminClient().from(calls).select("room_id,agent_id").eq("retell_call_id", callId).eq("state", "registered").maybeSingle();
  if (error) throw new Error("RCV3_STORAGE");
  if (!data || data.agent_id !== agentId) return null;
  return { roomId: data.room_id as string };
}
