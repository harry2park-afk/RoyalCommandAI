"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.push(params.get("next") || "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8 text-sm text-[var(--muted)]">← RoyalCommand.ai</Link>
      <div className="rc-card p-8">
        <h1 className="text-3xl" style={{ fontFamily: "var(--font-display), serif" }}>Sign in</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Use your Royal Command account credentials.</p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <input className="rc-input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
          <input className="rc-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          <button className="rc-btn rc-btn-primary w-full" disabled={loading}>{loading ? "Signing in…" : "Enter Royal Command"}</button>
        </form>
        <p className="mt-6 text-sm text-[var(--muted)]">New here? <Link href="/signup" className="text-[var(--gold-soft)]">Create account</Link></p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="p-8 text-[var(--muted)]">Loading…</main>}>
      <LoginForm />
    </Suspense>
  );
}
