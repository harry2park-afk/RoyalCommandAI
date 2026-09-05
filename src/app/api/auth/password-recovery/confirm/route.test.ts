import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  verifyOtp: vi.fn(),
  loggerError: vi.fn(),
  loggerWarn: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/logger", () => ({
  logger: { error: mocks.loggerError, warn: mocks.loggerWarn },
}));

import { POST } from "./route";
import {
  PASSWORD_RECOVERY_COOKIE,
  PASSWORD_RECOVERY_COOKIE_PATH,
} from "@/lib/auth/passwordRecovery";

const tokenHash = "a".repeat(64);

function confirmRequest(cookieValue: string | null = tokenHash) {
  const headers = new Headers();
  if (cookieValue !== null) {
    headers.set("cookie", `${PASSWORD_RECOVERY_COOKIE}=${cookieValue}`);
  }
  return new NextRequest(
    "https://royalcommand.ai/api/auth/password-recovery/confirm",
    { method: "POST", headers },
  );
}

describe("password recovery confirmation boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://royalcommand.ai");
    vi.stubEnv("NODE_ENV", "production");
    mocks.verifyOtp.mockResolvedValue({ data: {}, error: null });
    mocks.createClient.mockResolvedValue({ auth: { verifyOtp: mocks.verifyOtp } });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("consumes the recovery token only on explicit POST and clears the capture cookie", async () => {
    const response = await POST(confirmRequest());

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://royalcommand.ai/account/update-password",
    );
    expect(mocks.verifyOtp).toHaveBeenCalledTimes(1);
    expect(mocks.verifyOtp).toHaveBeenCalledWith({
      type: "recovery",
      token_hash: tokenHash,
    });

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${PASSWORD_RECOVERY_COOKIE}=`);
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain(`Path=${PASSWORD_RECOVERY_COOKIE_PATH}`);
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("fails closed without calling Supabase when the capture cookie is missing or malformed", async () => {
    const missing = await POST(confirmRequest(null));
    const malformed = await POST(confirmRequest("short"));

    for (const response of [missing, malformed]) {
      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(
        "https://royalcommand.ai/forgot-password?status=invalid_or_expired",
      );
    }
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("maps an expired or reused token to the same non-leaking denial path", async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: {},
      error: { status: 403, code: "otp_expired" },
    });

    const response = await POST(confirmRequest());

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://royalcommand.ai/forgot-password?status=invalid_or_expired",
    );
    expect(mocks.verifyOtp).toHaveBeenCalledTimes(1);
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  });
});
