import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  loggerError: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: mocks.loggerError },
}));

import { GET } from "./route";
import {
  PASSWORD_RECOVERY_COOKIE,
  PASSWORD_RECOVERY_COOKIE_PATH,
} from "@/lib/auth/passwordRecovery";

const tokenHash = "a".repeat(64);

function recoveryRequest(query: string) {
  return new NextRequest(`https://royalcommand.ai/auth/recovery/confirm?${query}`);
}

describe("password recovery callback capture", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("captures a valid recovery token into a narrow HttpOnly cookie without consuming it", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://royalcommand.ai");
    vi.stubEnv("NODE_ENV", "production");

    const response = await GET(
      recoveryRequest(`token_hash=${tokenHash}&type=recovery`),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://royalcommand.ai/auth/recovery/continue",
    );
    expect(response.headers.get("location")).not.toContain(tokenHash);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${PASSWORD_RECOVERY_COOKIE}=${tokenHash}`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain(`Path=${PASSWORD_RECOVERY_COOKIE_PATH}`);
  });

  it("rejects a wrong token type without storing a recovery cookie", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://royalcommand.ai");
    vi.stubEnv("NODE_ENV", "production");

    const response = await GET(
      recoveryRequest(`token_hash=${tokenHash}&type=signup`),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://royalcommand.ai/forgot-password?status=invalid_or_expired",
    );
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("fails closed before capture when the production app origin is insecure", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://royalcommand.ai");
    vi.stubEnv("NODE_ENV", "production");

    const response = await GET(
      recoveryRequest(`token_hash=${tokenHash}&type=recovery`),
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
