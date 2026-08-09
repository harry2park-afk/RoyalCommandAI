"use client";

import { FormEvent, useEffect, useState } from "react";
import { Fingerprint, ShieldCheck } from "lucide-react";

export default function StepUpPanel() {
  const [verified, setVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [passkeyCapable, setPasskeyCapable] = useState(false);

  useEffect(() => {
    setPasskeyCapable(
      typeof window !== "undefined" &&
        "PublicKeyCredential" in window &&
        Boolean(navigator.credentials),
    );
    fetch("/api/auth/step-up")
      .then((res) => (res.ok ? res.json() : { verified: false }))
      .then((data) => setVerified(Boolean(data.verified)))
      .catch(() => setVerified(false));
  }, []);

  async function verify(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/step-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      setVerified(true);
      setPassword("");
      setMessage("Identity verified for sensitive actions for the next 10 minutes.");
    } catch (err) {
      setVerified(false);
      setMessage(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function clearVerification() {
    await fetch("/api/auth/step-up", { method: "DELETE" });
    setVerified(false);
    setMessage("Sensitive-action verification cleared.");
  }

  return (
    <section className="rc-card p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Step-up security</p>
          <h2 className="mt-1 text-2xl" style={{ fontFamily: "var(--font-display), serif" }}>
            Verify only when it matters
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Normal use stays simple. Fresh verification is reserved for bank connections, exports, permission changes and other high-risk actions.
          </p>
        </div>
        <div className={`rounded-xl border px-3 py-2 text-xs ${verified ? "border-[var(--gold)]/50 text-[var(--gold-soft)]" : "border-white/10 text-[var(--muted)]"}`}>
          {verified ? "Verified" : "Verification required"}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
          <div className="flex items-center gap-2"><Fingerprint size={18} className="text-[var(--gold-soft)]" /><span className="font-medium">Passkey device capability</span></div>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            {passkeyCapable
              ? "This device/browser reports WebAuthn capability. Passkey enrolment will be enabled after the production credential store and recovery policy are configured."
              : "This browser does not currently report WebAuthn capability. Password/security-key fallback remains available."}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
          <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-[var(--gold-soft)]" /><span className="font-medium">Current verification</span></div>
          {verified ? (
            <div className="mt-3">
              <p className="text-xs text-[var(--muted)]">Sensitive actions are unlocked for a short, signed session.</p>
              <button type="button" onClick={clearVerification} className="rc-btn rc-btn-ghost mt-3 text-sm">Lock sensitive actions now</button>
            </div>
          ) : (
            <form onSubmit={verify} className="mt-3 space-y-3">
              <input className="rc-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Confirm your password" required />
              <button className="rc-btn rc-btn-primary w-full text-sm" disabled={loading}>{loading ? "Verifying…" : "Verify identity"}</button>
            </form>
          )}
        </div>
      </div>

      {message ? <p className="mt-4 text-xs text-[var(--muted)]">{message}</p> : null}
    </section>
  );
}
