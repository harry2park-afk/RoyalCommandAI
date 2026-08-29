"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { applyGlobalPreset, DEFAULT_GLOBAL_ROOM_SETTINGS, GLOBAL_ROOM_PRESETS } from "@/lib/rooms/global";
import { TEMPLATE_MATERIAL_PRESETS } from "@/lib/rooms/materials";

type CurrentUser = {
  fullName: string;
  defaultLanguage: string;
  countryCode: string;
};

type SpeechResultEvent = {
  results: ArrayLike<{ 0: { transcript: string } }>;
};

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type SpeechCapableWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const LANGUAGES = [
  { code: "en", tag: "en-AU", label: "English" },
  { code: "ko", tag: "ko-KR", label: "한국어" },
  { code: "ja", tag: "ja-JP", label: "日本語" },
  { code: "zh", tag: "zh-CN", label: "中文" },
  { code: "es", tag: "es-ES", label: "Español" },
  { code: "fr", tag: "fr-FR", label: "Français" },
  { code: "de", tag: "de-DE", label: "Deutsch" },
  { code: "it", tag: "it-IT", label: "Italiano" },
  { code: "pt", tag: "pt-BR", label: "Português" },
  { code: "ar", tag: "ar-AE", label: "العربية" },
  { code: "hi", tag: "hi-IN", label: "हिन्दी" },
  { code: "id", tag: "id-ID", label: "Bahasa Indonesia" },
  { code: "vi", tag: "vi-VN", label: "Tiếng Việt" },
  { code: "th", tag: "th-TH", label: "ไทย" },
] as const;

const PURPOSES = [
  { templateId: "legal", label: "Legal", ko: "법률", words: ["legal", "law", "lawsuit", "court", "lawyer", "법률", "법", "소송", "변호사", "재판"] },
  { templateId: "accounting", label: "Accounting", ko: "회계", words: ["account", "accounting", "tax", "bookkeeping", "회계", "세금", "세무", "장부"] },
  { templateId: "retail", label: "Shopping", ko: "쇼핑", words: ["shopping", "shop", "buy", "product", "쇼핑", "구매", "물건"] },
  { templateId: "education", label: "Education", ko: "교육", words: ["education", "study", "learn", "school", "교육", "공부", "학습", "학교"] },
  { templateId: "fitness", label: "Exercise", ko: "운동", words: ["fitness", "exercise", "gym", "training", "운동", "헬스", "체력"] },
  { templateId: "business", label: "Business", ko: "사업", words: ["business", "company", "office", "사업", "회사", "업무"] },
  { templateId: "medical", label: "Health", ko: "건강", words: ["health", "medical", "doctor", "clinic", "건강", "의료", "병원"] },
] as const;

function matchPurpose(value: string) {
  const normalized = value.toLowerCase();
  return PURPOSES.find((item) => item.words.some((word) => normalized.includes(word))) || {
    templateId: "custom",
    label: "My Room",
    ko: "나의 방",
  };
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || "My";
}

function languageCode(value: string) {
  return value.toLowerCase().split("-")[0];
}

export default function RoomBuilderV2Page() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [countryCode, setCountryCode] = useState("");
  const [language, setLanguage] = useState("en");
  const [purpose, setPurpose] = useState("");
  const [roomNameOverride, setRoomNameOverride] = useState("");
  const [saving, setSaving] = useState(false);
  const [listening, setListening] = useState(false);
  const [helperOpen, setHelperOpen] = useState(true);
  const [error, setError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const introPlayedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (cancelled) return;
      if (!response.ok || !payload?.user) {
        router.push("/login");
        return;
      }
      const nextUser = {
        fullName: String(payload.user.fullName || "User"),
        defaultLanguage: String(payload.user.defaultLanguage || "en"),
        countryCode: String(payload.user.countryCode || ""),
      };
      setUser(nextUser);
      setCountryCode(nextUser.countryCode);
      const savedLanguage = languageCode(nextUser.defaultLanguage);
      setLanguage(LANGUAGES.some((item) => item.code === savedLanguage) ? savedLanguage : "en");
    }
    void loadUser();
    return () => {
      cancelled = true;
      audioRef.current?.pause();
      if (audioRef.current?.src.startsWith("blob:")) URL.revokeObjectURL(audioRef.current.src);
    };
  }, [router]);

  const purposeMatch = useMemo(() => matchPurpose(purpose), [purpose]);
  const korean = language === "ko";
  const selectedLanguage = LANGUAGES.find((item) => item.code === language) || LANGUAGES[0];
  const automaticRoomName = user
    ? `${firstName(user.fullName)} ${korean ? purposeMatch.ko : purposeMatch.label}`.trim()
    : "";
  const roomName = roomNameOverride || automaticRoomName;
  const helperMessage = korean
    ? "마이크를 누르고, 만들고 싶은 Room을 편하게 말씀해 주세요."
    : "Tap the microphone and tell me what Room you would like to create.";

  async function playNaturalIntro() {
    try {
      const response = await fetch("/api/ai/helper/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: helperMessage, language: selectedLanguage.tag, greeting: true }),
      });
      if (!response.ok) return false;
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      audioRef.current?.pause();
      if (audioRef.current?.src.startsWith("blob:")) URL.revokeObjectURL(audioRef.current.src);
      const audio = new Audio(url);
      audioRef.current = audio;
      await audio.play();
      introPlayedRef.current = true;
      return true;
    } catch {
      return false;
    }
  }

  useEffect(() => {
    if (!user || !helperOpen || introPlayedRef.current) return;
    void playNaturalIntro();
    // Browser autoplay policies may block this first attempt. The microphone click retries it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, helperOpen]);

  function beginRecognition() {
    const speechWindow = window as SpeechCapableWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setError(korean ? "이 기기에서는 음성 입력을 사용할 수 없습니다. 아래 칸에 글로 적어주세요." : "Voice input is not available on this device. Please type below.");
      return;
    }
    setError("");
    const recognition = new Recognition();
    recognition.lang = selectedLanguage.tag;
    recognition.interimResults = false;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      const latest = event.results[event.results.length - 1]?.[0]?.transcript?.trim();
      if (latest) setPurpose((current) => `${current}${current ? " " : ""}${latest}`);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setError(korean ? "잘 듣지 못했습니다. 마이크를 다시 눌러 말씀해 주세요." : "I could not hear that clearly. Tap the microphone and try again.");
    };
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  async function startVoice() {
    setHelperOpen(true);
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    if (!introPlayedRef.current) {
      const played = await playNaturalIntro();
      if (played && audioRef.current) {
        audioRef.current.onended = () => beginRecognition();
        return;
      }
    }
    beginRecognition();
  }

  async function createRoom() {
    if (!user || !countryCode || !language || !purpose.trim() || !roomName.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const locale = applyGlobalPreset(DEFAULT_GLOBAL_ROOM_SETTINGS, countryCode);
      const selectedMaterials = TEMPLATE_MATERIAL_PRESETS[purposeMatch.templateId] || TEMPLATE_MATERIAL_PRESETS.custom || [];
      const countryEnglishTag = locale.languageTag.toLowerCase().startsWith("en-") ? locale.languageTag : "en-AU";
      const supportedLanguageTags = language === "en" ? [countryEnglishTag] : [selectedLanguage.tag, countryEnglishTag];
      const response = await fetch("/api/room-factory/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName: roomName.trim().slice(0, 120),
          templateId: purposeMatch.templateId,
          countryCode: locale.countryCode,
          languageTag: language === "en" ? countryEnglishTag : selectedLanguage.tag,
          languageTags: supportedLanguageTags,
          timeZone: locale.timeZone,
          currencyCode: locale.currencyCode,
          approvalMode: "approval",
          websiteKit: false,
          selectedMaterials,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.room?.id) {
        setError(typeof payload?.error === "string" ? payload.error : (korean ? "Room을 만들지 못했습니다. 다시 시도해 주세요." : "The Room could not be created. Please try again."));
        return;
      }
      router.push(`/rooms/${payload.room.id}`);
    } finally {
      setSaving(false);
    }
  }

  const canCreate = Boolean(user && countryCode && language && purpose.trim() && roomName.trim() && !saving);

  return (
    <main className="min-h-screen px-4 py-6 md:px-6">
      <div className="mx-auto max-w-2xl rounded-3xl border border-[var(--gold)]/35 bg-black/20 p-5 shadow-[0_20px_60px_rgba(0,0,0,.3)] md:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--gold-soft)]">Royal Command · Easy Room Builder</p>
        <h1 className="mt-2 text-3xl font-semibold">{korean ? "새 Room 만들기" : "Create a new Room"}</h1>

        {helperOpen ? (
          <section className="mt-5 rounded-2xl border border-[var(--gold)]/40 bg-[var(--gold)]/5 p-4 shadow-lg">
            <div className="flex items-start gap-4">
              <img src="/ai-helper-woman.svg" alt="AI Helper" className="h-24 w-24 shrink-0 rounded-2xl object-cover" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-[var(--gold-soft)]">AI Helper</div>
                <p className="mt-2 text-base leading-6">{helperMessage}</p>
              </div>
              <button type="button" className="rounded-full border border-white/15 px-3 py-2 text-lg" aria-label={korean ? "AI Helper 닫기" : "Close AI Helper"} onClick={() => setHelperOpen(false)}>×</button>
            </div>
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                className={`flex h-24 w-24 items-center justify-center rounded-full border-2 text-5xl shadow-lg ${listening ? "border-red-400 bg-red-500/15" : "border-[var(--gold)] bg-black/25"}`}
                aria-label={korean ? "마이크로 Room 만들기" : "Create Room by voice"}
                title={korean ? "마이크" : "Microphone"}
                onClick={startVoice}
              >
                🎤
              </button>
            </div>
            <p className="mt-3 text-center text-sm text-[var(--muted)]">{korean ? "마이크를 누르면 말로 Room을 만들 수 있습니다." : "Tap the microphone to create your Room by voice."}</p>
          </section>
        ) : null}

        <section className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm font-semibold text-[var(--gold-soft)]">1. {korean ? "국가" : "Country"}</div>
          <select className="rc-input mt-3 min-h-12 text-base" value={countryCode} onChange={(event) => setCountryCode(event.target.value)}>
            <option value="">{korean ? "국가 선택" : "Choose country"}</option>
            {GLOBAL_ROOM_PRESETS.filter((preset) => preset.id !== "GLOBAL").map((preset) => (
              <option key={preset.id} value={preset.id}>{preset.label}</option>
            ))}
          </select>
        </section>

        <section className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm font-semibold text-[var(--gold-soft)]">2. {korean ? "주 사용 언어" : "Main language"}</div>
          <select className="rc-input mt-3 min-h-12 text-base" value={language} onChange={(event) => setLanguage(event.target.value)}>
            {LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
          </select>
          {language !== "en" ? (
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-[var(--muted)]">
              {korean ? `함께 사용: ${selectedLanguage.label} + English` : `Use together: ${selectedLanguage.label} + English`}
            </div>
          ) : null}
        </section>

        <section className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm font-semibold text-[var(--gold-soft)]">3. {korean ? "무엇을 하고 싶으세요?" : "What would you like to do?"}</div>
          <textarea
            className="rc-input mt-3 min-h-32 text-base leading-7"
            value={purpose}
            onChange={(event) => {
              if (helperOpen) setHelperOpen(false);
              setPurpose(event.target.value);
            }}
            placeholder={korean ? "말하기 싫으시면 여기에 편하게 적으세요…" : "If you prefer not to speak, type here…"}
          />
        </section>

        {purpose.trim() ? (
          <section className="mt-4 rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-4">
            <div className="text-sm text-[var(--muted)]">{korean ? "Room 이름" : "Room name"}</div>
            <input
              className="rc-input mt-2 min-h-12 text-lg font-semibold"
              value={roomName}
              onChange={(event) => setRoomNameOverride(event.target.value)}
              maxLength={120}
            />
            <p className="mt-2 text-xs text-[var(--muted)]">{korean ? "이름은 자동으로 만들었습니다. 언제든 바꿀 수 있습니다." : "The name was created automatically. You can change it anytime."}</p>
          </section>
        ) : null}

        {error ? <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm">{error}</div> : null}

        <button
          type="button"
          className="rc-btn rc-btn-primary mt-6 min-h-14 w-full text-lg font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canCreate}
          onClick={createRoom}
        >
          {saving ? (korean ? "Room 만드는 중…" : "Creating your Room…") : (korean ? "내 Room 만들기" : "Create My Room")}
        </button>
      </div>
    </main>
  );
}
