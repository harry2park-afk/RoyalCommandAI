"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { GLOBAL_ROOM_PRESETS } from "@/lib/rooms/global";

function greetingFor(language: string) {
  const value = language.toLowerCase();
  if (value.startsWith("ko")) return "환영합니다. Royal Command는 말하고 듣는 AI입니다. 스피커를 편하게 들리는 정도로 맞춰 주세요.";
  if (value.startsWith("ja")) return "ようこそ。Royal Command は話して聞く AI です。聞きやすい音量に調整してください。";
  if (value.startsWith("zh")) return "欢迎。Royal Command 是会说会听的 AI。请把音量调到舒适的程度。";
  if (value.startsWith("vi")) return "Chào mừng. Royal Command là AI có thể nghe và nói. Hãy chỉnh âm lượng ở mức dễ nghe.";
  if (value.startsWith("id")) return "Selamat datang. Royal Command adalah AI yang bisa mendengar dan berbicara. Atur volume pada tingkat yang nyaman.";
  if (value.startsWith("th")) return "ยินดีต้อนรับ Royal Command คือ AI ที่ฟังและพูดได้ โปรดปรับระดับเสียงให้ฟังสบาย";
  if (value.startsWith("hi")) return "स्वागत है। Royal Command सुनने और बोलने वाला AI है। आवाज़ को आरामदायक स्तर पर रखें।";
  return "Welcome. Royal Command is an AI that listens and speaks. Set your speaker to a comfortable level.";
}

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [audioStatus, setAudioStatus] = useState("");

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
        throw new Error(typeof data.error === "string" ? data.error : "Signup failed");
      }
      setAccountCreated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  async function checkAudioAndContinue() {
    const language = navigator.language || "en-AU";
    const message = greetingFor(language);
    let micPermission: "granted" | "denied" | "unavailable" = "unavailable";
    let ttsOk = false;

    try {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = language;
        utterance.rate = 0.98;
        utterance.volume = 1;
        window.speechSynthesis.speak(utterance);
        ttsOk = true;
      }
    } catch {
      ttsOk = false;
    }

    try {
      const stream = await navigator.mediaDevices?.getUserMedia?.({ audio: true });
      if (stream) {
        micPermission = "granted";
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch {
      micPermission = "denied";
    }

    window.localStorage.setItem("rc_audio_setup_v1", JSON.stringify({
      voiceEnabled: true,
      voiceConsent: true,
      preferredLocale: language,
      ttsOk,
      micPermission,
      setupAt: new Date().toISOString(),
    }));
    setAudioStatus(micPermission === "granted" ? "AI voice and microphone are ready." : "AI voice is ready. You can still use text if the microphone is unavailable.");
    window.setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 900);
  }

  function continueWithText() {
    const language = navigator.language || "en-AU";
    window.localStorage.setItem("rc_audio_setup_v1", JSON.stringify({
      voiceEnabled: false,
      voiceConsent: false,
      preferredLocale: language,
      ttsOk: false,
      micPermission: "not-requested",
      setupAt: new Date().toISOString(),
    }));
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8 text-sm text-[var(--muted)]">← RoyalCommand.ai</Link>
      <div className="rc-card p-8">
        {!accountCreated ? (
          <>
            <h1 className="text-3xl" style={{ fontFamily: "var(--font-display), serif" }}>Create your account</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Just four simple details. Royal Command will use your device language automatically.</p>
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <input className="rc-input min-h-12 text-base" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" required />
              <input className="rc-input min-h-12 text-base" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
              <input className="rc-input min-h-12 text-base" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (minimum 8 characters)" minLength={8} required />
              <select className="rc-input min-h-12 text-base" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} required>
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
          </>
        ) : (
          <section className="text-center" aria-live="polite">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--gold-soft)]">Royal Command AI</div>
            <h1 className="mt-3 text-3xl" style={{ fontFamily: "var(--font-display), serif" }}>One quick sound check</h1>
            <p className="mt-4 text-base leading-7 text-[var(--muted)]">Royal Command is an AI that listens and speaks. Please set your speaker to a comfortable middle level. You stay in control, and text always remains available.</p>
            <button type="button" onClick={() => void checkAudioAndContinue()} className="rc-btn rc-btn-primary mt-7 min-h-14 w-full text-base">🔊 Check sound & microphone</button>
            <button type="button" onClick={continueWithText} className="mt-4 text-sm text-[var(--muted)] underline underline-offset-4">Continue with text instead</button>
            {audioStatus ? <p className="mt-4 text-sm text-[var(--gold-soft)]">{audioStatus}</p> : null}
          </section>
        )}
      </div>
    </main>
  );
}
