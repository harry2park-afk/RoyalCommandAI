"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PASSWORD_RECOVERY_MESSAGE } from "@/lib/auth/passwordRecovery";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const invalidOrExpired = searchParams.get("status") === "invalid_or_expired";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/auth/password-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Password recovery is temporarily unavailable.");
      }

      setMessage(data.message || PASSWORD_RECOVERY_MESSAGE);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Password recovery is temporarily unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <Link href="/login" className="mb-8 text-sm text-[var(--muted)]">
        ← Back to secure sign in
      </Link>
      <div className="rc-card p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">
          Account recovery
        </p>
        <h1
          className="mt-2 text-3xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Reset your password
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Enter your account email. For privacy, Royal Command does not reveal whether an account exists for an address.
        </p>

        {invalidOrExpired ? (
          <p className="mt-5 rounded-2xl border border-[var(--danger)]/30 p-4 text-sm text-[var(--danger)]">
            That recovery link is invalid or expired. Request a new reset email below.
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            className="rc-input min-h-12 text-base"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            required
          />
          <button
            className="rc-btn rc-btn-primary min-h-12 w-full text-base"
            disabled={loading}
          >
            {loading ? "Sending…" : "Send reset instructions"}
          </button>
        </form>

        {message ? (
          <p className="mt-5 rounded-2xl border border-white/10 p-4 text-sm leading-6 text-[var(--muted)]">
            {message}
          </p>
        ) : null}
        {error ? <p className="mt-5 text-sm text-[var(--danger)]">{error}</p> : null}
      </div>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<main className="p-8 text-[var(--muted)]">Loading…</main>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
