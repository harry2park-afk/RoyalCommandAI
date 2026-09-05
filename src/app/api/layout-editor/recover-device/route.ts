import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  LAYOUT_EDITOR_DEVICE_COOKIE,
  LAYOUT_EDITOR_REAUTH_COOKIE,
  LAYOUT_EDITOR_SESSION_COOKIE,
  LAYOUT_EDITOR_SESSION_MINUTES,
  newOpaqueToken,
  readReauthProof,
  requireLayoutAdmin,
  sha256Hex,
} from "@/lib/layout-editor-security";

const COOKIE_BASE = { httpOnly: true, secure: true, sameSite: "strict" as const, path: "/" };
const PASSKEY_RECENT_MS = 2 * 60 * 1000;

type PasskeyMeta = {
  id: string;
  last_used_at?: string | null;
  lastUsedAt?: string | null;
};

type DeviceRow = {
  id: string;
  user_id: string;
  passkey_id: string;
  device_name: string;
  user_agent: string | null;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function passkeyLastUsed(passkey: PasskeyMeta) {
  const value = passkey.last_used_at || passkey.lastUsedAt || null;
  return value ? Date.parse(value) : Number.NaN;
}

export async function POST(request: Request) {
  try {
    const user = await requireLayoutAdmin();
    const cookieStore = await cookies();
    if (!readReauthProof(cookieStore.get(LAYOUT_EDITOR_REAUTH_COOKIE)?.value, user.id)) {
      return jsonError("Re-enter your administrator password before recovering this trusted device.", 401);
    }

    const admin = createAdminClient();
    const { data: passkeyData, error: passkeyError } = await admin.auth.admin.passkey.listPasskeys({ userId: user.id });
    if (passkeyError) throw passkeyError;

    const raw = passkeyData as unknown;
    const passkeys: PasskeyMeta[] = Array.isArray(raw)
      ? raw as PasskeyMeta[]
      : raw && typeof raw === "object" && Array.isArray((raw as { passkeys?: unknown }).passkeys)
        ? (raw as { passkeys: PasskeyMeta[] }).passkeys
        : [];

    const now = Date.now();
    const recent = passkeys.filter((passkey) => {
      const lastUsed = passkeyLastUsed(passkey);
      return Number.isFinite(lastUsed) && now - lastUsed <= PASSKEY_RECENT_MS;
    });

    if (recent.length === 0) {
      return jsonError("Verify the passkey for this registered device now, then try recovery again.", 401);
    }
    if (recent.length !== 1) {
      return jsonError("More than one passkey was used recently. Wait two minutes, verify only this device passkey, then retry.", 409);
    }

    const { data: devices, error: deviceError } = await admin
      .from("layout_editor_trusted_devices")
      .select("id,user_id,passkey_id,device_name,user_agent")
      .eq("user_id", user.id)
      .eq("passkey_id", recent[0].id)
      .is("revoked_at", null);
    if (deviceError) throw deviceError;

    const matches = (devices || []) as DeviceRow[];
    if (matches.length !== 1) {
      return jsonError("Could not uniquely match this verified passkey to one trusted Layout Editor device.", 409);
    }

    const device = matches[0];
    const currentUserAgent = request.headers.get("user-agent")?.slice(0, 500) || null;
    if (!device.user_agent || !currentUserAgent || device.user_agent !== currentUserAgent) {
      await admin.from("layout_editor_audit_log").insert({
        user_id: user.id,
        device_id: device.id,
        event_type: "trusted_device_cookie_recovery_blocked",
        details: { reason: "user_agent_mismatch" },
      });
      return jsonError("This browser does not match the registered trusted device. Recovery was blocked.", 403);
    }

    const deviceToken = newOpaqueToken();
    const sessionToken = newOpaqueToken();
    const expiresAt = new Date(Date.now() + LAYOUT_EDITOR_SESSION_MINUTES * 60_000).toISOString();

    const { error: updateError } = await admin
      .from("layout_editor_trusted_devices")
      .update({ device_cookie_hash: sha256Hex(deviceToken), last_used_at: new Date().toISOString() })
      .eq("id", device.id)
      .eq("user_id", user.id)
      .is("revoked_at", null);
    if (updateError) throw updateError;

    await admin.from("layout_editor_sessions").delete().eq("user_id", user.id).eq("device_id", device.id);
    const { error: sessionError } = await admin.from("layout_editor_sessions").insert({
      token_hash: sha256Hex(sessionToken),
      user_id: user.id,
      device_id: device.id,
      expires_at: expiresAt,
    });
    if (sessionError) throw sessionError;

    await admin.from("layout_editor_audit_log").insert({
      user_id: user.id,
      device_id: device.id,
      event_type: "trusted_device_cookie_recovered",
      details: { deviceName: device.device_name, passkeyId: device.passkey_id },
    });

    const response = NextResponse.json({ ok: true, deviceId: device.id, deviceName: device.device_name });
    response.cookies.set(LAYOUT_EDITOR_DEVICE_COOKIE, deviceToken, { ...COOKIE_BASE, maxAge: 60 * 60 * 24 * 365 });
    response.cookies.set(LAYOUT_EDITOR_SESSION_COOKIE, sessionToken, { ...COOKIE_BASE, maxAge: LAYOUT_EDITOR_SESSION_MINUTES * 60 });
    response.cookies.set(LAYOUT_EDITOR_REAUTH_COOKIE, "", { ...COOKIE_BASE, maxAge: 0 });
    return response;
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "UNAUTHENTICATED") return jsonError("Sign in first.", 401);
    if (code === "FORBIDDEN") return jsonError("Administrator access required.", 403);
    console.error("Layout Editor trusted-device recovery error", error);
    return jsonError("Trusted-device recovery failed closed.", 500);
  }
}
