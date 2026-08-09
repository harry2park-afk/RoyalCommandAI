import { createHmac, timingSafeEqual } from "crypto";

const STEP_UP_TTL_SECONDS = 10 * 60;

function getSecret() {
  const configured = process.env.RC_STEPUP_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return "royal-command-development-step-up-secret";
  return null;
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createStepUpToken(userId: string) {
  const secret = getSecret();
  if (!secret) return null;
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + STEP_UP_TTL_SECONDS;
  const payload = encode(JSON.stringify({ userId, issuedAt, expiresAt }));
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyStepUpToken(token: string | undefined, expectedUserId: string) {
  if (!token) return false;
  const secret = getSecret();
  if (!secret) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = sign(payload, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  try {
    const parsed = JSON.parse(decode(payload)) as {
      userId: string;
      issuedAt: number;
      expiresAt: number;
    };
    const now = Math.floor(Date.now() / 1000);
    return parsed.userId === expectedUserId && parsed.expiresAt >= now;
  } catch {
    return false;
  }
}

export const STEP_UP_COOKIE = "rc_stepup";
export const STEP_UP_TTL = STEP_UP_TTL_SECONDS;
