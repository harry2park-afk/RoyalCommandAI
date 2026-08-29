"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { GLOBAL_ROOM_PRESETS } from "@/lib/rooms/global";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!countryCode) return;
    setLoading(true);
    setError("");
    try {
      const defaultLanguage = (navigator.language || "en").split("-")[0].slice(0, 12);
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password, defaultLanguage, countryCode }),
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
          Create your account
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Just four simple details. Royal Command will use your device language automatically.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <input
            className="rc-input min-h-12 text-base"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
            required
          />
          <input
            className="rc-input min-h-12 text-base"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />
          <input
            className="rc-input min-h-12 text-base"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (minimum 8 characters)"
            minLength={8}
            required
          />
          <select
            className="rc-input min-h-12 text-base"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            required
          >
            <option value="">Your country</option>
            {GLOBAL_ROOM_PRESETS.filter((preset) => preset.id !== "GLOBAL").map((preset) => (
              <option key={preset.id} value={preset.id}>{preset.label}</option>
            ))}
          </select>
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          <button className="rc-btn rc-btn-primary min-h-12 w-full text-base" disabled={loading || !countryCode}>
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}
