"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

async function postJson(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || "Security operation failed.");
  return data;
}

export default function LayoutEditorRecoverPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("This recovery restores only the browser trust cookie for an already-registered device.");

  async function recover() {
    if (!password) {
      setMessage("Enter your administrator password first.");
      return;
    }

    setBusy(true);
    try {
      setMessage("Verifying administrator password…");
      await postJson("/api/layout-editor/security", { action: "reauth", password });

      setMessage("Now verify the existing passkey for this registered device…");
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPasskey();
      if (error) throw new Error(error.message || "Passkey verification failed.");

      setMessage("Matching this passkey to the existing trusted device…");
      const data = await postJson("/api/layout-editor/recover-device", {});
      setPassword("");
      setMessage(`${data.deviceName || "Trusted device"} recovered. Opening Layout Editor…`);
      window.setTimeout(() => router.replace("/layout-editor"), 500);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Recovery failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-10 md:px-6">
      <section className="rounded-3xl border border-[var(--gold)]/35 bg-black/25 p-6 shadow-2xl md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--gold-soft)]">Royal Command · Admin Security</p>
        <h1 className="mt-2 text-3xl" style={{ fontFamily: "var(--font-display), serif" }}>Recover Existing Trusted Device</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Use this only when this same registered laptop or tablet has lost its browser trust cookie. It does not register a new device and does not replace your passkey.
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
          <label className="block text-sm text-[var(--muted)]">Administrator password</label>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="current-password"
            className="rc-input mt-2 w-full"
            placeholder="Administrator password"
          />
          <button
            type="button"
            onClick={() => void recover()}
            disabled={busy}
            className="rc-btn rc-btn-primary mt-4 text-sm disabled:opacity-50"
          >
            Recover This Trusted Device
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75">{message}</div>
        <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
          Recovery fails closed unless your administrator password is correct, exactly one passkey was just verified, that passkey is already bound to exactly one active trusted device, and this browser matches the originally registered browser.
        </p>
      </section>
    </main>
  );
}
