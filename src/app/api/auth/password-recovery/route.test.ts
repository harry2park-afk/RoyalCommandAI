import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  isSupabaseConfigured: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  loggerError: vi.fn(),
  loggerWarn: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/utils", () => ({ isSupabaseConfigured: mocks.isSupabaseConfigured }));
vi.mock("@/lib/logger", () => ({
  logger: { error: mocks.loggerError, warn: mocks.loggerWarn },
}));

import { POST } from "./route";
import { PASSWORD_RECOVERY_MESSAGE } from "@/lib/auth/passwordRecovery";

function request(email: string) {
  return new Request("https://royalcommand.ai/api/auth/password-recovery", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

describe("password recovery request boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://royalcommand.ai");
    vi.stubEnv("NODE_ENV", "production");
    mocks.isSupabaseConfigured.mockReturnValue(true);
    mocks.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    mocks.createClient.mockResolvedValue({
      auth: { resetPasswordForEmail: mocks.resetPasswordForEmail },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses only the dedicated recovery callback and returns a non-cacheable accepted response", async () => {
    const response = await POST(request("owner@example.test"));

    expect(response.status).toBe(202);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ message: PASSWORD_RECOVERY_MESSAGE });
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledTimes(1);
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith("owner@example.test", {
      redirectTo: "https://royalcommand.ai/auth/recovery/confirm",
    });
  });

  it("does not enumerate accounts when Supabase rejects the recovery request", async () => {
    mocks.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: { status: 400, code: "user_not_found" },
    });

    const response = await POST(request("missing@example.test"));

    expect(response.status).toBe(202);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ message: PASSWORD_RECOVERY_MESSAGE });
  });

  it("rejects malformed email input before touching Supabase", async () => {
    const response = await POST(request("not-an-email"));

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("fails closed when the production recovery origin is unsafe", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://royalcommand.ai");

    const response = await POST(request("owner@example.test"));

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
