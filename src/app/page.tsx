import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\'%3E%3Cg fill=\\'%23d4af37\\' fill-opacity=\\'0.04\\'%3E%3Cpath d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="text-2xl tracking-[0.08em]" style={{ fontFamily: "var(--font-display), serif" }}>
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
        <p className="animate-fade-up mb-4 text-sm uppercase tracking-[0.28em] text-[var(--gold-soft)]">
          Royal Household OS
        </p>
        <h1
          className="animate-fade-up max-w-4xl text-5xl leading-[1.05] text-[var(--text)] md:text-7xl"
          style={{ fontFamily: "var(--font-display), serif", animationDelay: "0.08s" }}
        >
          A secure AI operating system for people, families and businesses.
        </h1>
        <p
          className="animate-fade-up mt-6 max-w-2xl text-lg text-[var(--muted)] md:text-xl"
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
