import {
  createHmac,
  createPublicKey,
  createVerify,
  randomBytes,
  timingSafeEqual,
  verify as verifyRaw,
} from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";

export const LAYOUT_EDITOR_SESSION_MINUTES = 20;
export const LAYOUT_EDITOR_CHALLENGE_SECONDS = 300;
export const LAYOUT_EDITOR_DEVICE_COOKIE = "rc_layout_device";
export const LAYOUT_EDITOR_SESSION_COOKIE = "rc_layout_session";
export const LAYOUT_EDITOR_CHALLENGE_COOKIE = "rc_layout_challenge";

export type LayoutAdmin = Awaited<ReturnType<typeof getCurrentUser>> & { id: string; email: string };

export function base64url(input: Buffer | Uint8Array) {
  return Buffer.from(input).toString("base64url");
}

export function fromBase64url(input: string) {
  return Buffer.from(input, "base64url");
}

export function sha256Hex(value: string) {
  return require("node:crypto").createHash("sha256").update(value).digest("hex") as string;
}

function signingKey() {
  const seed = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!seed) throw new Error("Server security key is not configured.");
  return createHmac("sha256", seed).update("royal-command/layout-editor/security-gate/v1").digest();
}

export function signChallenge(payload: { challenge: string; purpose: "register" | "assert"; issuedAt: number }) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", signingKey()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function readChallenge(value: string | undefined, purpose: "register" | "assert") {
  if (!value) return null;
  const [body, signature] = value.split(".");
  if (!body || !signature) return null;
  const expected = createHmac("sha256", signingKey()).update(body).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      challenge?: string;
      purpose?: string;
      issuedAt?: number;
    };
    if (!parsed.challenge || parsed.purpose !== purpose || typeof parsed.issuedAt !== "number") return null;
    if (Date.now() - parsed.issuedAt > LAYOUT_EDITOR_CHALLENGE_SECONDS * 1000) return null;
    return parsed.challenge;
  } catch {
    return null;
  }
}

export function newChallenge() {
  return base64url(randomBytes(32));
}

export function newOpaqueToken(bytes = 32) {
  return base64url(randomBytes(bytes));
}

export async function requireLayoutAdmin(): Promise<LayoutAdmin> {
  const user = await getCurrentUser();
  if (!user?.id || !user.email) throw new Error("UNAUTHENTICATED");
  const admin = createAdminClient();
  const { data, error } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (error || data?.role !== "admin") throw new Error("FORBIDDEN");
  return user as LayoutAdmin;
}

export function expectedRpId(request: Request) {
  const host = new URL(request.url).hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") return host;
  if (host !== "royalcommand.ai" && host !== "www.royalcommand.ai") throw new Error("UNSUPPORTED_ORIGIN");
  return "royalcommand.ai";
}

export function expectedOrigin(request: Request) {
  const url = new URL(request.url);
  if (url.hostname === "www.royalcommand.ai") return "https://www.royalcommand.ai";
  if (url.hostname === "royalcommand.ai") return "https://royalcommand.ai";
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return `${url.protocol}//${url.host}`;
  throw new Error("UNSUPPORTED_ORIGIN");
}

export function verifyClientData(
  clientDataJSON: string,
  expectedChallenge: string,
  origin: string,
  type: "webauthn.create" | "webauthn.get",
) {
  const raw = fromBase64url(clientDataJSON);
  const parsed = JSON.parse(raw.toString("utf8")) as { type?: string; challenge?: string; origin?: string };
  if (parsed.type !== type || parsed.challenge !== expectedChallenge || parsed.origin !== origin) {
    throw new Error("Invalid WebAuthn client data.");
  }
  return raw;
}

export function verifyAuthenticatorData(authenticatorData: string, rpId: string) {
  const raw = fromBase64url(authenticatorData);
  if (raw.length < 37) throw new Error("Invalid authenticator data.");
  const expectedRpHash = require("node:crypto").createHash("sha256").update(rpId).digest() as Buffer;
  const actualRpHash = raw.subarray(0, 32);
  if (!timingSafeEqual(expectedRpHash, actualRpHash)) throw new Error("Authenticator RP ID mismatch.");
  const flags = raw[32];
  if ((flags & 0x01) === 0 || (flags & 0x04) === 0) throw new Error("User presence and verification are required.");
  return { raw, signCount: raw.readUInt32BE(33) };
}

export function verifyAssertionSignature(args: {
  publicKeySpki: string;
  algorithm: number;
  authenticatorData: Buffer;
  clientDataRaw: Buffer;
  signature: string;
}) {
  const clientHash = require("node:crypto").createHash("sha256").update(args.clientDataRaw).digest() as Buffer;
  const signed = Buffer.concat([args.authenticatorData, clientHash]);
  const key = createPublicKey({ key: fromBase64url(args.publicKeySpki), format: "der", type: "spki" });
  const signature = fromBase64url(args.signature);
  if (args.algorithm === -8) return verifyRaw(null, signed, key, signature);
  const verifier = createVerify("SHA256");
  verifier.update(signed);
  verifier.end();
  return verifier.verify(key, signature);
}

export function safeDeviceName(value: unknown) {
  if (typeof value !== "string") return "Trusted device";
  const clean = value.trim().replace(/\s+/g, " ").slice(0, 80);
  return clean || "Trusted device";
}
