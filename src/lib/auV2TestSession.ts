import { createHmac, timingSafeEqual } from "node:crypto";

export const AU_V2_COOKIE = "rc_au_v2_test";
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

const PRODUCTION_RCA_HOSTS = new Set([
  "atyourcommandai.com.au",
  "www.atyourcommandai.com.au",
]);

function getSecret() {
  return (process.env.AU_V2_SESSION_SECRET || "").trim();
}

function sign(payload: string) {
  const secret = getSecret();
  if (!secret) return "";
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createAuV2SessionToken() {
  const secret = getSecret();
  if (!secret) return null;
  const payload = Buffer.from(
    JSON.stringify({ v: 1, exp: Date.now() + FOUR_HOURS_MS }),
    "utf8",
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyAuV2SessionToken(token?: string | null) {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = sign(payload);
  if (!expected) return false;
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      v?: number;
      exp?: number;
    };
    return parsed.v === 1 && typeof parsed.exp === "number" && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export function isAustraliaV2Host(request: Request) {
  const host = new URL(request.url).hostname.toLowerCase();
  if (PRODUCTION_RCA_HOSTS.has(host)) return true;
  return process.env.VERCEL_ENV !== "production";
}
