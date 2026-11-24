import { afterEach, describe, expect, it } from "vitest";
import { signIndependentReceipt, verifyIndependentReceipt, verifyIndependentReceiptForIntegration } from "./independentReceipt";

const receipt = { requestId: "request-1", provider: "openai" as const, terminal: true as const, completedAt: "2026-09-06T00:00:00.000Z" };
const previous = process.env.RCA_RECEIPT_SECRET;
const previousSessionSecret = process.env.AU_V2_SESSION_SECRET;
const previousOpenAiKey = process.env.OPENAI_API_KEY;
const previousVercelEnv = process.env.VERCEL_ENV;

afterEach(() => {
  process.env.RCA_RECEIPT_SECRET = previous;
  process.env.AU_V2_SESSION_SECRET = previousSessionSecret;
  process.env.OPENAI_API_KEY = previousOpenAiKey;
  process.env.VERCEL_ENV = previousVercelEnv;
});

describe("independent provider receipts", () => {
  it("binds a signed receipt to the authenticated user and payload", () => {
    process.env.RCA_RECEIPT_SECRET = "test-only-receipt-secret";
    const signature = signIndependentReceipt("user-a", receipt);
    expect(signature).toBeTruthy();
    expect(verifyIndependentReceipt("user-a", receipt, signature)).toBe(true);
    expect(verifyIndependentReceipt("user-b", receipt, signature)).toBe(false);
    expect(verifyIndependentReceipt("user-a", { ...receipt, requestId: "request-2" }, signature)).toBe(false);
  });

  it("uses the configured provider key when a dedicated preview receipt secret is absent", () => {
    delete process.env.RCA_RECEIPT_SECRET;
    delete process.env.AU_V2_SESSION_SECRET;
    process.env.OPENAI_API_KEY = "test-only-provider-key";
    const signature = signIndependentReceipt("user-a", receipt);
    expect(signature).toBeTruthy();
    expect(verifyIndependentReceipt("user-a", receipt, signature)).toBe(true);
  });

  it("accepts only legacy unsigned receipts in Preview and keeps Production strict", () => {
    process.env.VERCEL_ENV = "preview";
    expect(verifyIndependentReceiptForIntegration("user-a", receipt, null)).toBe(true);
    process.env.VERCEL_ENV = "production";
    expect(verifyIndependentReceiptForIntegration("user-a", receipt, null)).toBe(false);
  });
});
