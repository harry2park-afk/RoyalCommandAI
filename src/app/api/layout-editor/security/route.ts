import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  LAYOUT_EDITOR_DEVICE_COOKIE,
  LAYOUT_EDITOR_REAUTH_COOKIE,
  LAYOUT_EDITOR_SESSION_COOKIE,
  LAYOUT_EDITOR_SESSION_MINUTES,
  newOpaqueToken,
  readReauthProof,
  requireLayoutAdmin,
  safeDeviceName,
  sha256Hex,
  signReauthProof,
} from "@/lib/layout-editor-security";

const COOKIE_BASE = { httpOnly: true, secure: true, sameSite: "strict" as const, path: "/" };
const PASSKEY_RECENT_MS = 2 * 60 * 1000;
const PASSKEY_NEW_MS = 10 * 60 * 1000;

type DeviceRow = {
  id: string;
  user_id: string;
  passkey_id: string;
  device_name: string;
  device_cookie_hash: string;
  user_agent: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

type PasskeyMeta = {
  id: string;
  friendly_name?: string | null;
  created_at?: string | null;
  last_used_at?: string | null;
  lastUsedAt?: string | null;
};

async function currentDevice(userId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(LAYOUT_EDITOR_DEVICE_COOKIE)?.value;
  if (!token) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("layout_editor_trusted_devices")
    .select("*")
    .eq("user_id", userId)
    .eq("device_cookie_hash", sha256Hex(token))
    .is("revoked_at", null)
    .maybeSingle();
  return (data as DeviceRow | null) || null;
}

async function activeEditorSession(userId: string, device: DeviceRow | null) {
  if (!device) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get(LAYOUT_EDITOR_SESSION_COOKIE)?.value;
  if (!token) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("layout_editor_sessions")
    .select("token_hash,user_id,device_id,expires_at")
    .eq("token_hash", sha256Hex(token))
    .eq("user_id", userId)
    .eq("device_id", device.id)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return data || null;
}

async function audit(userId: string, eventType: string, deviceId?: string | null, details: Record<string, unknown> = {}) {
  const admin = createAdminClient();
  await admin.from("layout_editor_audit_log").insert({
    user_id: userId,
    device_id: deviceId || null,
    event_type: eventType,
    details,
  });
}

async function listUserPasskeys(userId: string): Promise<PasskeyMeta[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.passkey.listPasskeys({ userId });
  if (error) throw error;
  const raw = data as unknown;
  if (Array.isArray(raw)) return raw as PasskeyMeta[];
  if (raw && typeof raw === "object") {
    const passkeys = (raw as { passkeys?: unknown }).passkeys;
    if (Array.isArray(passkeys)) return passkeys as PasskeyMeta[];
  }
  return [];
}

function passkeyLastUsed(passkey: PasskeyMeta) {
  const value = passkey.last_used_at || passkey.lastUsedAt || null;
  return value ? Date.parse(value) : Number.NaN;
}

function recentlyUsedPasskeys(passkeys: PasskeyMeta[]) {
  const now = Date.now();
  return passkeys
    .map((passkey) => ({ passkey, lastUsed: passkeyLastUsed(passkey) }))
    .filter((item) => Number.isFinite(item.lastUsed) && now - item.lastUsed <= PASSKEY_RECENT_MS)
    .sort((a, b) => b.lastUsed - a.lastUsed);
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function createEditorSession(userId: string, deviceId: string) {
  const admin = createAdminClient();
  const sessionToken = newOpaqueToken();
  const expiresAt = new Date(Date.now() + LAYOUT_EDITOR_SESSION_MINUTES * 60_000).toISOString();
  await admin.from("layout_editor_sessions").delete().eq("user_id", userId).eq("device_id", deviceId);
  const { error } = await admin.from("layout_editor_sessions").insert({
    token_hash: sha256Hex(sessionToken),
    user_id: userId,
    device_id: deviceId,
    expires_at: expiresAt,
  });
  if (error) throw error;
  return sessionToken;
}

async function registerTrustedDevice(
  request: Request,
  userId: string,
  passkeyId: string,
  deviceNameInput: unknown,
  enrollmentCodeHash: string | null,
  auditMode: "new-passkey" | "existing-passkey-bootstrap",
) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("layout_editor_trusted_devices")
    .select("id")
    .eq("user_id", userId)
    .eq("passkey_id", passkeyId)
    .is("revoked_at", null)
    .maybeSingle();
  if (existing) return jsonError("This passkey is already bound to a trusted Layout Editor device.", 409);

  const deviceToken = newOpaqueToken();
  const deviceName = safeDeviceName(deviceNameInput);
  const { data: device, error } = await admin
    .from("layout_editor_trusted_devices")
    .insert({
      user_id: userId,
      passkey_id: passkeyId,
      device_name: deviceName,
      device_cookie_hash: sha256Hex(deviceToken),
      user_agent: request.headers.get("user-agent")?.slice(0, 500) || null,
    })
    .select("id")
    .single();
  if (error || !device) return jsonError("Could not register this trusted device.", 409);

  if (enrollmentCodeHash) {
    await admin
      .from("layout_editor_enrollment_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("code_hash", enrollmentCodeHash);
  }

  const sessionToken = await createEditorSession(userId, device.id);
  await audit(userId, "trusted_device_registered", device.id, { deviceName, passkeyId, auditMode });
  const response = NextResponse.json({ ok: true, deviceId: device.id });
  response.cookies.set(LAYOUT_EDITOR_DEVICE_COOKIE, deviceToken, { ...COOKIE_BASE, maxAge: 60 * 60 * 24 * 365 });
  response.cookies.set(LAYOUT_EDITOR_SESSION_COOKIE, sessionToken, { ...COOKIE_BASE, maxAge: LAYOUT_EDITOR_SESSION_MINUTES * 60 });
  response.cookies.set(LAYOUT_EDITOR_REAUTH_COOKIE, "", { ...COOKIE_BASE, maxAge: 0 });
  return response;
}

export async function GET() {
  try {
    const user = await requireLayoutAdmin();
    const admin = createAdminClient();
    const { data: devices, error } = await admin
      .from("layout_editor_trusted_devices")
      .select("id,passkey_id,device_name,created_at,last_used_at,revoked_at")
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .order("created_at", { ascending: true });
    if (error) throw error;
    const device = await currentDevice(user.id);
    const session = await activeEditorSession(user.id, device);
    return NextResponse.json({
      admin: true,
      trusted: Boolean(device),
      unlocked: Boolean(session),
      currentDeviceId: device?.id || null,
      devices: devices || [],
      sessionMinutes: LAYOUT_EDITOR_SESSION_MINUTES,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "UNAUTHENTICATED") return jsonError("Sign in first.", 401);
    if (code === "FORBIDDEN") return jsonError("Administrator access required.", 403);
    return jsonError("Layout Editor security status is unavailable.", 503);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireLayoutAdmin();
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";
    const admin = createAdminClient();

    if (action === "reauth") {
      const password = typeof body.password === "string" ? body.password : "";
      if (!password) return jsonError("Password is required.", 400);
      const supabase = await createClient();
      const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
      if (error) {
        await audit(user.id, "editor_reauth_failed", null, { reason: "password_rejected" });
        return jsonError("Password verification failed.", 401);
      }
      const response = NextResponse.json({ ok: true });
      response.cookies.set(LAYOUT_EDITOR_REAUTH_COOKIE, signReauthProof(user.id), {
        ...COOKIE_BASE,
        maxAge: 300,
      });
      await audit(user.id, "editor_reauth_success");
      return response;
    }

    if (action === "bind-passkey") {
      const cookieStore = await cookies();
      if (!readReauthProof(cookieStore.get(LAYOUT_EDITOR_REAUTH_COOKIE)?.value, user.id)) {
        return jsonError("Re-enter your administrator password before registering a device.", 401);
      }

      const passkeyId = typeof body.passkeyId === "string" ? body.passkeyId : "";
      if (!passkeyId) return jsonError("A verified passkey is required.", 400);
      const passkeys = await listUserPasskeys(user.id);
      const passkey = passkeys.find((item) => item.id === passkeyId);
      if (!passkey) return jsonError("Supabase Auth did not verify this passkey for your account.", 403);
      const createdAt = passkey.created_at ? Date.parse(passkey.created_at) : Number.NaN;
      if (!Number.isFinite(createdAt) || Date.now() - createdAt > PASSKEY_NEW_MS) {
        return jsonError("Register a new passkey from this Layout Editor screen before trusting the device.", 403);
      }

      const { count } = await admin
        .from("layout_editor_trusted_devices")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("revoked_at", null);

      let enrollmentCodeHash: string | null = null;
      if ((count || 0) > 0) {
        const enrollmentCode = typeof body.enrollmentCode === "string" ? body.enrollmentCode.trim().toUpperCase() : "";
        if (!enrollmentCode) return jsonError("A one-time code from a trusted device is required.", 403);
        enrollmentCodeHash = sha256Hex(enrollmentCode);
        const { data: codeRow } = await admin
          .from("layout_editor_enrollment_codes")
          .select("code_hash")
          .eq("code_hash", enrollmentCodeHash)
          .eq("created_by", user.id)
          .is("used_at", null)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();
        if (!codeRow) return jsonError("The enrollment code is invalid or expired.", 403);
      }

      return registerTrustedDevice(request, user.id, passkeyId, body.deviceName, enrollmentCodeHash, "new-passkey");
    }

    if (action === "bind-existing-passkey") {
      const cookieStore = await cookies();
      if (!readReauthProof(cookieStore.get(LAYOUT_EDITOR_REAUTH_COOKIE)?.value, user.id)) {
        return jsonError("Re-enter your administrator password before registering a device.", 401);
      }

      const { count } = await admin
        .from("layout_editor_trusted_devices")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("revoked_at", null);
      if ((count || 0) !== 0) {
        await audit(user.id, "existing_passkey_bootstrap_blocked", null, { reason: "trusted_device_already_exists" });
        return jsonError("Existing-passkey bootstrap is allowed only for the first trusted device.", 403);
      }

      const passkeys = await listUserPasskeys(user.id);
      const recent = recentlyUsedPasskeys(passkeys);
      if (recent.length === 0) {
        await audit(user.id, "existing_passkey_bootstrap_blocked", null, { reason: "no_recent_passkey" });
        return jsonError("Verify an existing passkey on this device now, then try again.", 401);
      }
      if (recent.length !== 1) {
        await audit(user.id, "existing_passkey_bootstrap_blocked", null, {
          reason: "ambiguous_recent_passkeys",
          candidateCount: recent.length,
        });
        return jsonError("More than one passkey was used recently. Wait two minutes, verify only this device passkey, then try again.", 409);
      }

      const passkeyId = recent[0].passkey.id;
      return registerTrustedDevice(
        request,
        user.id,
        passkeyId,
        body.deviceName,
        null,
        "existing-passkey-bootstrap",
      );
    }

    if (action === "confirm-passkey") {
      const device = await currentDevice(user.id);
      if (!device) return jsonError("This browser is not a trusted Layout Editor device.", 403);
      const passkeys = await listUserPasskeys(user.id);
      const passkey = passkeys.find((item) => item.id === device.passkey_id);
      if (!passkey) {
        await audit(user.id, "editor_passkey_missing", device.id);
        return jsonError("The passkey bound to this trusted device no longer exists.", 403);
      }
      const lastUsed = passkeyLastUsed(passkey);
      if (!Number.isFinite(lastUsed) || Date.now() - lastUsed > PASSKEY_RECENT_MS) {
        await audit(user.id, "editor_passkey_not_fresh", device.id);
        return jsonError("Use the passkey bound to this device now, then try again.", 401);
      }
      const sessionToken = await createEditorSession(user.id, device.id);
      await admin.from("layout_editor_trusted_devices").update({ last_used_at: new Date().toISOString() }).eq("id", device.id);
      await audit(user.id, "editor_unlocked", device.id, { passkeyId: device.passkey_id });
      const response = NextResponse.json({ ok: true });
      response.cookies.set(LAYOUT_EDITOR_SESSION_COOKIE, sessionToken, { ...COOKIE_BASE, maxAge: LAYOUT_EDITOR_SESSION_MINUTES * 60 });
      return response;
    }

    if (action === "enrollment-code") {
      const device = await currentDevice(user.id);
      const session = await activeEditorSession(user.id, device);
      if (!device || !session) return jsonError("Unlock Layout Editor on a trusted device first.", 403);
      const code = newOpaqueToken(6).replace(/[-_]/g, "").slice(0, 8).toUpperCase();
      const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
      await admin.from("layout_editor_enrollment_codes").delete().eq("created_by", user.id).is("used_at", null);
      const { error } = await admin.from("layout_editor_enrollment_codes").insert({
        code_hash: sha256Hex(code), created_by: user.id, expires_at: expiresAt,
      });
      if (error) throw error;
      await audit(user.id, "enrollment_code_created", device.id);
      return NextResponse.json({ code, expiresAt });
    }

    if (action === "revoke") {
      const device = await currentDevice(user.id);
      const session = await activeEditorSession(user.id, device);
      if (!device || !session) return jsonError("Unlock Layout Editor first.", 403);
      const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";
      if (!deviceId) return jsonError("Device id is required.", 400);
      const { data: target } = await admin
        .from("layout_editor_trusted_devices")
        .select("id,device_name,passkey_id")
        .eq("id", deviceId)
        .eq("user_id", user.id)
        .is("revoked_at", null)
        .maybeSingle();
      if (!target) return jsonError("Trusted device not found.", 404);

      const { error: passkeyDeleteError } = await admin.auth.admin.passkey.deletePasskey({
        userId: user.id,
        passkeyId: target.passkey_id,
      });
      await admin.from("layout_editor_trusted_devices").update({ revoked_at: new Date().toISOString() }).eq("id", deviceId);
      await admin.from("layout_editor_sessions").delete().eq("device_id", deviceId);
      await audit(user.id, "trusted_device_revoked", device.id, {
        revokedDeviceId: deviceId,
        revokedDeviceName: target.device_name,
        passkeyDeleted: !passkeyDeleteError,
      });
      const response = NextResponse.json({ ok: true, passkeyDeleted: !passkeyDeleteError });
      if (deviceId === device.id) {
        response.cookies.set(LAYOUT_EDITOR_DEVICE_COOKIE, "", { ...COOKIE_BASE, maxAge: 0 });
        response.cookies.set(LAYOUT_EDITOR_SESSION_COOKIE, "", { ...COOKIE_BASE, maxAge: 0 });
      }
      return response;
    }

    if (action === "lock") {
      const device = await currentDevice(user.id);
      const cookieStore = await cookies();
      const token = cookieStore.get(LAYOUT_EDITOR_SESSION_COOKIE)?.value;
      if (token) await admin.from("layout_editor_sessions").delete().eq("token_hash", sha256Hex(token)).eq("user_id", user.id);
      await audit(user.id, "editor_locked", device?.id || null);
      const response = NextResponse.json({ ok: true });
      response.cookies.set(LAYOUT_EDITOR_SESSION_COOKIE, "", { ...COOKIE_BASE, maxAge: 0 });
      return response;
    }

    return jsonError("Unknown security action.", 400);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "UNAUTHENTICATED") return jsonError("Sign in first.", 401);
    if (code === "FORBIDDEN") return jsonError("Administrator access required.", 403);
    console.error("Layout Editor security error", error);
    return jsonError("Layout Editor security operation failed closed.", 500);
  }
}
