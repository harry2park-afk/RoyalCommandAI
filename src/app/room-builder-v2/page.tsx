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
    return () => { cancelled = true; };
  }, [router]);

  const purposeMatch = useMemo(() => matchPurpose(purpose), [purpose]);
  const korean = language === "ko";
  const selectedLanguage = LANGUAGES.find((item) => item.code === language) || LANGUAGES[0];
  const automaticRoomName = user
    ? `${firstName(user.fullName)} ${korean ? purposeMatch.ko : purposeMatch.label}`.trim()
    : "";
  const roomName = roomNameOverride || automaticRoomName;
  const helperMessage = korean
    ? "안녕하세요. 제가 Room 만들기를 도와드리겠습니다. 먼저 국가와 가장 편한 언어를 선택해 주세요. 그 다음 무엇을 하고 싶은지 편하게 말씀해 주세요. 정확하게 설명하지 않으셔도 됩니다. 말하기 싫으시면 아래 칸에 글로 적으셔도 됩니다."
    : "Hello. I will help you create your Room. First choose your country and the language you are most comfortable with. Then simply tell me what you would like to do. You do not need to explain it perfectly. If you prefer, you can type below instead.";

  function speakHelper() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(helperMessage);
    utterance.lang = selectedLanguage.tag;
    window.speechSynthesis.speak(utterance);
  }

  function startVoice() {
    setHelperOpen(true);
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const speechWindow = window as SpeechCapableWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setError(korean ? "이 기기의 브라우저에서는 음성 입력을 바로 사용할 수 없습니다. 아래 칸에 편하게 글로 적어주세요." : "Voice input is not available in this browser. Please type in the box below.");
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
      setError(korean ? "음성을 듣지 못했습니다. 마이크를 다시 눌러 말씀하시거나 글로 적어주세요." : "I could not hear that. Tap the microphone again or type instead.");
    };
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  async function createRoom() {
    if (!user || !countryCode || !language || !purpose.trim() || !roomName.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const locale = applyGlobalPreset(DEFAULT_GLOBAL_ROOM_SETTINGS, countryCode);
      const selectedMaterials = TEMPLATE_MATERIAL_PRESETS[purposeMatch.templateId] || TEMPLATE_MATERIAL_PRESETS.custom || [];
      const countryEnglishTag = locale.languageTag.toLowerCase().startsWith("en-") ? locale.languageTag : "en-AU";
      const supportedLanguageTags = language === "en"
        ? [countryEnglishTag]
        : [selectedLanguage.tag, countryEnglishTag];
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
        setError(typeof payload?.error === "string" ? payload.error : (korean ? "방을 만들지 못했습니다. 다시 시도해 주세요." : "The Room could not be created. Please try again."));
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
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--gold-soft)]">AI Helper</div>
                <p className="mt-2 text-base leading-7">{helperMessage}</p>
              </div>
              <button type="button" className="rounded-full border border-white/15 px-3 py-2 text-lg" aria-label={korean ? "AI Helper 닫기" : "Close AI Helper"} title={korean ? "닫기" : "Close"} onClick={() => setHelperOpen(false)}>×</button>
            </div>
            <div className="mt-4 flex items-center justify-center gap-4">
              <button type="button" className={`flex h-14 w-14 items-center justify-center rounded-full border text-2xl ${listening ? "border-red-400 bg-red-500/15" : "border-[var(--gold)]/50 bg-black/20"}`} aria-label={korean ? "마이크" : "Microphone"} title={korean ? "마이크" : "Microphone"} onClick={startVoice}>🎤</button>
              <button type="button" className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--gold)]/50 bg-black/20 text-2xl" aria-label={korean ? "안내 듣기" : "Hear instructions"} title={korean ? "안내 듣기" : "Hear instructions"} onClick={speakHelper}>🔊</button>
            </div>
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
          {!helperOpen ? (
            <div className="mt-3 flex justify-center gap-3">
              <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-xl" aria-label={korean ? "마이크" : "Microphone"} title={korean ? "마이크" : "Microphone"} onClick={startVoice}>🎤</button>
              <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-xl" aria-label={korean ? "AI Helper 다시 열기" : "Open AI Helper"} title={korean ? "AI Helper 다시 열기" : "Open AI Helper"} onClick={() => setHelperOpen(true)}>🔊</button>
            </div>
          ) : null}
        </section>

        {purpose.trim() ? (
          <section className="mt-4 rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-4">
            <div className="text-sm text-[var(--muted)]">{korean ? "Room 이름" : "Room name"}</div>
            <input className="rc-input mt-2 min-h-12 text-lg font-semibold" value={roomName} onChange={(event) => setRoomNameOverride(event.target.value)} maxLength={120} />
            <p className="mt-2 text-xs text-[var(--muted)]">{korean ? "이름은 자동으로 만들었습니다. 원하시면 지금 또는 나중에 바꾸실 수 있습니다." : "The name was created automatically. You can change it now or later."}</p>
          </section>
        ) : null}

        {error ? <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm">{error}</div> : null}

        <button type="button" className="rc-btn rc-btn-primary mt-6 min-h-14 w-full text-lg font-semibold disabled:cursor-not-allowed disabled:opacity-40" disabled={!canCreate} onClick={createRoom}>
          {saving ? (korean ? "Room 만드는 중…" : "Creating your Room…") : (korean ? "내 Room 만들기" : "Create My Room")}
        </button>
      </div>
    </main>
  );
}
