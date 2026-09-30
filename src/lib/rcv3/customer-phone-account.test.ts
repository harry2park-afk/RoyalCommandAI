import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const admin = vi.hoisted(() => vi.fn());
const reserve = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: admin }));
vi.mock("./execution", () => ({ reserve }));
vi.mock("./checkout-ledger", () => ({ paidRoomEntitlement: vi.fn().mockResolvedValue({ secretary: true, onboarding: { phoneRequested: true, phoneNumberId: `PN${"d".repeat(32)}`, phoneConsent: true } }) }));
import { sealCustomerCarrier, openCustomerCarrier, customerVoiceConfiguration, validTwilioSignature, callSipXml, saveCustomerPhoneAccount, validateCustomerOwnedPhone, customerInboundCall } from "./customer-phone-account";
const owner = "11111111-1111-4111-8111-111111111111", other = "22222222-2222-4222-8222-222222222222";
const credential = { accountSid: `AC${"a".repeat(32)}`, authToken: "b".repeat(32) };
beforeEach(() => { vi.stubEnv("RCV3_CREDENTIAL_ENCRYPTION_KEY", "c".repeat(64)); vi.stubEnv("RCV3_CUSTOMER_PHONE_ORIGIN", "https://rc.example"); vi.stubEnv("RCV3_CUSTOMER_RETELL_AGENT_ID", "agent_customer"); vi.stubEnv("RCV3_CUSTOMER_RETELL_API_KEY", "customer-only-key"); vi.stubEnv("RCV3_CUSTOMER_RETELL_AGENT_APPROVED", "true"); admin.mockReset(); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("customer carrier isolation", () => {
  it("encrypts only for owner and fails after tampering", () => {
    const sealed = sealCustomerCarrier(owner, credential);
    expect(sealed).not.toContain(credential.authToken); expect(openCustomerCarrier(owner, sealed)).toEqual(credential);
    expect(() => openCustomerCarrier(other, sealed)).toThrow("RCV3_PHONE_RECONNECT");
    const bytes = Buffer.from(sealed, "base64url"); bytes[30] ^= 1;
    expect(() => openCustomerCarrier(owner, bytes.toString("base64url"))).toThrow("RCV3_PHONE_RECONNECT");
  });
  it("never falls back to Harry's Retell credentials or agent", () => {
    vi.stubEnv("RCV3_CUSTOMER_RETELL_API_KEY", ""); vi.stubEnv("RETELL_API_KEY", "harry-key");
    expect(() => customerVoiceConfiguration()).toThrow("RCV3_PHONE_ROUTING_NOT_CONFIGURED");
    vi.stubEnv("RCV3_CUSTOMER_RETELL_API_KEY", "customer-only-key"); vi.stubEnv("RETELL_OWNER_REPORT_INBOUND_AGENT_ID", "agent_customer");
    expect(() => customerVoiceConfiguration()).toThrow("RCV3_PHONE_ROUTING_NOT_CONFIGURED");
  });
  it.each(["RETELL_API_KEY", "RETELL_API_KEY_PREVIEW"])("rejects reusing the actual %s secret", name => {
    vi.stubEnv(name, "customer-only-key");
    expect(() => customerVoiceConfiguration()).toThrow("RCV3_PHONE_ROUTING_NOT_CONFIGURED");
  });
  it.each(["http://rc.example", "https://rc.example/path", "https://user:secret@rc.example"])("rejects unsafe callback origin %s", origin => {
    vi.stubEnv("RCV3_CUSTOMER_PHONE_ORIGIN", origin); expect(() => customerVoiceConfiguration()).toThrow();
  });
  it("does not store or call carrier when customer supplies the owner's account", async () => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", credential.accountSid); const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    await expect(saveCustomerPhoneAccount(owner, credential)).rejects.toThrow("RCV3_PHONE_USE_OWN_ACCOUNT");
    expect(admin).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("checks number ownership against the authenticated stored account", async () => {
    const query = { eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { ciphertext: sealCustomerCarrier(owner, credential) }, error: null }) };
    admin.mockReturnValue({ from: () => ({ select: () => query }) });
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ sid: `PN${"d".repeat(32)}`, account_sid: `AC${"e".repeat(32)}`, phone_number: "+61255550123", capabilities: { voice: true } })); vi.stubGlobal("fetch", fetchMock);
    await expect(validateCustomerOwnedPhone(owner, `PN${"d".repeat(32)}`)).rejects.toThrow("RCV3_PHONE_NUMBER_UNVERIFIED");
    expect(fetchMock.mock.calls[0][1].method).toBe("GET");
  });
});
describe("signed voice callback", () => {
  const url = "https://rc.example/api/rcv3/customer-phone/inbound?binding=123";
  const params = new URLSearchParams({ To: "+61255550123", AccountSid: credential.accountSid });
  const signature = createHmac("sha1", credential.authToken).update(url + "AccountSid" + credential.accountSid + "To+61255550123").digest("base64");
  it("accepts exact URL and all signed parameters only", () => {
    expect(validTwilioSignature(url, params, signature, credential.authToken)).toBe(true);
    expect(validTwilioSignature(url + "x", params, signature, credential.authToken)).toBe(false);
    expect(validTwilioSignature(url, new URLSearchParams({ To: "+61255550124", AccountSid: credential.accountSid }), signature, credential.authToken)).toBe(false);
    expect(validTwilioSignature(url, params, signature, "wrong-token")).toBe(false);
  });
  it("rejects duplicate parameter ambiguity", () => {
    const duplicate = new URLSearchParams(params); duplicate.append("To", "+61255550124");
    expect(validTwilioSignature(url, duplicate, signature, credential.authToken)).toBe(false);
  });
  it("rejects SIP/XML injection", () => {
    expect(callSipXml("call_123")).toContain("sip:call_123@sip.retellai.com");
    expect(() => callSipXml("</Sip><Dial>evil")).toThrow();
  });
  it.each(["registered", "registering", "fake", "fresh"])("validates carrier evidence and idempotency for %s call", async state => {
    reserve.mockClear();
    const bindingId = "33333333-3333-4333-8333-333333333333", roomId = "44444444-4444-4444-8444-444444444444";
    const webhook = `https://rc.example/api/rcv3/customer-phone/inbound?binding=${bindingId}`;
    const incoming = new URLSearchParams({ AccountSid: credential.accountSid, To: "+61255550123", From: "+61400000123", CallSid: `CA${"e".repeat(32)}` });
    const sig = createHmac("sha1", credential.authToken).update(webhook + Array.from(incoming.keys()).sort().map(k => k + incoming.get(k)).join("")).digest("base64");
    const insert = vi.fn().mockResolvedValue({ error: state === "fresh" ? null : { code: "23505" } });
    admin.mockReturnValue({ from: (table: string) => {
      const data = table === "rcv3_customer_phone_bindings" ? { id: bindingId, owner_id: owner, room_id: roomId, account_sid: credential.accountSid, phone_e164: "+61255550123", number_sid: `PN${"d".repeat(32)}`, agent_id: "agent_customer", ciphertext: sealCustomerCarrier(owner, credential), webhook_url: webhook } : table === "rooms" ? { id: roomId } : state === "registered" ? { retell_call_id: "call_existing", created_at: new Date().toISOString() } : null;
      const query = { eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data, error: null }) };
      return { select: () => query, insert, update: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }) };
    } });
    const request = vi.fn().mockImplementation(async (url: string) => String(url).includes("api.twilio.com") ? Response.json({sid: incoming.get("CallSid"), account_sid: credential.accountSid, to: incoming.get("To"), from: incoming.get("From"), direction:"inbound", status: state === "fake" ? "completed" : "ringing"}) : Response.json({ call_id: "call_fresh", agent_id: "agent_customer" })); vi.stubGlobal("fetch", request);
    if (state === "registered") await expect(customerInboundCall(bindingId, incoming, sig)).resolves.toContain("sip:call_existing@");
    else if (state === "fresh") await expect(customerInboundCall(bindingId, incoming, sig)).resolves.toContain("sip:call_fresh@");
    else if (state === "fake") await expect(customerInboundCall(bindingId, incoming, sig)).rejects.toThrow("RCV3_PHONE_CALL_UNVERIFIED");
    else await expect(customerInboundCall(bindingId, incoming, sig)).rejects.toThrow("RCV3_PHONE_RECONCILE_REQUIRED");
    expect(request).toHaveBeenCalledTimes(state === "fresh" ? 2 : 1); expect(String(request.mock.calls[0][0])).toContain("api.twilio.com");
    expect(reserve).toHaveBeenCalledTimes(state === "fresh" ? 1 : 0);
    if (state === "fake") expect(insert).not.toHaveBeenCalled();
  });
});
