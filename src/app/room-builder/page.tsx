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
  { id: "safe", label: "Safe Mode", detail: "Read and draft first. External actions stay locked." },
  { id: "approval", label: "Run After Approval · Recommended", detail: "Important actions run only after human approval." },
  { id: "autonomous", label: "Autonomous Mode", detail: "Runs automatically only within the allowed scope." },
];

const ROOM_LANGUAGES = [
  { tag: "en-AU", label: "English (Australia)" },
  { tag: "en-US", label: "English (United States)" },
  { tag: "en-GB", label: "English (United Kingdom)" },
  { tag: "ko-KR", label: "Korean" },
  { tag: "ja-JP", label: "Japanese" },
  { tag: "zh-CN", label: "Chinese (Simplified)" },
  { tag: "zh-TW", label: "Chinese (Traditional)" },
  { tag: "es-ES", label: "Spanish" },
  { tag: "fr-FR", label: "French" },
  { tag: "de-DE", label: "German" },
  { tag: "it-IT", label: "Italian" },
  { tag: "pt-BR", label: "Portuguese" },
  { tag: "ar-AE", label: "Arabic" },
  { tag: "hi-IN", label: "Hindi" },
  { tag: "id-ID", label: "Indonesian" },
  { tag: "vi-VN", label: "Vietnamese" },
  { tag: "th-TH", label: "Thai" },
  { tag: "ms-MY", label: "Malay" },
  { tag: "ru-RU", label: "Russian" },
] as const;

export default function RoomBuilderPage() {
  const router = useRouter();
  const [templateId, setTemplateId] = useState("custom");
  const [roomName, setRoomName] = useState("New Room");
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
    setRoomName((params.get("name") || "New Room").trim().slice(0, 120) || "New Room");
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

  const roomLanguageSelectValue = ROOM_LANGUAGES.some((item) => item.tag === globalSettings.languageTag)
    ? globalSettings.languageTag
    : "CUSTOM";

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
        setError(typeof payload?.error === "string" ? payload.error : "Could not create the Room.");
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
        <h1 className="mt-2 text-3xl font-semibold" style={{ fontFamily: "var(--font-display), serif" }}>Create {roomName}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Global Core and recommended materials are prepared automatically. Keep what you need, choose country and Room language, review the Preview, then create the Room.</p>

        <form onSubmit={createRoom} className="mt-6 space-y-7">
          <section className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <div className="mb-3 text-sm font-semibold text-[var(--gold-soft)]">1. Room Information</div>
            <label className="mb-2 block text-sm font-semibold">Room Name</label>
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
                    <input className="rc-input" value={answers[field.id] || ""} onChange={(event) => setAnswer(field.id, event.target.value)} placeholder={field.placeholder || "Enter details"} />
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-[var(--gold-soft)]">2. AI + Tool + Memory Materials</div>
                <p className="mt-1 text-xs text-[var(--muted)]">Recommended materials are selected automatically. Required Core items cannot be disabled.</p>
              </div>
              <span className="rounded-full border border-[var(--gold)]/35 px-3 py-1 text-xs text-[var(--gold-soft)]">Selected {selectedMaterials.length}</span>
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
            <div className="text-sm font-semibold text-[var(--gold-soft)]">3. Approval Rules</div>
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
            <div className="text-sm font-semibold text-[var(--gold-soft)]">4. Country, Room Language & Global Settings</div>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Country and Room language are separate choices. The Room stays in English by default until the customer selects another Room language.</p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold">Country / Region</label>
                <select className="rc-input" value={GLOBAL_ROOM_PRESETS.some((item) => item.id === globalSettings.countryCode) ? globalSettings.countryCode : "OTHER"} onChange={(event) => {
                  const value = event.target.value;
                  if (value === "OTHER") {
                    setGlobalSettings((current) => ({ ...current, countryCode: "OTHER" }));
                    return;
                  }
                  setGlobalSettings((current) => {
                    const previousLanguage = current.languageTag;
                    const next = applyGlobalPreset(current, value);
                    return { ...next, languageTag: previousLanguage };
                  });
                }}>
                  {GLOBAL_ROOM_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
                  <option value="OTHER">Other / Custom country</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Room Language</label>
                <select
                  className="rc-input"
                  value={roomLanguageSelectValue}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "CUSTOM") {
                      setGlobal("languageTag", "");
                      return;
                    }
                    setGlobal("languageTag", value);
                    if (value.startsWith("ar")) setGlobal("textDirection", "rtl");
                    else setGlobal("textDirection", "ltr");
                  }}
                >
                  {ROOM_LANGUAGES.map((language) => <option key={language.tag} value={language.tag}>{language.label}</option>)}
                  <option value="CUSTOM">Other / Custom language</option>
                </select>
                <p className="mt-1 text-[11px] text-[var(--muted)]">This controls the default language used inside the new Room.</p>
              </div>

              {roomLanguageSelectValue === "CUSTOM" ? (
                <div>
                  <label className="mb-2 block text-sm font-semibold">Custom Language Tag</label>
                  <input className="rc-input" value={globalSettings.languageTag} onChange={(event) => setGlobal("languageTag", event.target.value.slice(0, 35))} placeholder="e.g. nl-NL" />
                </div>
              ) : null}

              <div><label className="mb-2 block text-sm font-semibold">Time Zone</label><input className="rc-input" value={globalSettings.timeZone} onChange={(event) => setGlobal("timeZone", event.target.value.slice(0, 80))} placeholder="e.g. Australia/Sydney" /></div>
              <div><label className="mb-2 block text-sm font-semibold">Currency</label><input className="rc-input" value={globalSettings.currencyCode} onChange={(event) => setGlobal("currencyCode", event.target.value.toUpperCase().slice(0, 3))} placeholder="AUD" /></div>
              <div><label className="mb-2 block text-sm font-semibold">Text Direction</label><select className="rc-input" value={globalSettings.textDirection} onChange={(event) => setGlobal("textDirection", event.target.value as GlobalRoomSettings["textDirection"])}><option value="auto">Auto</option><option value="ltr">Left to Right</option><option value="rtl">Right to Left</option></select></div>
              <div><label className="mb-2 block text-sm font-semibold">Encoding / Copy Safety</label><div className="rounded-xl border border-[var(--gold)]/25 bg-black/20 px-3 py-3 text-sm leading-6">UTF-8 · Structure-only clone · Sensitive data excluded</div></div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <div className="flex items-center justify-between gap-3">
              <div><div className="text-sm font-semibold text-[var(--gold-soft)]">5. Website Builder Kit</div><p className="mt-1 text-xs text-[var(--muted)]">When enabled, AI can assist with website structure, pages, forms, Room connections, mobile readiness and deployment preparation.</p></div>
              <button type="button" onClick={() => setWebsiteKit((value) => !value)} className={`min-w-20 rounded-full border px-4 py-2 text-sm font-semibold ${websiteKit ? "border-[var(--gold)] bg-[var(--gold)]/20 text-[var(--gold-soft)]" : "border-white/15 bg-black/20 text-[var(--muted)]"}`}>{websiteKit ? "ON" : "OFF"}</button>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><div className="text-sm font-semibold text-[var(--gold-soft)]">6. Preview & Test</div><p className="mt-1 text-xs text-[var(--muted)]">Review configuration, Room language, global settings and copy safety before creating the Room.</p></div>
              <button type="button" onClick={() => setPreviewOpen((value) => !value)} className="rc-btn rc-btn-ghost text-sm">{previewOpen ? "Close Preview" : "View Preview"}</button>
            </div>

            {previewOpen ? (
              <div className="mt-4 rounded-xl border border-[var(--gold)]/25 bg-black/25 p-4 text-sm leading-6">
                <div><strong>Room:</strong> {roomName}</div>
                <div><strong>Template:</strong> {template.name}</div>
                <div><strong>Recommended AI:</strong> {template.suggestedAgents.join(", ")}</div>
                <div><strong>Memory:</strong> Room Memory ON by default</div>
                <div><strong>Approval:</strong> {APPROVAL_OPTIONS.find((item) => item.id === approvalMode)?.label}</div>
                <div><strong>Country:</strong> {globalSettings.countryCode}</div>
                <div><strong>Room Language:</strong> {globalSettings.languageTag || "Custom language not set"}</div>
                <div><strong>Time Zone:</strong> {globalSettings.timeZone}</div>
                <div><strong>Currency:</strong> {globalSettings.currencyCode}</div>
                <div><strong>Copy:</strong> Structure only · Data/Memory/API keys/Secrets excluded</div>
                <div><strong>Website Kit:</strong> {websiteKit ? "Enabled" : "Disabled"}</div>
                <div className="mt-2"><strong>Materials:</strong> {ROOM_MATERIALS.filter((item) => selectedMaterials.includes(item.id)).map((item) => item.name).join(" · ")}</div>
              </div>
            ) : null}
          </section>

          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

          <div className="flex flex-wrap gap-3 pt-1">
            <button type="submit" disabled={saving} className="rc-btn rc-btn-primary">{saving ? "Creating…" : "Approve & Create Room"}</button>
            <button type="button" className="rc-btn rc-btn-ghost" onClick={() => router.push(returnRoom ? `/rooms/${encodeURIComponent(returnRoom)}` : "/dashboard")}>Cancel</button>
          </div>
        </form>
      </div>
    </main>
  );
}