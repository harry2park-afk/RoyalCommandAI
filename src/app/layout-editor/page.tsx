"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LayoutEditorSecurityGate from "@/components/LayoutEditorSecurityGate";

export default function LayoutEditorPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("Administrator");

  useEffect(() => {
    void fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          router.replace("/login");
          return;
        }
        const data = await response.json();
        const accessResponse = await fetch("/api/layout-editor/security", { cache: "no-store" });
        if (accessResponse.status === 403) {
          router.replace("/dashboard");
          return;
        }
        if (!accessResponse.ok) throw new Error("Layout Editor security gate unavailable.");
        if (data?.user?.fullName) setName(data.user.fullName);
        setReady(true);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  if (!ready) return <main className="p-10 text-[var(--muted)]">Opening protected Layout Editor…</main>;

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 md:px-6">
      <div className="rounded-3xl border border-[var(--gold)]/35 bg-black/20 p-6 shadow-2xl md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--gold-soft)]">Royal Command · Admin Tools</p>
        <h1 className="mt-2 text-4xl" style={{ fontFamily: "var(--font-display), serif" }}>Protected UI Layout Editor</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          {name}, Layout Editor is restricted to your registered tablet and laptop. The first device registration requires your administrator password and this device's platform passkey/biometric verification. Replacement laptops require a one-time code from an already trusted device.
        </p>

        <div className="mt-7">
          <LayoutEditorSecurityGate />
        </div>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
          <h2 className="text-lg font-semibold">Layout Safety Rules</h2>
          <ul className="mt-3 space-y-2 text-sm leading-5 text-[var(--muted)]">
            <li>• Exactly one button can be edited at a time.</li>
            <li>• Save or Cancel the current button before selecting another.</li>
            <li>• The protected Room Header zone is 92px high.</li>
            <li>• Overlap or out-of-zone positions cannot be saved.</li>
            <li>• The language control keeps its dedicated owner and is not edited by v1.</li>
            <li>• Finish & Lock ends the protected editing session.</li>
          </ul>
        </section>

        <div className="mt-6 flex gap-3">
          <Link href="/dashboard" className="rc-btn rc-btn-ghost text-sm">← Dashboard</Link>
          <Link href="/rooms/rca" className="rc-btn rc-btn-ghost text-sm">Open RCA normally</Link>
        </div>
      </div>
    </main>
  );
}
