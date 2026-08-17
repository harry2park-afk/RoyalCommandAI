import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";

const CLIENT_ID = () => process.env.GOOGLE_WORKSPACE_CLIENT_ID || "";
const CLIENT_SECRET = () => process.env.GOOGLE_WORKSPACE_CLIENT_SECRET || "";
const TOKEN_KEY = () => process.env.GOOGLE_WORKSPACE_TOKEN_KEY || "";
const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL || "https://royalcommand.ai";

export const GOOGLE_WORKSPACE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
];

export function googleWorkspaceConfigured() {
  return Boolean(CLIENT_ID() && CLIENT_SECRET());
}

export function googleRedirectUri() {
  return `${APP_URL().replace(/\/$/, "")}/api/tools/google/callback`;
}

function keyBytes() {
  const dedicated = TOKEN_KEY().trim();
  const secret = dedicated || CLIENT_SECRET().trim();
  if (!secret) throw new Error("Google Workspace encryption secret is not configured");
  return crypto.createHash("sha256").update(`royal-command:google-workspace:v1:${secret}`).digest();
}

export function encryptToken(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBytes(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptToken(value: string) {
  const packed = Buffer.from(value, "base64url");
  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(12, 28);
  const encrypted = packed.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyBytes(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

function sign(payload: string) {
  return crypto.createHmac("sha256", keyBytes()).update(payload).digest("base64url");
}

export function createOAuthState(userId: string) {
  const payload = Buffer.from(JSON.stringify({ userId, nonce: crypto.randomUUID(), ts: Date.now() }), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyOAuthState(state: string, userId: string) {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return false;
  const expected = sign(payload);
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.userId === userId && Date.now() - Number(data.ts || 0) < 10 * 60 * 1000;
  } catch {
    return false;
  }
}

export function googleAuthUrl(state: string) {
  if (!googleWorkspaceConfigured()) throw new Error("Google Workspace OAuth is not configured");
  const params = new URLSearchParams({
    client_id: CLIENT_ID(),
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: GOOGLE_WORKSPACE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCode(code: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID(),
      client_secret: CLIENT_SECRET(),
      code,
      grant_type: "authorization_code",
      redirect_uri: googleRedirectUri(),
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error_description || data?.error || `Google OAuth HTTP ${response.status}`);
  return data as { access_token: string; refresh_token?: string; scope?: string; expires_in?: number };
}

async function refreshAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID(),
      client_secret: CLIENT_SECRET(),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error_description || data?.error || `Google token refresh HTTP ${response.status}`);
  return String(data.access_token || "");
}

export async function getGoogleConnection(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("google_workspace_connections")
    .select("user_id,google_email,refresh_token_ciphertext,scopes,connected_at,updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getGoogleAccessToken(userId: string) {
  const connection = await getGoogleConnection(userId);
  if (!connection?.refresh_token_ciphertext) throw new Error("Google Workspace is not connected for this Royal Command account");
  return refreshAccessToken(decryptToken(connection.refresh_token_ciphertext));
}

export async function googleApi(userId: string, url: string, init?: RequestInit) {
  const accessToken = await getGoogleAccessToken(userId);
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, ...(init?.headers || {}) },
    cache: "no-store",
  });
  const text = await response.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { text }; }
  if (!response.ok) throw new Error(data?.error?.message || `Google API HTTP ${response.status}`);
  return data;
}
