import { createHmac, timingSafeEqual } from "node:crypto";
import type { AIProviderId } from "@/lib/ai/types";

export type IndependentReceiptPayload = {
  requestId: string;
  provider: AIProviderId;
  terminal: true;
  completedAt: string;
};

function signingSecret() {
  return process.env.RCA_RECEIPT_SECRET || process.env.AU_V2_SESSION_SECRET || "";
}

function serialized(userId: string, receipt: IndependentReceiptPayload) {
  return [userId, receipt.requestId, receipt.provider, receipt.terminal ? "1" : "0", receipt.completedAt].join("\n");
}

export function signIndependentReceipt(userId: string, receipt: IndependentReceiptPayload) {
  const secret = signingSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(serialized(userId, receipt)).digest("base64url");
}

export function verifyIndependentReceipt(userId: string, receipt: IndependentReceiptPayload, signature: unknown) {
  if (typeof signature !== "string") return false;
  const expected = signIndependentReceipt(userId, receipt);
  if (!expected) return false;
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
