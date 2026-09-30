"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LayoutEditorSecurityGate() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function unlock(event: FormEvent) {
    event.preventDefault();
    if (!password) {
      setMessage("Enter your administrator password.");
      return;
    }

    setBusy(true);
    setMessage("Checking password…");
    try {
      const response = await fetch("/api/layout-editor/password-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401 && data?.error === "Sign in first.") {
        router.replace("/login");
        return;
      }
      if (!response.ok) throw new Error(data?.error || "Password verification failed.");
      setPassword("");
      router.push("/rooms/rca?layoutEdit=1");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Password verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--gold)]/35 bg-black/25 p-5">
      <h2 className="text-xl font-semibold text-[var(--gold-soft)]">Open Layout Editor</h2>
      <form onSubmit={unlock} className="mt-4 flex max-w-xl flex-col gap-3">
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          className="rc-input"
          placeholder="Administrator password"
          autoComplete="current-password"
          autoFocus
        />
        <button type="submit" disabled={busy} className="rc-btn rc-btn-primary w-fit text-sm disabled:opacity-50">
          {busy ? "Opening…" : "Enter Layout Editor"}
        </button>
      </form>
      {message ? <div className="mt-3 text-sm text-white/75">{message}</div> : null}
    </section>
  );
}
