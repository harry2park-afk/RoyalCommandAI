"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Device = { id: string; device_name: string; created_at: string; last_used_at: string | null };
type Status = {
  admin: boolean;
  trusted: boolean;
  unlocked: boolean;
  currentDeviceId: string | null;
  devices: Device[];
  sessionMinutes: number;
};

function toBuffer(value: string) {
  const normal = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normal + "=".repeat((4 - (normal.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function toBase64url(value: ArrayBuffer | Uint8Array) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function api(body: Record<string, unknown>) {
  const response = await fetch("/api/layout-editor/security", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || "Security operation failed.");
  return data;
}

export default function LayoutEditorSecurityGate() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [password, setPassword] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [enrollmentCode, setEnrollmentCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/layout-editor/security", { cache: "no-store" });
    if (response.status === 401) { router.replace("/login"); return; }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || "Security status unavailable.");
    setStatus(data as Status);
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((error) => setMessage(error instanceof Error ? error.message : "Security status unavailable."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const needsEnrollmentCode = useMemo(() => Boolean(status?.devices?.length), [status]);

  async function registerDevice() {
    if (!window.PublicKeyCredential || !navigator.credentials) {
      setMessage("This browser does not support secure passkey registration.");
      return;
    }
    if (!password) { setMessage("Enter your administrator password first."); return; }
    if (!deviceName.trim()) { setMessage("Enter a device name, for example Harry Tablet or New Laptop."); return; }
    if (needsEnrollmentCode && !enrollmentCode.trim()) {
      setMessage("Enter the one-time code generated on an already trusted device.");
      return;
    }
    setBusy(true);
    setMessage("Verifying password…");
    try {
      await api({ action: "reauth", password });
      const options = await api({ action: "register-options" });
      setMessage("Use this device's fingerprint, face, Windows Hello, or screen lock now…");
      const publicKey: PublicKeyCredentialCreationOptions = {
        ...options,
        challenge: toBuffer(options.challenge),
        user: { ...options.user, id: toBuffer(options.user.id) },
      };
      const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential | null;
      if (!credential) throw new Error("Passkey registration was cancelled.");
      const response = credential.response as AuthenticatorAttestationResponse & {
        getAuthenticatorData?: () => ArrayBuffer;
        getPublicKey?: () => ArrayBuffer | null;
        getPublicKeyAlgorithm?: () => number;
        getTransports?: () => string[];
      };
      const authenticatorData = response.getAuthenticatorData?.();
      const publicKeySpki = response.getPublicKey?.();
      const algorithm = response.getPublicKeyAlgorithm?.();
      if (!authenticatorData || !publicKeySpki || typeof algorithm !== "number") {
        throw new Error("This browser cannot provide a device-bound public key. Use current Chrome/Edge on the tablet or laptop.");
      }
      await api({
        action: "register-verify",
        deviceName: deviceName.trim(),
        enrollmentCode: enrollmentCode.trim().toUpperCase(),
        credentialId: toBase64url(credential.rawId),
        clientDataJSON: toBase64url(response.clientDataJSON),
        authenticatorData: toBase64url(authenticatorData),
        publicKeySpki: toBase64url(publicKeySpki),
        algorithm,
        transports: response.getTransports?.() || [],
      });
      setPassword("");
      setEnrollmentCode("");
      setMessage("Trusted device registered and Layout Editor unlocked.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Device registration failed.");
    } finally {
      setBusy(false);
    }
  }

  async function unlock() {
    setBusy(true);
    setMessage("Waiting for biometric/passkey verification…");
    try {
      const options = await api({ action: "assert-options" });
      const publicKey: PublicKeyCredentialRequestOptions = {
        ...options,
        challenge: toBuffer(options.challenge),
        allowCredentials: options.allowCredentials.map((item: { id: string; type: "public-key"; transports?: AuthenticatorTransport[] }) => ({
          ...item,
          id: toBuffer(item.id),
        })),
      };
      const credential = await navigator.credentials.get({ publicKey }) as PublicKeyCredential | null;
      if (!credential) throw new Error("Passkey verification was cancelled.");
      const response = credential.response as AuthenticatorAssertionResponse;
      await api({
        action: "assert-verify",
        credentialId: toBase64url(credential.rawId),
        clientDataJSON: toBase64url(response.clientDataJSON),
        authenticatorData: toBase64url(response.authenticatorData),
        signature: toBase64url(response.signature),
      });
      setMessage("Verified. Layout Editor is unlocked.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  async function createEnrollmentCode() {
    setBusy(true);
    try {
      const data = await api({ action: "enrollment-code" });
      setNewCode(data.code);
      setMessage("Enter this one-time code on the replacement/new laptop. It expires in 10 minutes.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create enrollment code.");
    } finally { setBusy(false); }
  }

  async function revoke(deviceId: string) {
    setBusy(true);
    try {
      await api({ action: "revoke", deviceId });
      setMessage("Trusted device revoked.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not revoke device.");
    } finally { setBusy(false); }
  }

  async function lock() {
    setBusy(true);
    try {
      await api({ action: "lock" });
      setMessage("Layout Editor locked.");
      await load();
    } finally { setBusy(false); }
  }

  if (!status) return <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-[var(--muted)]">Checking trusted-device security…</div>;

  return (
    <div className="space-y-5">
      {!status.trusted ? (
        <section className="rounded-2xl border border-[var(--gold)]/35 bg-black/25 p-5">
          <h2 className="text-xl font-semibold text-[var(--gold-soft)]">Register this trusted device</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {status.devices.length === 0
              ? "First setup: verify your administrator password, then register this tablet or laptop with its biometric/passkey."
              : "This browser is not trusted. Use a 10-minute enrollment code created on your already trusted tablet or laptop, then verify your password and this device's passkey."}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input value={deviceName} onChange={(e) => setDeviceName(e.target.value)} className="rc-input" placeholder="Device name — e.g. Harry Tablet" autoComplete="off" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="rc-input" placeholder="Administrator password" autoComplete="current-password" />
            {status.devices.length > 0 ? <input value={enrollmentCode} onChange={(e) => setEnrollmentCode(e.target.value.toUpperCase())} className="rc-input uppercase" placeholder="One-time enrollment code" autoComplete="off" /> : null}
          </div>
          <button type="button" onClick={() => void registerDevice()} disabled={busy} className="rc-btn rc-btn-primary mt-4 text-sm disabled:opacity-50">Verify & Register This Device</button>
        </section>
      ) : !status.unlocked ? (
        <section className="rounded-2xl border border-[var(--gold)]/35 bg-black/25 p-5">
          <h2 className="text-xl font-semibold text-[var(--gold-soft)]">Trusted device verified</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Use this device&apos;s fingerprint, face, Windows Hello, or device PIN to unlock Layout Editor.</p>
          <button type="button" onClick={() => void unlock()} disabled={busy} className="rc-btn rc-btn-primary mt-4 text-sm disabled:opacity-50">Unlock with Passkey / Biometrics</button>
        </section>
      ) : (
        <section className="rounded-2xl border border-emerald-400/35 bg-emerald-500/[0.05] p-5">
          <h2 className="text-xl font-semibold text-emerald-200">Layout Editor unlocked</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">This trusted device is authorized for {status.sessionMinutes} minutes. Finish & Lock should be used when editing is complete.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/rooms/rca?layoutEdit=1" className="rc-btn rc-btn-primary text-sm">Open RCA Layout Editor</Link>
            <button type="button" onClick={() => void createEnrollmentCode()} disabled={busy} className="rc-btn rc-btn-ghost text-sm">Add / Replace Laptop</button>
            <button type="button" onClick={() => void lock()} disabled={busy} className="rc-btn rc-btn-ghost text-sm">Lock Now</button>
          </div>
          {newCode ? <div className="mt-4 rounded-xl border border-[var(--gold)]/40 bg-black/30 p-4"><div className="text-xs text-[var(--muted)]">10-minute enrollment code</div><div className="mt-1 font-mono text-3xl tracking-[0.25em] text-[var(--gold-soft)]">{newCode}</div></div> : null}
        </section>
      )}

      <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-lg font-semibold">Trusted devices</h2>
        <div className="mt-3 space-y-2">
          {status.devices.length ? status.devices.map((device) => (
            <div key={device.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-3">
              <div>
                <div className="text-sm font-medium">{device.device_name}{device.id === status.currentDeviceId ? " · This device" : ""}</div>
                <div className="text-[11px] text-[var(--muted)]">Registered {new Date(device.created_at).toLocaleString()}</div>
              </div>
              {status.unlocked ? <button type="button" onClick={() => void revoke(device.id)} disabled={busy} className="rounded-lg border border-red-400/30 px-3 py-1.5 text-xs text-red-200">Revoke</button> : null}
            </div>
          )) : <p className="text-sm text-[var(--muted)]">No trusted devices registered yet.</p>}
        </div>
      </section>

      {message ? <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75">{message}</div> : null}
    </div>
  );
}
