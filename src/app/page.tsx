import Link from "next/link";
import RoyalGateBackground from "@/components/RoyalGateBackground";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05070b]">
      <RoyalGateBackground />

      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/20 via-black/5 to-black/70" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-between px-5 py-7 text-center">
        <div className="pt-2">
          <div
            className="text-2xl tracking-[0.14em] text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.95)] md:text-3xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            ROYAL COMMAND<span className="text-[var(--gold)]"> AI</span>
          </div>
        </div>

        <div className="mb-8 w-full max-w-2xl rounded-2xl border border-[#c9a84f]/45 bg-black/50 p-5 shadow-2xl backdrop-blur-sm md:p-7">
          <p className="mb-5 text-sm tracking-[0.14em] text-[#f1d889] md:text-base">
            Welcome to Royal Command
          </p>

          <div className="grid gap-3 md:grid-cols-2 md:gap-4">
            <Link
              href="/login"
              className="rounded-xl border border-[#d7b64d]/75 bg-[#0b0d12]/90 px-5 py-4 text-white transition hover:border-[#f3d36b] hover:bg-[#151923]"
            >
              <span className="block text-lg font-semibold">Existing Member</span>
              <span className="mt-1 block text-sm text-white/70">Sign in</span>
            </Link>

            <Link
              href="/signup"
              className="rounded-xl border border-[#d7b64d] bg-[#d7b64d] px-5 py-4 text-[#17120a] shadow-[0_0_24px_rgba(215,182,77,0.22)] transition hover:bg-[#ead07a]"
            >
              <span className="block text-lg font-semibold">New Customer</span>
              <span className="mt-1 block text-sm text-black/70">Submit Application</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
