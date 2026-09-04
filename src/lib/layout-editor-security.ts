import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export const LAYOUT_EDITOR_SESSION_MINUTES = 20;
export const LAYOUT_EDITOR_REAUTH_SECONDS = 300;
export const LAYOUT_EDITOR_DEVICE_COOKIE = "rc_layout_device";
export const LAYOUT_EDITOR_SESSION_COOKIE = "rc_layout_session";
export const LAYOUT_EDITOR_REAUTH_COOKIE = "rc_layout_reauth";

export type LayoutAdmin = Awaited<ReturnType<typeof getCurrentUser>> & { id: string; email: string };

export function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function signingKey() {
  const seed = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!seed) throw new Error("Server security key is not configured.");
  return createHmac("sha256", seed).update("royal-command/layout-editor/security-gate/v1").digest();
}

export function signReauthProof(userId: string) {
  const body = Buffer.from(JSON.stringify({ userId, issuedAt: Date.now() })).toString("base64url");
  const signature = createHmac("sha256", signingKey()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function readReauthProof(value: string | undefined, userId: string) {
  if (!value) return false;
  const [body, signature] = value.split(".");
  if (!body || !signature) return false;
  const expected = createHmac("sha256", signingKey()).update(body).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { userId?: string; issuedAt?: number };
    return parsed.userId === userId
      && typeof parsed.issuedAt === "number"
      && Date.now() - parsed.issuedAt <= LAYOUT_EDITOR_REAUTH_SECONDS * 1000;
  } catch {
    return false;
  }
}

export function newOpaqueToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export async function requireLayoutAdmin(): Promise<LayoutAdmin> {
  const user = await getCurrentUser();
  if (!user?.id || !user.email) throw new Error("UNAUTHENTICATED");

  // Authorize against the same authenticated Supabase session that identified
  // the user. profiles_select_own permits this user to read only their own
  // profile, avoiding a separate service-role lookup for the admin decision.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || data?.role !== "admin") throw new Error("FORBIDDEN");
  return user as LayoutAdmin;
}

export function safeDeviceName(value: unknown) {
  if (typeof value !== "string") return "Trusted device";
  const clean = value.trim().replace(/\s+/g, " ").slice(0, 80);
  return clean || "Trusted device";
}
