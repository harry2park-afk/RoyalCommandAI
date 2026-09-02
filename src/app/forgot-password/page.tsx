"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function supabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!supabaseConfigured()) {
      setError("Account recovery is not configured yet.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/update-password`;
      await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    } catch {
      // Keep the browser response account-neutral. Delivery is verified separately by launch E2E.
    } finally {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <Link href="/login" className="mb-8 text-sm text-[var(--muted)]">← Back to secure sign in</Link>
      <div className="rc-card p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Account recovery</p>
        <h1 className="mt-2 text-3xl" style={{ fontFamily: "var(--font-display), serif" }}>Reset your password</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Enter your account email. For privacy, Royal Command does not reveal whether an email is registered.
        </p>

        {sent ? (
          <div className="mt-7" aria-live="polite">
            <p className="text-sm leading-6 text-[var(--gold-soft)]">
              If an account exists for that email and recovery delivery is available, a secure recovery link has been requested. Check your inbox and follow the link to set a new password.
            </p>
            <Link href="/login" className="rc-btn rc-btn-primary mt-6 w-full">Return to sign in</Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <input
              className="rc-input min-h-12 text-base"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              required
            />
            {error ? <p className="text-sm text-[var(--danger)]" role="alert">{error}</p> : null}
            <button className="rc-btn rc-btn-primary min-h-12 w-full" disabled={loading}>
              {loading ? "Requesting…" : "Send secure recovery link"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
