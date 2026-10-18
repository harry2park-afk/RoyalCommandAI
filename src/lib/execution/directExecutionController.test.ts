import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const currentUser = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ getCurrentUser: currentUser }));

// Exercise the real route -> shared guard -> provider boundary. Only the
// identity lookup and network transport are replaced; no paid calls are made.
import { POST as twilio } from "@/app/api/v1/twilio/call/route";
import { POST as retell } from "@/app/api/v1/retell/session/route";

const owner = { id: "verified-owner", email: "harry2park@gmail.com", fullName: "Harry", mode: "supabase" };
const routes = [
  { name: "Twilio", handler: twilio, body: { to: "+61255550100" } },
  { name: "Retell", handler: retell, body: { agentId: "agent_fixture" } },
];

beforeEach(() => {
  currentUser.mockReset();
  currentUser.mockResolvedValue(owner);
  vi.stubEnv("TWILIO_ACCOUNT_SID", "ACfixture");
  vi.stubEnv("TWILIO_AUTH_TOKEN", "fixture-token");
  vi.stubEnv("TWILIO_FROM_NUMBER", "+61255550101");
  vi.stubEnv("RETELL_API_KEY", "fixture-key");
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

function request(body: unknown) {
  return new NextRequest("https://rc.example.test/api/voice", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

describe.each(routes)("$name legacy platform voice authority", ({ handler, body }) => {
  it.each([
    { user: null, status: 401, code: "AUTH_REQUIRED" },
    { user: { ...owner, id: "customer", email: "customer@example.test" }, status: 403, code: "RC_OWNER_REQUIRED" },
    { user: { ...owner, mode: "local" }, status: 403, code: "RC_OWNER_REQUIRED" },
    { user: { ...owner, id: "customer", email: "customer@example.test", role: "admin", user_metadata: { email: owner.email, role: "admin" } }, status: 403, code: "RC_OWNER_REQUIRED" },
  ])("blocks $code before reaching the provider ($user)", async ({ user, status, code }) => {
    currentUser.mockResolvedValue(user);
    const response = await handler(request({ ...body, ownerId: owner.id, approved: true, role: "admin" }));
    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ ok: false, code });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not execute if authentication verification fails", async () => {
    currentUser.mockRejectedValue(new Error("Authentication unavailable"));
    expect((await handler(request(body))).ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});

it("preserves the verified RC owner's Twilio request and response", async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({ sid: "CAfixture", status: "queued", to: "+61255550100", from: "+61255550101" }));
  const response = await twilio(request({ to: "+61255550100", twiml: "<Response><Say>Fixture</Say></Response>" }));
  expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({ ok: true, operation: "twilio.create_call", data: { sid: "CAfixture", status: "queued" } });
  expect(fetch).toHaveBeenCalledOnce();
  const [url, init] = vi.mocked(fetch).mock.calls[0];
  expect(url).toBe("https://api.twilio.com/2010-04-01/Accounts/ACfixture/Calls.json");
  expect(new URLSearchParams(init?.body as string).get("From")).toBe("+61255550101");
});

it("preserves the verified owner's Retell session and overrides forged actor metadata", async () => {
  currentUser.mockResolvedValue({ ...owner, email: "harry@royalcommand.ai" });
  vi.mocked(fetch).mockResolvedValue(Response.json({ call_id: "call_fixture", access_token: "fixture-access", agent_id: "agent_fixture" }));
  const response = await retell(request({ agentId: "agent_fixture", metadata: { source: "voice-test", royal_command_user_id: "forged", royal_command_request_id: "forged" }, dynamicVariables: { language: "ko" } }));
  expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({ ok: true, operation: "retell.create_web_call", data: { callId: "call_fixture", accessToken: "fixture-access" } });
  expect(fetch).toHaveBeenCalledOnce();
  const payload = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
  expect(payload.metadata).toMatchObject({ source: "voice-test", royal_command_user_id: owner.id });
  expect(payload.metadata.royal_command_request_id).not.toBe("forged");
  expect(payload.retell_llm_dynamic_variables).toEqual({ language: "ko" });
});
