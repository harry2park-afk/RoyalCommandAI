"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ROOM_TEMPLATES } from "@/lib/rooms/templates";
import { ROOM_MATERIALS, TEMPLATE_MATERIAL_PRESETS } from "@/lib/rooms/materials";
import {
  applyGlobalPreset,
  DEFAULT_GLOBAL_ROOM_SETTINGS,
  GLOBAL_ROOM_PRESETS,
  GlobalRoomSettings,
  serializeGlobalRoomSettings,
} from "@/lib/rooms/global";

type AnswerState = Record<string, string>;
type ApprovalMode = "safe" | "approval" | "autonomous";

const APPROVAL_OPTIONS: Array<{ id: ApprovalMode; label: string; detail: string }> = [
  { id: "safe", label: "안전 모드", detail: "조회와 초안 중심. 외부 실행은 잠금." },
  { id: "approval", label: "승인 후 실행 · 권장", detail: "중요 작업은 사람 승인 후 실행." },
  { id: "autonomous", label: "자율 실행", detail: "허용된 범위 안에서 자동 실행." },
];

export default function RoomBuilderPage() {
  const router = useRouter();
  const [templateId, setTemplateId] = useState("custom");
  const [roomName, setRoomName] = useState("새 Room");
  const [answers, setAnswers] = useState<AnswerState>({});
  const [returnRoom, setReturnRoom] = useState("");
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>("approval");
  const [websiteKit, setWebsiteKit] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<GlobalRoomSettings>(DEFAULT_GLOBAL_ROOM_SETTINGS);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedTemplate = params.get("template") || "custom";
    const validTemplate = ROOM_TEMPLATES.some((item) => item.id === requestedTemplate) ? requestedTemplate : "custom";
    setTemplateId(validTemplate);
    setRoomName((params.get("name") || "새 Room").trim().slice(0, 120) || "새 Room");
    setReturnRoom(params.get("returnRoom") || "");
    setSelectedMaterials(TEMPLATE_MATERIAL_PRESETS[validTemplate] || TEMPLATE_MATERIAL_PRESETS.custom);
  }, []);

  const template = useMemo(
    () => ROOM_TEMPLATES.find((item) => item.id === templateId) || ROOM_TEMPLATES.find((item) => item.id === "custom")!,
    [templateId],
  );

  const materials = useMemo(
    () => ROOM_MATERIALS.filter((item) => selectedMaterials.includes(item.id) || item.id === "website-builder"),
    [selectedMaterials],
  );

  function setAnswer(id: string, value: string) {
    setAnswers((current) => ({ ...current, [id]: value }));
  }

  function toggleMaterial(id: string) {
    const material = ROOM_MATERIALS.find((item) => item.id === id);
    if (material?.required) return;
    setSelectedMaterials((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function setGlobal<K extends keyof GlobalRoomSettings>(key: K, value: GlobalRoomSettings[K]) {
    setGlobalSettings((current) => ({ ...current, [key]: value }));
  }

  function buildDescription() {
    const enabledMaterials = ROOM_MATERIALS
      .filter((item) => selectedMaterials.includes(item.id) || (websiteKit && item.id === "website-builder"))
      .map((item) => item.name);

    return [
      `Room category: ${template.name}`,
      `Template purpose: ${template.shortDescription}`,
      `Suggested AI agents: ${template.suggestedAgents.join(", ")}`,
      `Approval mode: ${approvalMode}`,
      `Website Builder Kit: ${websiteKit ? "Enabled" : "Disabled"}`,
      `Room materials: ${enabledMaterials.join(", ")}`,
      ...serializeGlobalRoomSettings(globalSettings),
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
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 md:px-6">
      <div className="rounded-3xl border border-[var(--gold)]/35 bg-black/20 p-5 shadow-[0_20px_60px_rgba(0,0,0,.3)] md:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--gold-soft)]">Royal Command Room Builder · Global Core + Template + Warehouse</p>
        <h1 className="mt-2 text-3xl font-semibold" style={{ fontFamily: "var(--font-display), serif" }}>{roomName} 만들기</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">세계 공통 Core와 추천 재료를 자동으로 준비했습니다. 고객은 필요한 재료만 남기고 국가/언어를 선택한 뒤 Preview 후 Room을 만듭니다.</p>

        <form onSubmit={createRoom} className="mt-6 space-y-7">
          <section className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <div className="mb-3 text-sm font-semibold text-[var(--gold-soft)]">1. Room 기본정보</div>
            <label className="mb-2 block text-sm font-semibold">Room 이름</label>
            <input className="rc-input" value={roomName} onChange={(event) => setRoomName(event.target.value)} maxLength={120} />

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {template.fields.map((field) => (
                <div key={field.id}>
                  <label className="mb-2 block text-sm font-semibold">{field.label}</label>
                  {field.options ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {field.options.map((option) => {
                        const selected = answers[field.id] === option;
                        return (
                          <button key={option} type="button" onClick={() => setAnswer(field.id, option)} className={`rounded-xl border px-3 py-2 text-left text-sm transition ${selected ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold-soft)]" : "border-white/15 bg-black/15 hover:border-[var(--gold)]/60"}`}>
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <input className="rc-input" value={answers[field.id] || ""} onChange={(event) => setAnswer(field.id, event.target.value)} placeholder={field.placeholder || "입력하세요"} />
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-[var(--gold-soft)]">2. AI + Tool + Memory 재료</div>
                <p className="mt-1 text-xs text-[var(--muted)]">목적에 맞는 재료가 자동 선택되어 있습니다. 필수 Core는 끌 수 없습니다.</p>
              </div>
              <span className="rounded-full border border-[var(--gold)]/35 px-3 py-1 text-xs text-[var(--gold-soft)]">선택 {selectedMaterials.length}</span>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {materials.filter((item) => item.id !== "website-builder").map((material) => {
                const selected = selectedMaterials.includes(material.id);
                return (
                  <button key={material.id} type="button" onClick={() => toggleMaterial(material.id)} className={`rounded-xl border p-3 text-left transition ${selected ? "border-[var(--gold)]/70 bg-[var(--gold)]/10" : "border-white/10 bg-black/10 opacity-55"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{material.name}</span>
                      <span className="text-[10px] uppercase text-[var(--muted)]">{material.required ? "Core" : material.risk}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{material.description}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <div className="text-sm font-semibold text-[var(--gold-soft)]">3. 승인 규칙</div>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {APPROVAL_OPTIONS.map((option) => (
                <button key={option.id} type="button" onClick={() => setApprovalMode(option.id)} className={`rounded-xl border p-3 text-left ${approvalMode === option.id ? "border-[var(--gold)] bg-[var(--gold)]/12" : "border-white/10 bg-black/10"}`}>
                  <div className="text-sm font-semibold">{option.label}</div>
                  <div className="mt-1 text-xs text-[var(--muted)]">{option.detail}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <div className="text-sm font-semibold text-[var(--gold-soft)]">4. Global Settings & Safe Copy</div>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">하나의 Global Core를 세계 어느 나라에서도 사용합니다. 복사할 때는 구조만 복사하고 고객 데이터, Memory, API Key와 비밀정보는 복사하지 않습니다.</p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold">국가 / 지역</label>
                <select
                  className="rc-input"
                  value={GLOBAL_ROOM_PRESETS.some((item) => item.id === globalSettings.countryCode) ? globalSettings.countryCode : "OTHER"}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "OTHER") {
                      setGlobalSettings((current) => ({ ...current, countryCode: "OTHER" }));
                      return;
                    }
                    setGlobalSettings((current) => applyGlobalPreset(current, value));
                  }}
                >
                  {GLOBAL_ROOM_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
                  <option value="OTHER">Other / Custom country</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Language Tag</label>
                <input className="rc-input" value={globalSettings.languageTag} onChange={(event) => setGlobal("languageTag", event.target.value.slice(0, 35))} placeholder="예: en-AU, ko-KR, ar-AE" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Time Zone</label>
                <input className="rc-input" value={globalSettings.timeZone} onChange={(event) => setGlobal("timeZone", event.target.value.slice(0, 80))} placeholder="예: Australia/Sydney" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Currency</label>
                <input className="rc-input" value={globalSettings.currencyCode} onChange={(event) => setGlobal("currencyCode", event.target.value.toUpperCase().slice(0, 3))} placeholder="AUD" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Text Direction</label>
                <select className="rc-input" value={globalSettings.textDirection} onChange={(event) => setGlobal("textDirection", event.target.value as GlobalRoomSettings["textDirection"])}>
                  <option value="auto">Auto</option>
                  <option value="ltr">Left to Right</option>
                  <option value="rtl">Right to Left</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Encoding / Copy Safety</label>
                <div className="rounded-xl border border-[var(--gold)]/25 bg-black/20 px-3 py-3 text-sm leading-6">
                  UTF-8 · Structure-only clone · Sensitive data excluded
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--gold-soft)]">5. Website Builder Kit</div>
                <p className="mt-1 text-xs text-[var(--muted)]">필요하면 AI가 웹 구조, 페이지, 폼, Room 연결, 모바일 대응과 배포 준비까지 돕습니다.</p>
              </div>
              <button type="button" onClick={() => setWebsiteKit((value) => !value)} className={`min-w-20 rounded-full border px-4 py-2 text-sm font-semibold ${websiteKit ? "border-[var(--gold)] bg-[var(--gold)]/20 text-[var(--gold-soft)]" : "border-white/15 bg-black/20 text-[var(--muted)]"}`}>
                {websiteKit ? "ON" : "OFF"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--gold-soft)]">6. Preview & Test</div>
                <p className="mt-1 text-xs text-[var(--muted)]">실제 생성 전에 구성과 세계화/복사 안전 설정을 확인합니다.</p>
              </div>
              <button type="button" onClick={() => setPreviewOpen((value) => !value)} className="rc-btn rc-btn-ghost text-sm">{previewOpen ? "Preview 닫기" : "Preview 보기"}</button>
            </div>

            {previewOpen ? (
              <div className="mt-4 rounded-xl border border-[var(--gold)]/25 bg-black/25 p-4 text-sm leading-6">
                <div><strong>Room:</strong> {roomName}</div>
                <div><strong>Template:</strong> {template.name}</div>
                <div><strong>AI 추천:</strong> {template.suggestedAgents.join(", ")}</div>
                <div><strong>Memory:</strong> Room Memory 기본 ON</div>
                <div><strong>승인:</strong> {APPROVAL_OPTIONS.find((item) => item.id === approvalMode)?.label}</div>
                <div><strong>Country:</strong> {globalSettings.countryCode}</div>
                <div><strong>Language:</strong> {globalSettings.languageTag}</div>
                <div><strong>Time Zone:</strong> {globalSettings.timeZone}</div>
                <div><strong>Currency:</strong> {globalSettings.currencyCode}</div>
                <div><strong>Copy:</strong> Structure only · Data/Memory/API keys/Secrets 제외</div>
                <div><strong>Website Kit:</strong> {websiteKit ? "사용" : "사용 안 함"}</div>
                <div className="mt-2"><strong>재료:</strong> {ROOM_MATERIALS.filter((item) => selectedMaterials.includes(item.id)).map((item) => item.name).join(" · ")}</div>
              </div>
            ) : null}
          </section>

          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

          <div className="flex flex-wrap gap-3 pt-1">
            <button type="submit" disabled={saving} className="rc-btn rc-btn-primary">{saving ? "만드는 중…" : "Approve & Create Room"}</button>
            <button type="button" className="rc-btn rc-btn-ghost" onClick={() => router.push(returnRoom ? `/rooms/${encodeURIComponent(returnRoom)}` : "/dashboard")}>취소</button>
          </div>
        </form>
      </div>
    </main>
  );
}
