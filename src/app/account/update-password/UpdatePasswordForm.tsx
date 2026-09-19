"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError(
          "Your password was updated, but the recovery session could not be closed automatically. Please close this browser and sign in again.",
        );
        return;
      }

      router.replace("/login?status=password_updated");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password update failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <div className="rc-card p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">
          Secure recovery
        </p>
        <h1
          className="mt-2 text-3xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Choose a new password
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Your recovery link has been verified. Set a new password with at least 8 characters.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            className="rc-input min-h-12 text-base"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="New password"
            minLength={8}
            required
          />
          <input
            className="rc-input min-h-12 text-base"
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="Confirm new password"
            minLength={8}
            required
          />
          <button
            className="rc-btn rc-btn-primary min-h-12 w-full text-base"
            disabled={loading}
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>

        {error ? <p className="mt-5 text-sm leading-6 text-[var(--danger)]">{error}</p> : null}
        <p className="mt-6 text-sm text-[var(--muted)]">
          Need a new recovery link?{" "}
          <Link href="/forgot-password" className="text-[var(--gold-soft)]">
            Request another email
          </Link>
        </p>
      </div>
    </main>
  );
}
