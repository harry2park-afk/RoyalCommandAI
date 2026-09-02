"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const response = await fetch("/api/auth/recovery-password", {
          method: "GET",
          cache: "no-store",
        });
        if (!active) return;
        setAuthorized(response.ok);
      } catch {
        if (active) setAuthorized(false);
      } finally {
        if (active) setChecking(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (password.length < 8 || password.length > 128) {
      setError("Use between 8 and 128 characters for the new password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/recovery-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { updated?: boolean; error?: string };
      if (!response.ok || !data.updated) {
        setError(data.error || "The password could not be updated. Request a new recovery link and try again.");
        if (response.status === 401) setAuthorized(false);
        return;
      }

      setComplete(true);
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("The password could not be updated. Request a new recovery link and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <Link href="/login" className="mb-8 text-sm text-[var(--muted)]">← RoyalCommand.ai secure sign in</Link>
      <div className="rc-card p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Account recovery</p>
        <h1 className="mt-2 text-3xl" style={{ fontFamily: "var(--font-display), serif" }}>Choose a new password</h1>

        {checking ? <p className="mt-5 text-sm text-[var(--muted)]">Verifying the recovery session…</p> : null}

        {!checking && !authorized && !complete ? (
          <div className="mt-5" role="alert">
            <p className="text-sm leading-6 text-[var(--danger)]">This recovery session is missing or has expired.</p>
            <Link href="/forgot-password" className="rc-btn rc-btn-primary mt-6 w-full">Request a new recovery link</Link>
          </div>
        ) : null}

        {!checking && authorized && !complete ? (
          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <input
              className="rc-input min-h-12 text-base"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="New password"
              minLength={8}
              maxLength={128}
              required
            />
            <input
              className="rc-input min-h-12 text-base"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
              minLength={8}
              maxLength={128}
              required
            />
            {error ? <p className="text-sm text-[var(--danger)]" role="alert">{error}</p> : null}
            <button className="rc-btn rc-btn-primary min-h-12 w-full" disabled={loading}>
              {loading ? "Updating…" : "Update password securely"}
            </button>
          </form>
        ) : null}

        {complete ? (
          <div className="mt-6" aria-live="polite">
            <p className="text-sm leading-6 text-[var(--gold-soft)]">Your password was updated. The recovery session has been signed out.</p>
            <Link href="/login" className="rc-btn rc-btn-primary mt-6 w-full">Sign in with the new password</Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
