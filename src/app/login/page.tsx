"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { Fingerprint, KeyRound, Mic, ShieldCheck, Volume2 } from "lucide-react";

type GateState = "idle" | "listening" | "command-accepted" | "biometric-ready" | "fallback";

const WAKE_PHRASES = [
  "문 열어",
  "문 열어라",
  "참깨야 문 열어",
  "open the gate",
  "open sesame",
];

function normalizeSpeech(value: string) {
  return value.toLowerCase().replace(/[.,!?]/g, "").replace(/\s+/g, " ").trim();
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [gateState, setGateState] = useState<GateState>("idle");
  const [heard, setHeard] = useState("");
  const [platformBiometric, setPlatformBiometric] = useState<boolean | null>(null);
  const [locale, setLocale] = useState("en-AU");

  useEffect(() => {
    setLocale(navigator.language || "en-AU");
    const PKC = window.PublicKeyCredential;
    if (!PKC?.isUserVerifyingPlatformAuthenticatorAvailable) {
      setPlatformBiometric(false);
      return;
    }
    PKC.isUserVerifyingPlatformAuthenticatorAvailable()
      .then((available) => setPlatformBiometric(available))
      .catch(() => setPlatformBiometric(false));
  }, []);

  const guard = useMemo(() => {
    const l = locale.toLowerCase();
    if (l.includes("ko")) return { flag: "🇰🇷", title: "Royal Command Korea Guard" };
    if (l.includes("ja")) return { flag: "🇯🇵", title: "Royal Command Japan Guard" };
    if (l.includes("en-us")) return { flag: "🇺🇸", title: "Royal Command USA Guard" };
    if (l.includes("en-gb")) return { flag: "🇬🇧", title: "Royal Command UK Guard" };
    if (l.includes("en-au")) return { flag: "🇦🇺", title: "Royal Command Australia Guard" };
    return { flag: "🛡️", title: "Royal Command Guard" };
  }, [locale]);

  function beginVoiceGate() {
    setError("");
    setHeard("");

    const w = window as typeof window & {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        continuous: boolean;
        start: () => void;
        onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        continuous: boolean;
        start: () => void;
        onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
      };
    };

    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setGateState("fallback");
      setError("Voice command is not supported in this browser. Use device verification or account sign-in.");
      return;
    }

    const recognition = new SR();
    recognition.lang = locale;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || "";
      setHeard(transcript);
      const normalized = normalizeSpeech(transcript);
      const accepted = WAKE_PHRASES.some((phrase) => normalized.includes(normalizeSpeech(phrase)));
      if (accepted) {
        setGateState("command-accepted");
        setTimeout(() => setGateState(platformBiometric ? "biometric-ready" : "fallback"), 500);
      } else {
        setGateState("idle");
        setError("The Guard heard you, but the gate command was not recognised. Try “문 열어라” or “Open the gate”.");
      }
    };
    recognition.onerror = () => {
      setGateState("fallback");
      setError("Microphone verification was interrupted. Use device verification or account sign-in.");
    };
    recognition.onend = () => {
      setGateState((current) => (current === "listening" ? "idle" : current));
    };
    setGateState("listening");
    recognition.start();
  }

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
    <main className="relative min-h-screen overflow-hidden px-4 py-8 md:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.12),transparent_38%)]" />
      <div className="relative mx-auto grid min-h-[90vh] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col items-center text-center">
          <Link href="/" className="mb-7 text-sm text-[var(--muted)]">← RoyalCommand.ai</Link>
          <div className="relative grid h-64 w-64 place-items-center rounded-[2.5rem] border border-[var(--gold)]/35 bg-black/30 shadow-2xl md:h-80 md:w-80">
            <div className="absolute inset-5 rounded-[2rem] border border-white/10" />
            <div className="relative">
              <div className="text-7xl md:text-8xl">{guard.flag}</div>
              <ShieldCheck className="mx-auto mt-4 text-[var(--gold-soft)]" size={44} />
            </div>
          </div>
          <p className="mt-5 text-xs uppercase tracking-[0.25em] text-[var(--gold-soft)]">{guard.title}</p>
          <h1 className="mt-2 text-4xl md:text-5xl" style={{ fontFamily: "var(--font-display), serif" }}>The Royal Gate</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
            Give the command. Royal Command then uses the strongest verification available on this device. Face, fingerprint or device PIN stays with the device whenever the platform authenticator supports it.
          </p>

          <button
            type="button"
            onClick={beginVoiceGate}
            className="rc-btn rc-btn-primary mt-6 min-w-56 py-3"
            disabled={gateState === "listening"}
          >
            <Mic size={18} /> {gateState === "listening" ? "Listening…" : "Command the Gate"}
          </button>

          <div className="mt-4 min-h-14 text-sm text-[var(--muted)]">
            {gateState === "idle" ? <span>Say: “문 열어라”, “참깨야 문 열어”, or “Open the gate”.</span> : null}
            {gateState === "command-accepted" ? <span className="text-[var(--gold-soft)]">Command accepted. Checking device security…</span> : null}
            {gateState === "biometric-ready" ? (
              <span className="text-[var(--gold-soft)]">Device face/fingerprint verification is available. Secure Passkey activation is the next server-side step.</span>
            ) : null}
            {gateState === "fallback" ? <span>Use fingerprint/device verification when available, otherwise use secure account sign-in below.</span> : null}
            {heard ? <div className="mt-1 text-xs">Heard: “{heard}”</div> : null}
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs text-[var(--muted)]">
            <span className="rounded-full border border-white/10 px-3 py-2"><Volume2 size={13} className="mr-1 inline" /> Voice command</span>
            <span className="rounded-full border border-white/10 px-3 py-2"><Fingerprint size={13} className="mr-1 inline" /> Face / fingerprint</span>
            <span className="rounded-full border border-white/10 px-3 py-2"><KeyRound size={13} className="mr-1 inline" /> Passkey</span>
          </div>
        </section>

        <section className="rc-card p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Secure fallback</p>
          <h2 className="mt-1 text-3xl" style={{ fontFamily: "var(--font-display), serif" }}>Account sign in</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            The Royal Gate experience never replaces strong authentication. Until production Passkey verification is activated, use your Royal Command account credentials.
          </p>
          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <input className="rc-input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
            <input className="rc-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
            {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
            <button className="rc-btn rc-btn-primary w-full" disabled={loading}>{loading ? "Signing in…" : "Enter Royal Command"}</button>
          </form>
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-4 text-xs leading-5 text-[var(--muted)]">
            Personal family questions, current weather and location can be used later as conversational risk signals, but not as the sole security key. They can be discovered or guessed. High-risk actions will require a cryptographic Passkey and, where appropriate, an additional biometric or voice check.
          </div>
          <p className="mt-6 text-sm text-[var(--muted)]">New here? <Link href="/signup" className="text-[var(--gold-soft)]">Create account</Link></p>
        </section>
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
