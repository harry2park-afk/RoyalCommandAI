import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  LAYOUT_EDITOR_CHALLENGE_COOKIE,
  LAYOUT_EDITOR_DEVICE_COOKIE,
  LAYOUT_EDITOR_SESSION_COOKIE,
  LAYOUT_EDITOR_SESSION_MINUTES,
  base64url,
  expectedOrigin,
  expectedRpId,
  fromBase64url,
  newChallenge,
  newOpaqueToken,
  readChallenge,
  requireLayoutAdmin,
  safeDeviceName,
  sha256Hex,
  signChallenge,
  verifyAssertionSignature,
  verifyAuthenticatorData,
  verifyClientData,
} from "@/lib/layout-editor-security";

const REAUTH_COOKIE = "rc_layout_reauth";
const COOKIE_BASE = { httpOnly: true, secure: true, sameSite: "strict" as const, path: "/" };

type DeviceRow = {
  id: string;
  user_id: string;
  credential_id: string;
  public_key_spki: string;
  algorithm: number;
  sign_count: number;
  device_name: string;
  device_cookie_hash: string;
  transports: string[] | null;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
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

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const user = await requireLayoutAdmin();
    const admin = createAdminClient();
    const { data: devices, error } = await admin
      .from("layout_editor_trusted_devices")
      .select("id,device_name,created_at,last_used_at,revoked_at")
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
      response.cookies.set(REAUTH_COOKIE, signChallenge({ challenge: newOpaqueToken(), purpose: "register", issuedAt: Date.now() }), {
        ...COOKIE_BASE,
        maxAge: 300,
      });
      await audit(user.id, "editor_reauth_success");
      return response;
    }

    if (action === "register-options") {
      const challenge = newChallenge();
      const rpId = expectedRpId(request);
      const response = NextResponse.json({
        challenge,
        rp: { id: rpId, name: "Royal Command" },
        user: { id: base64url(Buffer.from(user.id, "utf8")), name: user.email, displayName: user.email },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        timeout: 60000,
        attestation: "none",
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          residentKey: "discouraged",
          userVerification: "required",
        },
      });
      response.cookies.set(LAYOUT_EDITOR_CHALLENGE_COOKIE, signChallenge({ challenge, purpose: "register", issuedAt: Date.now() }), {
        ...COOKIE_BASE,
        maxAge: 300,
      });
      return response;
    }

    if (action === "register-verify") {
      const cookieStore = await cookies();
      const reauth = readChallenge(cookieStore.get(REAUTH_COOKIE)?.value, "register");
      if (!reauth) return jsonError("Re-enter your administrator password before registering a device.", 401);
      const challenge = readChallenge(cookieStore.get(LAYOUT_EDITOR_CHALLENGE_COOKIE)?.value, "register");
      if (!challenge) return jsonError("Registration challenge expired. Start again.", 400);

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

      const credentialId = typeof body.credentialId === "string" ? body.credentialId : "";
      const clientDataJSON = typeof body.clientDataJSON === "string" ? body.clientDataJSON : "";
      const authenticatorData = typeof body.authenticatorData === "string" ? body.authenticatorData : "";
      const publicKeySpki = typeof body.publicKeySpki === "string" ? body.publicKeySpki : "";
      const algorithm = typeof body.algorithm === "number" ? body.algorithm : 0;
      if (!credentialId || !clientDataJSON || !authenticatorData || !publicKeySpki || ![-7, -257].includes(algorithm)) {
        return jsonError("This browser did not provide a supported device-bound passkey.", 400);
      }
      verifyClientData(clientDataJSON, challenge, expectedOrigin(request), "webauthn.create");
      verifyAuthenticatorData(authenticatorData, expectedRpId(request));

      const deviceToken = newOpaqueToken();
      const deviceName = safeDeviceName(body.deviceName);
      const transports = Array.isArray(body.transports)
        ? body.transports.filter((value): value is string => typeof value === "string").slice(0, 8)
        : [];
      const { data: device, error } = await admin
        .from("layout_editor_trusted_devices")
        .insert({
          user_id: user.id,
          credential_id: credentialId,
          public_key_spki: publicKeySpki,
          algorithm,
          sign_count: 0,
          device_name: deviceName,
          device_cookie_hash: sha256Hex(deviceToken),
          transports,
          user_agent: request.headers.get("user-agent")?.slice(0, 500) || null,
        })
        .select("id")
        .single();
      if (error || !device) return jsonError("Could not register this trusted device.", 409);
      if (enrollmentCodeHash) {
        await admin.from("layout_editor_enrollment_codes").update({ used_at: new Date().toISOString() }).eq("code_hash", enrollmentCodeHash);
      }
      const sessionToken = newOpaqueToken();
      const expires = new Date(Date.now() + LAYOUT_EDITOR_SESSION_MINUTES * 60_000).toISOString();
      await admin.from("layout_editor_sessions").insert({
        token_hash: sha256Hex(sessionToken), user_id: user.id, device_id: device.id, expires_at: expires,
      });
      await audit(user.id, "trusted_device_registered", device.id, { deviceName });
      const response = NextResponse.json({ ok: true, deviceId: device.id });
      response.cookies.set(LAYOUT_EDITOR_DEVICE_COOKIE, deviceToken, { ...COOKIE_BASE, maxAge: 60 * 60 * 24 * 365 });
      response.cookies.set(LAYOUT_EDITOR_SESSION_COOKIE, sessionToken, { ...COOKIE_BASE, maxAge: LAYOUT_EDITOR_SESSION_MINUTES * 60 });
      response.cookies.set(REAUTH_COOKIE, "", { ...COOKIE_BASE, maxAge: 0 });
      response.cookies.set(LAYOUT_EDITOR_CHALLENGE_COOKIE, "", { ...COOKIE_BASE, maxAge: 0 });
      return response;
    }

    if (action === "assert-options") {
      const device = await currentDevice(user.id);
      if (!device) return jsonError("This browser is not a trusted Layout Editor device.", 403);
      const challenge = newChallenge();
      const response = NextResponse.json({
        challenge,
        rpId: expectedRpId(request),
        timeout: 60000,
        userVerification: "required",
        allowCredentials: [{ type: "public-key", id: device.credential_id, transports: device.transports || [] }],
      });
      response.cookies.set(LAYOUT_EDITOR_CHALLENGE_COOKIE, signChallenge({ challenge, purpose: "assert", issuedAt: Date.now() }), {
        ...COOKIE_BASE,
        maxAge: 300,
      });
      return response;
    }

    if (action === "assert-verify") {
      const cookieStore = await cookies();
      const challenge = readChallenge(cookieStore.get(LAYOUT_EDITOR_CHALLENGE_COOKIE)?.value, "assert");
      if (!challenge) return jsonError("Verification challenge expired. Try again.", 400);
      const device = await currentDevice(user.id);
      if (!device) return jsonError("This browser is not trusted.", 403);
      const credentialId = typeof body.credentialId === "string" ? body.credentialId : "";
      if (credentialId !== device.credential_id) return jsonError("This passkey does not belong to the registered device.", 403);
      const clientDataJSON = typeof body.clientDataJSON === "string" ? body.clientDataJSON : "";
      const authenticatorData = typeof body.authenticatorData === "string" ? body.authenticatorData : "";
      const signature = typeof body.signature === "string" ? body.signature : "";
      const clientRaw = verifyClientData(clientDataJSON, challenge, expectedOrigin(request), "webauthn.get");
      const auth = verifyAuthenticatorData(authenticatorData, expectedRpId(request));
      const valid = verifyAssertionSignature({
        publicKeySpki: device.public_key_spki,
        algorithm: device.algorithm,
        authenticatorData: auth.raw,
        clientDataRaw: clientRaw,
        signature,
      });
      if (!valid) {
        await audit(user.id, "editor_passkey_failed", device.id);
        return jsonError("Biometric/passkey verification failed.", 401);
      }
      if (device.sign_count > 0 && auth.signCount > 0 && auth.signCount <= device.sign_count) {
        await audit(user.id, "editor_counter_replay_blocked", device.id);
        return jsonError("Authenticator replay protection blocked this request.", 401);
      }
      const sessionToken = newOpaqueToken();
      const expiresAt = new Date(Date.now() + LAYOUT_EDITOR_SESSION_MINUTES * 60_000).toISOString();
      await admin.from("layout_editor_sessions").delete().eq("user_id", user.id).eq("device_id", device.id);
      await admin.from("layout_editor_sessions").insert({
        token_hash: sha256Hex(sessionToken), user_id: user.id, device_id: device.id, expires_at: expiresAt,
      });
      await admin.from("layout_editor_trusted_devices").update({
        sign_count: Math.max(device.sign_count || 0, auth.signCount), last_used_at: new Date().toISOString(),
      }).eq("id", device.id);
      await audit(user.id, "editor_unlocked", device.id);
      const response = NextResponse.json({ ok: true });
      response.cookies.set(LAYOUT_EDITOR_SESSION_COOKIE, sessionToken, { ...COOKIE_BASE, maxAge: LAYOUT_EDITOR_SESSION_MINUTES * 60 });
      response.cookies.set(LAYOUT_EDITOR_CHALLENGE_COOKIE, "", { ...COOKIE_BASE, maxAge: 0 });
      return response;
    }

    if (action === "enrollment-code") {
      const device = await currentDevice(user.id);
      const session = await activeEditorSession(user.id, device);
      if (!device || !session) return jsonError("Unlock Layout Editor on a trusted device first.", 403);
      const code = `${newOpaqueToken(5).replace(/[-_]/g, "").slice(0, 8)}`.toUpperCase();
      const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
      await admin.from("layout_editor_enrollment_codes").insert({ code_hash: sha256Hex(code), created_by: user.id, expires_at: expiresAt });
      await audit(user.id, "enrollment_code_created", device.id);
      return NextResponse.json({ code, expiresAt });
    }

    if (action === "revoke") {
      const device = await currentDevice(user.id);
      const session = await activeEditorSession(user.id, device);
      if (!device || !session) return jsonError("Unlock Layout Editor first.", 403);
      const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";
      if (!deviceId) return jsonError("Device id is required.", 400);
      const { data: target } = await admin.from("layout_editor_trusted_devices").select("id,device_name").eq("id", deviceId).eq("user_id", user.id).is("revoked_at", null).maybeSingle();
      if (!target) return jsonError("Trusted device not found.", 404);
      await admin.from("layout_editor_trusted_devices").update({ revoked_at: new Date().toISOString() }).eq("id", deviceId);
      await admin.from("layout_editor_sessions").delete().eq("device_id", deviceId);
      await audit(user.id, "trusted_device_revoked", device.id, { revokedDeviceId: deviceId, revokedDeviceName: target.device_name });
      const response = NextResponse.json({ ok: true });
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
    if (code === "UNSUPPORTED_ORIGIN") return jsonError("Layout Editor passkeys are restricted to royalcommand.ai.", 403);
    console.error("Layout Editor security error", error);
    return jsonError("Layout Editor security operation failed closed.", 500);
  }
}
