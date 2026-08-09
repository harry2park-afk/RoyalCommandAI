"use client";

import { FormEvent, useEffect, useState } from "react";
import { Fingerprint, Mic, ShieldCheck } from "lucide-react";

type VoiceChallenge = {
  challengeToken: string;
  phrase: string;
  expiresInSeconds: number;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

export default function StepUpPanel() {
  const [verified, setVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [passkeyCapable, setPasskeyCapable] = useState(false);
  const [voiceChallenge, setVoiceChallenge] = useState<VoiceChallenge | null>(null);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voicePassed, setVoicePassed] = useState(false);
  const [voiceHeard, setVoiceHeard] = useState("");

  useEffect(() => {
    setPasskeyCapable(
      typeof window !== "undefined" &&
        "PublicKeyCredential" in window &&
        Boolean(navigator.credentials),
    );
    fetch("/api/auth/step-up")
      .then((res) => (res.ok ? res.json() : { verified: false }))
      .then((data) => setVerified(Boolean(data.verified)))
      .catch(() => setVerified(false));
  }, []);

  async function loadVoiceChallenge() {
    setMessage("");
    setVoicePassed(false);
    setVoiceHeard("");
    try {
      const res = await fetch(
        `/api/security/voice-challenge?lang=${encodeURIComponent(navigator.language || "en-AU")}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!res.ok || !data.challengeToken) throw new Error(data.error || "Voice challenge unavailable");
      setVoiceChallenge({
        challengeToken: data.challengeToken,
        phrase: data.phrase,
        expiresInSeconds: data.expiresInSeconds,
      });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Voice challenge unavailable");
    }
  }

  function beginVoiceChallenge() {
    if (!voiceChallenge) return;
    setMessage("");
    setVoiceHeard("");

    const w = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setMessage("Voice recognition is not supported in this browser. Use the secure fallback below.");
      return;
    }

    const recognition = new SR();
    recognition.lang = navigator.language || "en-AU";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || "";
      setVoiceHeard(transcript);
      void verifyVoiceChallenge(transcript);
    };
    recognition.onerror = () => {
      setVoiceListening(false);
      setMessage("Voice check was interrupted. Try again or use the secure fallback.");
    };
    recognition.onend = () => setVoiceListening(false);
    setVoiceListening(true);
    recognition.start();
  }

  async function verifyVoiceChallenge(transcript: string) {
    if (!voiceChallenge) return;
    try {
      const res = await fetch("/api/security/voice-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeToken: voiceChallenge.challengeToken,
          transcript,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.verified) {
        setVoicePassed(false);
        setMessage(data.error || "The phrase did not match. Request a new challenge and try again.");
        return;
      }
      setVoicePassed(true);
      setMessage("Live voice phrase matched. Complete strong identity verification to unlock sensitive actions.");
    } catch {
      setVoicePassed(false);
      setMessage("Voice verification could not be completed securely.");
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/step-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      setVerified(true);
      setPassword("");
      setMessage(
        voicePassed
          ? "Voice liveness and identity verification completed. Sensitive actions are unlocked for the next 10 minutes."
          : "Identity verified for sensitive actions for the next 10 minutes.",
      );
    } catch (err) {
      setVerified(false);
      setMessage(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function clearVerification() {
    await fetch("/api/auth/step-up", { method: "DELETE" });
    setVerified(false);
    setVoicePassed(false);
    setVoiceChallenge(null);
    setVoiceHeard("");
    setMessage("Sensitive-action verification cleared.");
  }

  return (
    <section className="rc-card p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Step-up security</p>
          <h2 className="mt-1 text-2xl" style={{ fontFamily: "var(--font-display), serif" }}>
            Verify only when it matters
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Normal use stays simple. Sensitive actions can add a random live voice phrase, then require strong identity verification before access is unlocked.
          </p>
        </div>
        <div className={`rounded-xl border px-3 py-2 text-xs ${verified ? "border-[var(--gold)]/50 text-[var(--gold-soft)]" : "border-white/10 text-[var(--muted)]"}`}>
          {verified ? "Verified" : "Verification required"}
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
          <div className="flex items-center gap-2"><Mic size={18} className="text-[var(--gold-soft)]" /><span className="font-medium">Royal Voice Challenge</span></div>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            A short server-generated phrase changes randomly and expires quickly. This confirms a live read-back, but does not by itself prove the speaker's identity.
          </p>
          {!voiceChallenge ? (
            <button type="button" onClick={loadVoiceChallenge} className="rc-btn rc-btn-ghost mt-3 w-full text-sm">Get random phrase</button>
          ) : (
            <div className="mt-3">
              <div className="rounded-xl border border-[var(--gold)]/25 bg-[var(--gold)]/5 p-3 text-sm">“{voiceChallenge.phrase}”</div>
              <button type="button" onClick={beginVoiceChallenge} className="rc-btn rc-btn-ghost mt-3 w-full text-sm" disabled={voiceListening || voicePassed}>
                {voicePassed ? "Voice phrase matched" : voiceListening ? "Listening…" : "Read phrase aloud"}
              </button>
              {voiceHeard ? <p className="mt-2 text-xs text-[var(--muted)]">Heard: “{voiceHeard}”</p> : null}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
          <div className="flex items-center gap-2"><Fingerprint size={18} className="text-[var(--gold-soft)]" /><span className="font-medium">Passkey device capability</span></div>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            {passkeyCapable
              ? "This device/browser reports WebAuthn capability. Face, fingerprint or device PIN can support a Passkey once production verification is activated."
              : "This browser does not currently report WebAuthn capability. Secure fallback remains available."}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
          <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-[var(--gold-soft)]" /><span className="font-medium">Strong identity verification</span></div>
          {verified ? (
            <div className="mt-3">
              <p className="text-xs text-[var(--muted)]">Sensitive actions are unlocked for a short, signed session.</p>
              <button type="button" onClick={clearVerification} className="rc-btn rc-btn-ghost mt-3 text-sm">Lock sensitive actions now</button>
            </div>
          ) : (
            <form onSubmit={verify} className="mt-3 space-y-3">
              <input className="rc-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Confirm your password" required />
              <button className="rc-btn rc-btn-primary w-full text-sm" disabled={loading}>{loading ? "Verifying…" : "Verify identity"}</button>
            </form>
          )}
        </div>
      </div>

      {message ? <p className="mt-4 text-xs text-[var(--muted)]">{message}</p> : null}
    </section>
  );
}
