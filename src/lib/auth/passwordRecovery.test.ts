import { describe, expect, it } from "vitest";
import {
  buildPasswordRecoveryCallbackUrl,
  isValidPasswordRecoveryTokenHash,
  resolvePasswordRecoveryBaseUrl,
} from "@/lib/auth/passwordRecovery";

describe("password recovery URL safety", () => {
  it("accepts an HTTPS production origin and strips path/query fragments", () => {
    expect(
      resolvePasswordRecoveryBaseUrl(
        "https://royalcommand.ai/some/path?x=1#fragment",
        "production",
      ),
    ).toBe("https://royalcommand.ai");
  });

  it("fails closed for insecure production HTTP", () => {
    expect(
      resolvePasswordRecoveryBaseUrl("http://royalcommand.ai", "production"),
    ).toBeNull();
  });

  it("fails closed for localhost in production", () => {
    expect(
      resolvePasswordRecoveryBaseUrl("https://localhost:3000", "production"),
    ).toBeNull();
  });

  it("fails closed for URLs containing userinfo", () => {
    expect(
      resolvePasswordRecoveryBaseUrl(
        "https://user:secret@royalcommand.ai",
        "production",
      ),
    ).toBeNull();
  });

  it("allows localhost for development", () => {
    expect(
      resolvePasswordRecoveryBaseUrl("http://localhost:3000", "development"),
    ).toBe("http://localhost:3000");
  });

  it("builds only the dedicated recovery callback", () => {
    expect(
      buildPasswordRecoveryCallbackUrl(
        "https://royalcommand.ai",
        "production",
      ),
    ).toBe("https://royalcommand.ai/auth/recovery/confirm");
  });
});

describe("password recovery token capture safety", () => {
  it("accepts bounded URL-safe token hashes", () => {
    expect(isValidPasswordRecoveryTokenHash("a".repeat(64))).toBe(true);
    expect(isValidPasswordRecoveryTokenHash(`${"A".repeat(24)}_-`)).toBe(true);
  });

  it("rejects missing, short, oversized, or non URL-safe token hashes", () => {
    expect(isValidPasswordRecoveryTokenHash(null)).toBe(false);
    expect(isValidPasswordRecoveryTokenHash("short")).toBe(false);
    expect(isValidPasswordRecoveryTokenHash("a".repeat(513))).toBe(false);
    expect(isValidPasswordRecoveryTokenHash("a".repeat(32) + "?x=1")).toBe(false);
  });
});
