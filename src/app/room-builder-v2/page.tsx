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

export default function RoomBuilderV2Page() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [purpose, setPurpose] = useState("");
  const [roomNameOverride, setRoomNameOverride] = useState("");
  const [profileCountry, setProfileCountry] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [listening, setListening] = useState(false);
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
      setUser({
        fullName: String(payload.user.fullName || "User"),
        defaultLanguage: String(payload.user.defaultLanguage || "en"),
        countryCode: String(payload.user.countryCode || ""),
      });
    }
    void loadUser();
    return () => { cancelled = true; };
  }, [router]);

  const purposeMatch = useMemo(() => matchPurpose(purpose), [purpose]);
  const korean = user?.defaultLanguage?.toLowerCase().startsWith("ko") || false;
  const automaticRoomName = user
    ? `${firstName(user.fullName)} ${korean ? purposeMatch.ko : purposeMatch.label}`.trim()
    : "";
  const roomName = roomNameOverride || automaticRoomName;

  async function saveLegacyCountry() {
    if (!user || !profileCountry || savingProfile) return;
    setSavingProfile(true);
    setError("");
    try {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCode: profileCountry }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof payload?.error === "string" ? payload.error : "Could not save your country.");
        return;
      }
      setUser((current) => current ? { ...current, countryCode: profileCountry } : current);
    } finally {
      setSavingProfile(false);
    }
  }

  function startVoice() {
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
    recognition.lang = korean ? "ko-KR" : (navigator.language || "en-AU");
    recognition.interimResults = false;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      const latest = event.results[event.results.length - 1]?.[0]?.transcript?.trim();
      if (latest) setPurpose((current) => `${current}${current ? " " : ""}${latest}`);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setError(korean ? "음성을 듣지 못했습니다. 다시 눌러 말씀하시거나 글로 적어주세요." : "I could not hear that. Please try again or type instead.");
    };
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  async function createRoom() {
    if (!user?.countryCode || !purpose.trim() || !roomName.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const locale = applyGlobalPreset(DEFAULT_GLOBAL_ROOM_SETTINGS, user.countryCode);
      const selectedMaterials = TEMPLATE_MATERIAL_PRESETS[purposeMatch.templateId] || TEMPLATE_MATERIAL_PRESETS.custom || [];
      const response = await fetch("/api/room-factory/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName: roomName.trim().slice(0, 120),
          templateId: purposeMatch.templateId,
          countryCode: locale.countryCode,
          languageTag: locale.languageTag,
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

  const canCreate = Boolean(user?.countryCode && purpose.trim() && roomName.trim() && !saving);

  return (
    <main className="min-h-screen px-4 py-6 md:px-6">
      <div className="mx-auto max-w-2xl rounded-3xl border border-[var(--gold)]/35 bg-black/20 p-5 shadow-[0_20px_60px_rgba(0,0,0,.3)] md:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--gold-soft)]">Royal Command · Easy Room Builder</p>
        <h1 className="mt-2 text-3xl font-semibold">{korean ? "무엇을 하고 싶으세요?" : "What would you like to do?"}</h1>
        <p className="mt-3 text-base leading-7 text-[var(--muted)]">
          {korean
            ? "어려운 설정은 묻지 않습니다. 그냥 말씀해 주세요. Royal Command가 기본 Room을 준비하고, 들어가신 뒤 원하는 것을 언제든 추가하거나 바꿀 수 있습니다."
            : "No technical setup questions. Just tell us what you want to do. Royal Command will prepare a basic Room that you can change anytime."}
        </p>

        {user && !user.countryCode ? (
          <section className="mt-6 rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-4">
            <div className="text-sm font-semibold text-[var(--gold-soft)]">{korean ? "기존 계정 확인 — 처음 한 번만" : "Existing account — one-time check"}</div>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{korean ? "예전에 가입하셔서 국가 정보가 없습니다. 한 번만 선택하면 앞으로 다시 묻지 않습니다." : "Your older account has no saved country. Choose it once and we will not ask again."}</p>
            <select className="rc-input mt-3 min-h-12 text-base" value={profileCountry} onChange={(event) => setProfileCountry(event.target.value)}>
              <option value="">{korean ? "국가 선택" : "Choose country"}</option>
              {GLOBAL_ROOM_PRESETS.filter((preset) => preset.id !== "GLOBAL").map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.label}</option>
              ))}
            </select>
            <button type="button" className="rc-btn rc-btn-primary mt-3 min-h-12 w-full" disabled={!profileCountry || savingProfile} onClick={saveLegacyCountry}>
              {savingProfile ? (korean ? "저장 중…" : "Saving…") : (korean ? "저장하고 계속" : "Save and continue")}
            </button>
          </section>
        ) : null}

        {user?.countryCode ? (
          <>
            <section className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm leading-6 text-[var(--muted)]">
                {korean ? "정확하게 설명하실 필요 없습니다. 예: ‘소송 문제 때문에 도움받고 싶어요.’ 그냥 편하게 말씀하세요." : "You do not need to explain it perfectly. For example: ‘I need help with a legal problem.’ Just speak naturally."}
              </p>
              <button type="button" className="rc-btn rc-btn-primary mt-4 min-h-14 w-full text-lg" onClick={startVoice}>
                {listening ? (korean ? "■ 말하기 끝내기" : "■ Stop speaking") : (korean ? "🎤 말로 말씀하기" : "🎤 Speak")}
              </button>
              <textarea
                className="rc-input mt-3 min-h-32 text-base leading-7"
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                placeholder={korean ? "말하거나, 여기에 편하게 적으세요…" : "Speak, or type here in your own words…"}
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
                <p className="mt-2 text-xs text-[var(--muted)]">{korean ? "이름은 자동으로 만들었습니다. 원하시면 지금 또는 나중에 바꾸실 수 있습니다." : "The name was created automatically. You can change it now or later."}</p>
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
          </>
        ) : null}
      </div>
    </main>
  );
}
