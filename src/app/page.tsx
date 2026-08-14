import Link from "next/link";
import RoyalGateBackground from "@/components/RoyalGateBackground";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070b12]">
      <RoyalGateBackground />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div
          className="text-2xl tracking-[0.08em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          RoyalCommand<span className="text-[var(--gold)]">.ai</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="rc-btn rc-btn-ghost text-sm">
            Sign in
          </Link>
          <Link href="/signup" className="rc-btn rc-btn-primary text-sm">
            Enter Household
          </Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[78vh] w-full max-w-6xl flex-col justify-center px-6 pb-20 pt-8">
        <p className="animate-fade-up mb-4 text-sm uppercase tracking-[0.28em] text-[var(--gold-soft)] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
          Royal Household OS
        </p>
        <h1
          className="animate-fade-up max-w-4xl text-5xl leading-[1.05] text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.9)] md:text-7xl"
          style={{ fontFamily: "var(--font-display), serif", animationDelay: "0.08s" }}
        >
          A secure AI operating system for people, families and businesses.
        </h1>
        <p
          className="animate-fade-up mt-6 max-w-2xl text-lg text-white/80 drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] md:text-xl"
          style={{ animationDelay: "0.16s" }}
        >
          Open a neutral Room. Connect ChatGPT, Claude, Gemini and Grok at once.
          Compare every answer. Keep one final best response — with memory, voice and files.
        </p>
        <div className="animate-fade-up mt-10 flex flex-wrap gap-4" style={{ animationDelay: "0.24s" }}>
          <Link href="/signup" className="rc-btn rc-btn-primary">
            Start Command
          </Link>
          <Link href="/login" className="rc-btn rc-btn-ghost">
            Open existing Household
          </Link>
        </div>
      </section>
    </main>
  );
}
