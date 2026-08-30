"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ROOM_TEMPLATES } from "@/lib/rooms/templates";
import { resolveDomainProfile } from "@/lib/rooms/factory-v2";

const SELECTED_LANGUAGE_KEY = "royalcommand:selected-language";

type Copy = {
  eyebrow: string;
  titlePrefix: string;
  intro: string;
  readyTitle: string;
  readyItems: string[];
  afterTitle: string;
  afterText: string;
  freeText: string;
  connectText: string;
  button: string;
  creating: string;
  error: string;
  starterTitle: string;
};

const EN: Copy = {
  eyebrow: "Royal Command Room Builder",
  titlePrefix: "Your",
  intro: "You already chose the Room. We will prepare the safe basics automatically. You do not need to fill in a long setup form.",
  readyTitle: "What is prepared for you",
  readyItems: [
    "AI Helper, Room Memory and conversation history",
    "Documents, research, drafts, checklists and safe everyday work",
    "Domain-specific starter capabilities for this Room",
  ],
  afterTitle: "After you enter the Room",
  afterText: "Your AI Helper will welcome you, explain what you can do and help you one step at a time. You can ask anything. If an external connection is useful, the AI will explain why before asking you to connect it.",
  freeText: "Included basics work immediately.",
  connectText: "Paid or external services stay OFF until you choose them and approve the cost/permissions.",
  button: "Create My Room",
  creating: "Creating your Room…",
  error: "We could not create the Room. Please try again.",
  starterTitle: "Inside this Room you can start with",
};

const KO: Copy = {
  eyebrow: "Royal Command Room Builder",
  titlePrefix: "나의",
  intro: "이미 Room 종류를 선택하셨습니다. 긴 설정표를 작성할 필요 없이 안전한 기본 기능을 자동으로 준비합니다.",
  readyTitle: "자동으로 준비되는 것",
  readyItems: [
    "AI Helper, Room Memory와 대화 기록",
    "문서 읽기·정리, 조사, 초안, 체크리스트와 기본 업무",
    "선택한 Room에 맞는 기본 업무 기능",
  ],
  afterTitle: "Room에 들어가면",
  afterText: "AI Helper가 먼저 반갑게 인사하고 무엇을 할 수 있는지 아주 쉽게 안내합니다. 무엇이든 물어보시면 됩니다. 외부 연결이 필요할 때만 왜 필요한지 먼저 설명한 뒤 연결을 안내합니다.",
  freeText: "기본 기능은 바로 사용할 수 있습니다.",
  connectText: "유료 또는 외부 서비스는 고객이 비용과 권한을 확인하고 승인하기 전에는 연결되지 않습니다.",
  button: "내 Room 만들기",
  creating: "Room을 만들고 있습니다…",
  error: "Room을 만들지 못했습니다. 다시 시도해 주세요.",
  starterTitle: "Room에 들어가면 이런 것부터 시작할 수 있습니다",
};

function isKorean(tag: string) {
  return tag.toLowerCase().startsWith("ko");
}

export default function RoomBuilderPage() {
  const router = useRouter();
  const [templateId, setTemplateId] = useState("custom");
  const [languageTag, setLanguageTag] = useState("en");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const sync = () => {
      const params = new URLSearchParams(window.location.search);
      const requestedTemplate = params.get("template") || params.get("roomType") || params.get("step") || "custom";
      const validTemplate = ROOM_TEMPLATES.some((item) => item.id === requestedTemplate) ? requestedTemplate : "custom";
      setTemplateId(validTemplate);
      try {
        setLanguageTag(window.localStorage.getItem(SELECTED_LANGUAGE_KEY) || navigator.language || "en");
      } catch {
        setLanguageTag(navigator.language || "en");
      }
    };

    sync();
    const timer = window.setInterval(sync, 800);
    return () => window.clearInterval(timer);
  }, []);

  const resolved = useMemo(() => resolveDomainProfile(templateId), [templateId]);
  const copy = isKorean(languageTag) ? KO : EN;

  async function createRoom(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");

    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
      const response = await fetch("/api/room-factory/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: resolved.template.id,
          languageTag,
          timeZone,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.room?.id || !payload?.manifest?.id) {
        const message = typeof payload?.error === "string" ? payload.error : copy.error;
        setError(message);
        return;
      }
      router.push(`/rooms/${payload.room.id}?welcome=1`);
    } catch {
      setError(copy.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen w-full px-4 py-8 md:px-6 lg:ml-6 lg:mr-[560px] lg:w-auto lg:max-w-none">
      <div className="mx-auto max-w-[900px] rounded-3xl border border-[var(--gold)]/35 bg-black/20 p-5 shadow-[0_20px_60px_rgba(0,0,0,.3)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--gold-soft)]">{copy.eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold md:text-4xl" style={{ fontFamily: "var(--font-display), serif" }}>
          {copy.titlePrefix} {resolved.profile.roomLabel}
        </h1>
        <p className="mt-3 max-w-[760px] text-[15px] leading-7 text-[var(--muted)]">{copy.intro}</p>

        <div className="mt-7 rounded-2xl border border-[var(--gold)]/25 bg-black/15 p-5 md:p-6">
          <div className="text-lg font-semibold text-[var(--gold-soft)]">{copy.readyTitle}</div>
          <div className="mt-4 space-y-3">
            {copy.readyItems.map((item, index) => (
              <div key={item} className="flex items-start gap-3 text-[15px] leading-6">
                <span className="mt-[2px] grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[var(--gold)]/45 text-xs font-bold text-[var(--gold-soft)]">{index + 1}</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-5 md:p-6">
          <div className="text-base font-semibold text-[var(--gold-soft)]">{copy.starterTitle}</div>
          <div className="mt-3 grid gap-3">
            {resolved.profile.starters.slice(0, 3).map((starter) => (
              <div key={starter} className="rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-sm leading-6 text-white/90">
                {starter}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-5 md:p-6">
          <div className="text-base font-semibold text-[var(--gold-soft)]">{copy.afterTitle}</div>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{copy.afterText}</p>
          <div className="mt-4 space-y-2 text-sm leading-6">
            <div>✓ {copy.freeText}</div>
            <div>✓ {copy.connectText}</div>
          </div>
        </div>

        {resolved.profile.adviceBoundary ? (
          <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/5 px-4 py-3 text-xs leading-5 text-amber-100/85">
            {resolved.profile.adviceBoundary}
          </p>
        ) : null}

        <form onSubmit={createRoom} className="mt-7">
          {error ? <div className="mb-4 rounded-xl border border-red-300/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}
          <button
            type="submit"
            disabled={saving}
            className="flex min-h-[58px] w-full items-center justify-center rounded-2xl border border-[var(--gold)] bg-[#7A0C2E] px-6 text-lg font-semibold text-[#ffe18a] shadow-[0_12px_30px_rgba(0,0,0,.3)] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? copy.creating : copy.button}
          </button>
          <p className="mt-3 text-center text-xs leading-5 text-[var(--muted)]">
            {isKorean(languageTag)
              ? "필요한 추가 설정은 Room 안에서 AI Helper가 하나씩 안내합니다."
              : "Anything else can be handled one step at a time with your AI Helper inside the Room."}
          </p>
        </form>
      </div>
    </main>
  );
}
