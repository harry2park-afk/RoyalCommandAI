import { beforeEach, describe, expect, it, vi } from "vitest";

const ACTOR_ID = "11111111-1111-4111-8111-111111111111";
const TARGET_ID = "22222222-2222-4222-8222-222222222222";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  cookies: vi.fn(),
  cookieGet: vi.fn(),
  isCountryAuthorityEnabled: vi.fn(),
  isCountryAuthorityAdmin: vi.fn(),
  requestedCountryMatchesAssignment: vi.fn(),
  verifyStepUpToken: vi.fn(),
  createAdminClient: vi.fn(),
  getUserById: vi.fn(),
  updateUserById: vi.fn(),
  loggerInfo: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/lib/auth", () => ({
  FIRST_WAVE_COUNTRY_CODES: ["AU", "US", "CA", "KR", "JP", "GB"] as const,
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/security/country-authority", () => ({
  isCountryAuthorityEnabled: mocks.isCountryAuthorityEnabled,
  isCountryAuthorityAdmin: mocks.isCountryAuthorityAdmin,
  requestedCountryMatchesAssignment: mocks.requestedCountryMatchesAssignment,
}));
vi.mock("@/lib/security/step-up", () => ({
  STEP_UP_COOKIE: "rc_step_up",
  verifyStepUpToken: mocks.verifyStepUpToken,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));
vi.mock("@/lib/logger", () => ({
  logger: {
    info: mocks.loggerInfo,
    warn: mocks.loggerWarn,
    error: mocks.loggerError,
  },
}));

import { POST } from "./route";

function request(body: unknown) {
  return new Request("https://royalcommand.ai/api/auth/country-authority", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const actor = {
  id: ACTOR_ID,
  email: "launch-admin@example.test",
  fullName: "Launch Admin",
  defaultLanguage: "en-AU",
  countryCode: "AU",
  mode: "supabase" as const,
};

const targetUser = {
  id: TARGET_ID,
  app_metadata: { provider: "email", existing_flag: "keep" },
  user_metadata: { requested_country_code: "AU" },
};

describe("country authority route runtime gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(actor);
    mocks.isCountryAuthorityEnabled.mockReturnValue(true);
    mocks.isCountryAuthorityAdmin.mockReturnValue(true);
    mocks.cookieGet.mockReturnValue({ value: "step-up-token" });
    mocks.cookies.mockResolvedValue({ get: mocks.cookieGet });
    mocks.verifyStepUpToken.mockReturnValue(true);
    mocks.requestedCountryMatchesAssignment.mockReturnValue(true);
    mocks.getUserById.mockResolvedValue({
      data: { user: targetUser },
      error: null,
    });
    mocks.updateUserById.mockResolvedValue({ data: { user: targetUser }, error: null });
    mocks.createAdminClient.mockReturnValue({
      auth: {
        admin: {
          getUserById: mocks.getUserById,
          updateUserById: mocks.updateUserById,
        },
      },
    });
  });

  it("rejects unauthenticated callers before every authority or admin-client check", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await POST(request({ targetUserId: TARGET_ID, countryCode: "AU" }));

    expect(response.status).toBe(401);
    expect(mocks.isCountryAuthorityEnabled).not.toHaveBeenCalled();
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("fails closed while the server kill switch is disabled", async () => {
    mocks.isCountryAuthorityEnabled.mockReturnValue(false);

    const response = await POST(request({ targetUserId: TARGET_ID, countryCode: "AU" }));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "COUNTRY_AUTHORITY_DISABLED" });
    expect(mocks.isCountryAuthorityAdmin).not.toHaveBeenCalled();
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects an authenticated actor outside the server-only admin allowlist", async () => {
    mocks.isCountryAuthorityAdmin.mockReturnValue(false);

    const response = await POST(request({ targetUserId: TARGET_ID, countryCode: "AU" }));

    expect(response.status).toBe(403);
    expect(mocks.verifyStepUpToken).not.toHaveBeenCalled();
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("requires step-up verification before parsing or touching the admin client", async () => {
    mocks.verifyStepUpToken.mockReturnValue(false);

    const response = await POST(request({ targetUserId: TARGET_ID, countryCode: "AU" }));

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "STEP_UP_REQUIRED" });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects countries outside the first-wave allowlist before admin-client access", async () => {
    const response = await POST(request({ targetUserId: TARGET_ID, countryCode: "SG" }));

    expect(response.status).toBe(400);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects an assignment that does not exactly match the target signup request", async () => {
    mocks.requestedCountryMatchesAssignment.mockReturnValue(false);

    const response = await POST(request({ targetUserId: TARGET_ID, countryCode: "US" }));

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "COUNTRY_REQUEST_MISMATCH" });
    expect(mocks.updateUserById).not.toHaveBeenCalled();
  });

  it("preserves existing app metadata while writing only the trusted first-wave country", async () => {
    const response = await POST(request({ targetUserId: TARGET_ID, countryCode: "AU" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, countryCode: "AU" });
    expect(mocks.updateUserById).toHaveBeenCalledTimes(1);
    expect(mocks.updateUserById).toHaveBeenCalledWith(TARGET_ID, {
      app_metadata: {
        provider: "email",
        existing_flag: "keep",
        country_code: "AU",
      },
    });
  });

  it("does not report success when the server-side metadata write fails", async () => {
    mocks.updateUserById.mockResolvedValue({
      data: { user: null },
      error: { message: "write rejected" },
    });

    const response = await POST(request({ targetUserId: TARGET_ID, countryCode: "AU" }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Country assignment failed" });
  });
});
