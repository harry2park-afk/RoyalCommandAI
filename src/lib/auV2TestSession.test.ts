import { afterEach, describe, expect, it } from "vitest";
import {
  createAuV2SessionToken,
  isAustraliaV2Host,
  verifyAuV2SessionToken,
} from "./auV2TestSession";

// Security invariant: host allowlisting never substitutes for route-level auth/tenant checks.
const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("RCA V2 session security", () => {
  it("allows only approved RCA production hosts", () => {
    process.env.VERCEL_ENV = "production";
    expect(isAustraliaV2Host(new Request("https://atyourcommandai.com.au/api/au-v2/session"))).toBe(true);
    expect(isAustraliaV2Host(new Request("https://www.atyourcommandai.com.au/api/au-v2/session"))).toBe(true);
  });

  it("rejects Royal Command production hosts for RCA session access", () => {
    process.env.VERCEL_ENV = "production";
    expect(isAustraliaV2Host(new Request("https://royalcommand.ai/api/au-v2/session"))).toBe(false);
    expect(isAustraliaV2Host(new Request("https://www.royalcommand.ai/api/au-v2/session"))).toBe(false);
  });

  it("fails closed for an unapproved production host", () => {
    process.env.VERCEL_ENV = "production";
    expect(isAustraliaV2Host(new Request("https://evil.example/api/au-v2/session"))).toBe(false);
  });

  it("allows preview hosts while retaining route-level authentication", () => {
    process.env.VERCEL_ENV = "preview";
    expect(isAustraliaV2Host(new Request("https://preview.vercel.app/api/au-v2/session"))).toBe(true);
  });

  it("requires the dedicated AU_V2_SESSION_SECRET", () => {
    delete process.env.AU_V2_SESSION_SECRET;
    process.env.OPENAI_API_KEY = "must-not-be-reused";
    process.env.ANTHROPIC_API_KEY = "must-not-be-reused";
    process.env.GOOGLE_API_KEY = "must-not-be-reused";
    process.env.XAI_API_KEY = "must-not-be-reused";
    expect(createAuV2SessionToken()).toBeNull();
  });

  it("creates and verifies a token only with the dedicated secret", () => {
    process.env.AU_V2_SESSION_SECRET = "rca-test-dedicated-secret";
    const token = createAuV2SessionToken();
    expect(token).toBeTruthy();
    expect(verifyAuV2SessionToken(token)).toBe(true);
  });

  it("rejects a token after the signing secret changes", () => {
    process.env.AU_V2_SESSION_SECRET = "first-secret";
    const token = createAuV2SessionToken();
    process.env.AU_V2_SESSION_SECRET = "second-secret";
    expect(verifyAuV2SessionToken(token)).toBe(false);
  });
});
