"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { Fingerprint, KeyRound, Mic, ShieldCheck, Volume2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type GateState =
  | "idle"
  | "listening"
  | "command-accepted"
  | "challenge-loading"
  | "challenge-ready"
  | "challenge-listening"
  | "challenge-verifying"
  | "challenge-passed"
  | "passkey-verifying"
  | "biometric-ready"
  | "gate-opening"
  | "fallback";

type VoiceChallenge = {
  challengeId: string;
  challengeToken: string;
  phrase: string;
  language: string;
  expiresInSeconds: number;
};

const WAKE_PHRASES = [
  "문 열어",
  "문 열어라",
  "참깨야 문 열어",
  "open the gate",
  "open sesame",
];

function normalizeSpeech(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[.,!?。、！？，]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function supabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
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
  const [challenge, setChallenge] = useState<VoiceChallenge | null>(null);
  const [challengeHeard, setChallengeHeard] = useState("");
  const [platformBiometric, setPlatformBiometric] = useState<boolean | null>(null);
  const [locale, setLocale] = useState("en-AU");
  const configured = supabaseConfigured();

  useEffect(() => {
    setLocale(navigator.language || "en-AU");
    const PKC = window.PublicKeyCredential;
    if (!PKC?.isUserVerifyingPlatformAuthenticatorAvailable) {
      setPlatformBiometric(false);
      return;
    }
    PKC.isUserVerifyingPlatformAuthenticatorAvailable()
      .then(setPlatformBiometric)
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

  function enterAfterGate() {
    setGateState("gate-opening");
    setTimeout(() => {
      router.push(params.get("next") || "/dashboard");
      router.refresh();
    }, 900);
  }

  async function signInWithPasskey() {
    if (!configured) {
      setGateState("fallback");
      setError("Passkey sign-in is waiting for production Supabase configuration.");
      return false;
    }

    setError("");
    setGateState("passkey-verifying");
    try {
      const supabase = createClient();
      const { data, error: passkeyError } = await supabase.auth.signInWithPasskey();
      if (passkeyError) throw passkeyError;
      if (!data?.session || !data?.user) throw new Error("Passkey verification did not create a session.");
      enterAfterGate();
      return true;
    } catch (err) {
      setGateState("fallback");
      setError(
        err instanceof Error
          ? err.message
          : "Passkey verification was cancelled or unavailable. Use secure account sign-in.",
      );
      return false;
    }
  }

  function createRecognition(
    onTranscript: (text: string) => void,
    listeningState: GateState,
  ) {
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
    if (!SR) return null;
    const recognition = new SR();
    recognition.lang = locale;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || "";
      onTranscript(transcript);
    };
    recognition.onerror = () => {
      setGateState("fallback");
      setError("Microphone verification was interrupted. Use Passkey or secure account sign-in.");
    };
    recognition.onend = () => {
      setGateState((current) => (current === listeningState ? "idle" : current));
    };
    return recognition;
  }

  async function loadVoiceChallenge() {
    setGateState("challenge-loading");
    try {
      const res = await fetch(
        `/api/security/voice-challenge?lang=${encodeURIComponent(locale)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as VoiceChallenge & { enabled?: boolean; error?: string };
      if (!res.ok || !data.challengeToken) throw new Error(data.error || "Challenge unavailable");
      setChallenge(data);
      setChallengeHeard("");
      setGateState("challenge-ready");
    } catch (err) {
      setGateState(platformBiometric ? "biometric-ready" : "fallback");
      setError(err instanceof Error ? err.message : "Voice challenge could not be loaded.");
    }
  }

  function beginVoiceGate() {
    setError("");
    setHeard("");
    const recognition = createRecognition((transcript) => {
      setHeard(transcript);
      const normalized = normalizeSpeech(transcript);
      const accepted = WAKE_PHRASES.some((phrase) =>
        normalized.includes(normalizeSpeech(phrase)),
      );
      if (!accepted) {
        setGateState("idle");
        setError("The Guard heard you, but the command was not recognised. Try “문 열어라” or “Open the gate”.");
        return;
      }
      setGateState("command-accepted");
      setTimeout(() => void loadVoiceChallenge(), 400);
    }, "listening");

    if (!recognition) {
      setGateState("fallback");
      setError("Voice command is not supported in this browser. Use Passkey or secure account sign-in.");
      return;
    }
    setGateState("listening");
    recognition.start();
  }

  async function verifyChallengeTranscript(transcript: string) {
    if (!challenge?.challengeToken) return false;
    setGateState("challenge-verifying");
    try {
      const res = await fetch("/api/security/voice-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeToken: challenge.challengeToken,
          transcript,
        }),
      });
      const data = (await res.json()) as { verified?: boolean; error?: string };
      if (!res.ok || !data.verified) {
        setGateState("challenge-ready");
        setError(data.error || "The challenge phrase did not match. Read the exact sentence shown.");
        return false;
      }
      return true;
    } catch {
      setGateState("challenge-ready");
      setError("Voice challenge could not be verified securely. Please try again.");
      return false;
    }
  }

  function beginChallengeReadback() {
    if (!challenge) return;
    setError("");
    setChallengeHeard("");
    const recognition = createRecognition((transcript) => {
      setChallengeHeard(transcript);
      void (async () => {
        const verified = await verifyChallengeTranscript(transcript);
        if (!verified) return;
        setGateState("challenge-passed");
        await new Promise((resolve) => setTimeout(resolve, 350));
        if (platformBiometric && configured) {
          await signInWithPasskey();
        } else {
          setGateState(platformBiometric ? "biometric-ready" : "fallback");
        }
      })();
    }, "challenge-listening");

    if (!recognition) {
      setGateState(platformBiometric ? "biometric-ready" : "fallback");
      setError("Voice challenge is unavailable. Continue with Passkey or secure sign-in.");
      return;
    }
    setGateState("challenge-listening");
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
      enterAfterGate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const gateOpen = gateState === "gate-opening";

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 md:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.12),transparent_38%)]" />
      <div className="relative mx-auto grid min-h-[90vh] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col items-center text-center">
          <Link href="/" className="mb-7 text-sm text-[var(--muted)]">← RoyalCommand.ai</Link>

          <div className="relative h-64 w-64 overflow-hidden rounded-[2.5rem] border border-[var(--gold)]/35 bg-black/30 shadow-2xl md:h-80 md:w-80">
            <div className="absolute inset-y-0 left-0 w-1/2 border-r border-[var(--gold)]/25 bg-[linear-gradient(90deg,rgba(17,24,39,0.98),rgba(55,45,15,0.88))] transition-transform duration-1000" style={{ transform: gateOpen ? "translateX(-102%)" : "translateX(0)" }} />
            <div className="absolute inset-y-0 right-0 w-1/2 border-l border-[var(--gold)]/25 bg-[linear-gradient(270deg,rgba(17,24,39,0.98),rgba(55,45,15,0.88))] transition-transform duration-1000" style={{ transform: gateOpen ? "translateX(102%)" : "translateX(0)" }} />
            <div className="absolute inset-5 rounded-[2rem] border border-white/10" />
            <div className="absolute inset-0 grid place-items-center transition-all duration-700" style={{ opacity: gateOpen ? 0 : 1, transform: gateOpen ? "scale(1.08)" : "scale(1)" }}>
              <div>
                <div className="text-7xl md:text-8xl">{guard.flag}</div>
                <ShieldCheck className="mx-auto mt-4 text-[var(--gold-soft)]" size={44} />
              </div>
            </div>
            <div className="absolute inset-0 grid place-items-center text-[var(--gold-soft)] transition-opacity duration-700" style={{ opacity: gateOpen ? 1 : 0 }}>
              <div><div className="text-5xl">♛</div><div className="mt-3 text-sm uppercase tracking-[0.28em]">Gate Open</div></div>
            </div>
          </div>

          <p className="mt-5 text-xs uppercase tracking-[0.25em] text-[var(--gold-soft)]">{guard.title}</p>
          <h1 className="mt-2 text-4xl md:text-5xl" style={{ fontFamily: "var(--font-display), serif" }}>The Royal Gate</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
            Command the Guard, complete a live voice challenge when requested, then Royal Command asks the device for its Passkey. Face, fingerprint, PIN or security key verification stays with the device.
          </p>

          {gateState !== "challenge-ready" && gateState !== "challenge-listening" && gateState !== "challenge-verifying" ? (
            <button type="button" onClick={beginVoiceGate} className="rc-btn rc-btn-primary mt-6 min-w-56 py-3" disabled={gateState === "listening" || gateState === "challenge-loading" || gateState === "passkey-verifying" || gateOpen}>
              <Mic size={18} />
              {gateState === "listening" ? "Listening…" : gateState === "challenge-loading" ? "Preparing challenge…" : gateState === "passkey-verifying" ? "Verifying device…" : "Command the Gate"}
            </button>
          ) : null}

          {challenge && (gateState === "challenge-ready" || gateState === "challenge-listening" || gateState === "challenge-verifying") ? (
            <div className="mt-6 w-full max-w-xl rounded-3xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Royal Voice Challenge</p>
              <p className="mt-3 text-xl leading-8">“{challenge.phrase}”</p>
              <p className="mt-2 text-xs text-[var(--muted)]">Read this exact sentence aloud. It changes randomly and expires quickly.</p>
              <button type="button" onClick={beginChallengeReadback} className="rc-btn rc-btn-primary mt-4" disabled={gateState === "challenge-listening" || gateState === "challenge-verifying"}>
                <Mic size={17} /> {gateState === "challenge-listening" ? "Listening…" : gateState === "challenge-verifying" ? "Verifying securely…" : "Read the Challenge"}
              </button>
              {challengeHeard ? <div className="mt-3 text-xs text-[var(--muted)]">Heard: “{challengeHeard}”</div> : null}
            </div>
          ) : null}

          <div className="mt-4 min-h-14 text-sm text-[var(--muted)]">
            {gateState === "idle" ? <span>Say: “문 열어라”, “참깨야 문 열어”, or “Open the gate”.</span> : null}
            {gateState === "command-accepted" ? <span className="text-[var(--gold-soft)]">Command accepted.</span> : null}
            {gateState === "challenge-passed" ? <span className="text-[var(--gold-soft)]">Voice challenge verified. Calling device Passkey…</span> : null}
            {gateState === "passkey-verifying" ? <span className="text-[var(--gold-soft)]">Look at the camera, touch the fingerprint sensor, enter the device PIN, or use your security key.</span> : null}
            {gateState === "biometric-ready" ? <span className="text-[var(--gold-soft)]">Device verification is available. Use the Passkey button to continue.</span> : null}
            {gateState === "fallback" ? <span>Use Passkey when available, otherwise use secure account sign-in.</span> : null}
            {heard ? <div className="mt-1 text-xs">Command heard: “{heard}”</div> : null}
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs text-[var(--muted)]">
            <span className="rounded-full border border-white/10 px-3 py-2"><Volume2 size={13} className="mr-1 inline" /> Voice</span>
            <span className="rounded-full border border-white/10 px-3 py-2"><Fingerprint size={13} className="mr-1 inline" /> Face / fingerprint</span>
            <span className="rounded-full border border-white/10 px-3 py-2"><KeyRound size={13} className="mr-1 inline" /> Passkey</span>
          </div>
        </section>

        <section className="rc-card p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Secure entry</p>
          <h2 className="mt-1 text-3xl" style={{ fontFamily: "var(--font-display), serif" }}>Passkey or account</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            A registered Passkey can sign you in without typing an email or password. Password remains a fallback while Royal Command transitions customers safely.
          </p>

          <button type="button" onClick={() => void signInWithPasskey()} className="rc-btn rc-btn-primary mt-6 w-full py-3" disabled={!configured || gateState === "passkey-verifying" || gateOpen}>
            <Fingerprint size={18} /> {gateState === "passkey-verifying" ? "Verifying Passkey…" : "Enter with Face / Fingerprint / Passkey"}
          </button>

          {!configured ? <p className="mt-3 text-xs text-[var(--muted)]">Passkey activation is waiting for final Supabase WebAuthn domain settings.</p> : null}

          <div className="my-6 flex items-center gap-3 text-xs text-[var(--muted)]"><div className="h-px flex-1 bg-white/10" />Fallback<div className="h-px flex-1 bg-white/10" /></div>

          <form onSubmit={onSubmit} className="space-y-4">
            <input className="rc-input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
            <input className="rc-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
            {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
            <button className="rc-btn rc-btn-ghost w-full" disabled={loading || gateOpen}>{loading ? "Signing in…" : "Secure account sign in"}</button>
          </form>

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
