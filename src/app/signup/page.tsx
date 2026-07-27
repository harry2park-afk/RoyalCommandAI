"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ko", label: "한국어" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
];

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState("en");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password, defaultLanguage }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Signup failed",
        );
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8 text-sm text-[var(--muted)]">
        ← RoyalCommand.ai
      </Link>
      <div className="rc-card p-8">
        <h1 className="text-3xl" style={{ fontFamily: "var(--font-display), serif" }}>
          Create Household
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Choose your default interface language. Change it anytime inside Rooms.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <input
            className="rc-input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            required
          />
          <input
            className="rc-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />
          <input
            className="rc-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 8)"
            minLength={8}
            required
          />
          <select
            className="rc-input"
            value={defaultLanguage}
            onChange={(e) => setDefaultLanguage(e.target.value)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          <button className="rc-btn rc-btn-primary w-full" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}
