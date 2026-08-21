"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ROOM_TEMPLATES } from "@/lib/rooms/templates";

type AnswerState = Record<string, string>;

export default function RoomBuilderPage() {
  const router = useRouter();
  const [templateId, setTemplateId] = useState("custom");
  const [roomName, setRoomName] = useState("새 Room");
  const [answers, setAnswers] = useState<AnswerState>({});
  const [returnRoom, setReturnRoom] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedTemplate = params.get("template") || "custom";
    const validTemplate = ROOM_TEMPLATES.some((item) => item.id === requestedTemplate) ? requestedTemplate : "custom";
    setTemplateId(validTemplate);
    setRoomName((params.get("name") || "새 Room").trim().slice(0, 120) || "새 Room");
    setReturnRoom(params.get("returnRoom") || "");
  }, []);

  const template = useMemo(
    () => ROOM_TEMPLATES.find((item) => item.id === templateId) || ROOM_TEMPLATES.find((item) => item.id === "custom")!,
    [templateId],
  );

  function setAnswer(id: string, value: string) {
    setAnswers((current) => ({ ...current, [id]: value }));
  }

  function buildDescription() {
    return [
      `Room category: ${template.name}`,
      `Template purpose: ${template.shortDescription}`,
      `Suggested AI agents: ${template.suggestedAgents.join(", ")}`,
      ...template.fields.map((field) => `${field.label}: ${answers[field.id]?.trim() || "Not specified"}`),
    ].join("\n");
  }

  async function createRoom(event: FormEvent) {
    event.preventDefault();
    const cleanName = roomName.trim().slice(0, 120);
    if (!cleanName || saving) return;

    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, description: buildDescription() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.room?.id) {
        setError(typeof payload?.error === "string" ? payload.error : "Room을 만들지 못했습니다.");
        return;
      }
      router.push(`/rooms/${payload.room.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8 md:px-6">
      <div className="rounded-3xl border border-[var(--gold)]/35 bg-black/20 p-5 shadow-[0_20px_60px_rgba(0,0,0,.3)] md:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--gold-soft)]">Royal Command Room Builder</p>
        <h1 className="mt-2 text-3xl font-semibold" style={{ fontFamily: "var(--font-display), serif" }}>{roomName} 만들기</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{template.name} 기본틀로 새 Room을 만듭니다. 필요한 내용만 넣고 나머지는 나중에 Room 안에서 추가할 수 있습니다.</p>

        <form onSubmit={createRoom} className="mt-6 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[var(--gold-soft)]">Room 이름</label>
            <input className="rc-input" value={roomName} onChange={(event) => setRoomName(event.target.value)} maxLength={120} />
          </div>

          {template.fields.map((field) => (
            <div key={field.id}>
              <label className="mb-2 block text-sm font-semibold">{field.label}</label>
              {field.options ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {field.options.map((option) => {
                    const selected = answers[field.id] === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setAnswer(field.id, option)}
                        className={`rounded-xl border px-4 py-3 text-left text-sm transition ${selected ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold-soft)]" : "border-white/15 bg-black/15 hover:border-[var(--gold)]/60"}`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  className="rc-input"
                  value={answers[field.id] || ""}
                  onChange={(event) => setAnswer(field.id, event.target.value)}
                  placeholder={field.placeholder || "입력하세요"}
                />
              )}
            </div>
          ))}

          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

          <div className="flex flex-wrap gap-3 pt-2">
            <button type="submit" disabled={saving} className="rc-btn rc-btn-primary">{saving ? "만드는 중…" : "Room 만들기"}</button>
            <button
              type="button"
              className="rc-btn rc-btn-ghost"
              onClick={() => router.push(returnRoom ? `/rooms/${encodeURIComponent(returnRoom)}` : "/dashboard")}
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
