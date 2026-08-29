"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Plug, Search, X } from "lucide-react";
import { connectorDict, isRtlLocale } from "./roomConnectorI18n";
import { useRoyalCommandLocale } from "./useRoyalCommandLocale";

type Service = {
  service_key: string;
  category: string;
  name_ko: string;
  name_en: string;
  summary_ko?: string | null;
  summary_en?: string | null;
  pricing_type: string;
  currency?: string | null;
  price_minor?: number | null;
  price_status?: string | null;
  default_included: boolean;
  connection_status?: string | null;
  payment_required?: boolean;
  payment_status?: string;
  selection_status: "selected" | "pending_payment" | "active" | "paused" | "cancelled";
};

type Category = "ai" | "tools" | "services";
type CoreAI = { id: string; label: string; titlePrefix: string; ko: string; en: string };
type CoreAIState = CoreAI & { available: boolean; connected: boolean; modelInfo: string };

const CORE_AI: CoreAI[] = [
  { id: "openai", label: "ChatGPT", titlePrefix: "ChatGPT", ko: "질문, 분석, 글쓰기, 코딩과 일반 업무를 지원하는 OpenAI AI", en: "OpenAI AI for questions, analysis, writing, coding and general work" },
  { id: "anthropic", label: "Claude", titlePrefix: "Claude", ko: "긴 문서, 분석, 글쓰기와 코딩 작업에 강한 Anthropic AI", en: "Anthropic AI for long documents, analysis, writing and coding" },
  { id: "google", label: "Gemini", titlePrefix: "Gemini", ko: "검색, 멀티모달, 문서와 일반 업무를 지원하는 Google AI", en: "Google AI for search, multimodal work, documents and general tasks" },
  { id: "xai", label: "Grok", titlePrefix: "Grok", ko: "분석, 질의응답과 최신 정보 활용을 지원하는 xAI 모델", en: "xAI model for analysis, Q&A and current-information workflows" },
];

const TOOL_HINTS = ["email","mail","calendar","file","document","phone","telephony","music","media","xero","myob","quickbooks","payroll","bank","esign","e-sign","signature","storage","translation","marketplace","sports","travel","youtube","video"];

function findAiButton(ai: CoreAI) {
  return Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
    .find((button) => button.title === ai.titlePrefix || button.title.startsWith(`${ai.titlePrefix} —`)) || null;
}

function readAiStates(): CoreAIState[] {
  return CORE_AI.map((ai) => {
    const button = findAiButton(ai);
    const title = button?.title || "";
    return {
      ...ai,
      available: Boolean(button && !button.disabled),
      connected: Boolean(button && (button.className || "").includes("bg-[#7A0C2E]")),
      modelInfo: title.startsWith(`${ai.titlePrefix} —`) ? title.slice(ai.titlePrefix.length + 3).trim() : "",
    };
  });
}

function bucket(service: Service): Exclude<Category, "ai"> {
  const haystack = `${service.category} ${service.service_key} ${service.name_en} ${service.name_ko}`.toLowerCase();
  return TOOL_HINTS.some((hint) => haystack.includes(hint)) ? "tools" : "services";
}

function nameOf(service: Service, locale: string) {
  return locale.toLowerCase().startsWith("ko") ? (service.name_ko || service.name_en) : (service.name_en || service.name_ko);
}
function summaryOf(service: Service, locale: string) {
  return locale.toLowerCase().startsWith("ko") ? (service.summary_ko || service.summary_en || "") : (service.summary_en || service.summary_ko || "");
}
function pricing(service: Service) {
  if (service.default_included || service.pricing_type === "free") return { label: "FREE", free: true, confirmed: true };
  if (service.price_status === "quote") return { label: "PAY · Quote", free: false, confirmed: true };
  if (service.price_status === "tbd" || service.price_minor == null) return { label: "Price pending", free: false, confirmed: false };
  return { label: `PAY · ${service.currency || "AUD"} ${(service.price_minor / 100).toFixed(2)}`, free: false, confirmed: true };
}

export default function RoomConnectorPanel() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const locale = useRoyalCommandLocale();
  const text = connectorDict(locale);
  const rtl = isRtlLocale(locale);
  const korean = locale.toLowerCase().startsWith("ko");

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("ai");
  const [query, setQuery] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [aiStates, setAiStates] = useState<CoreAIState[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [paymentItems, setPaymentItems] = useState<string[]>([]);

  const visibleAi = useMemo(() => {
    if (category !== "ai") return [];
    const q = query.trim().toLowerCase();
    return aiStates.filter((ai) => !q || `${ai.label} ${ai.modelInfo} ${ai.ko} ${ai.en}`.toLowerCase().includes(q));
  }, [aiStates, query, category]);

  const visibleServices = useMemo(() => {
    if (category === "ai") return [];
    const q = query.trim().toLowerCase();
    return services.filter((service) => bucket(service) === category && (!q || `${service.service_key} ${service.category} ${service.name_en} ${service.name_ko} ${service.summary_en || ""} ${service.summary_ko || ""}`.toLowerCase().includes(q)));
  }, [services, query, category]);

  async function load() {
    setLoading(true);
    setError("");
    setAiStates(readAiStates());
    try {
      const response = await fetch(`/api/rooms/${roomId}/services`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || text.loadError);
      setServices(Array.isArray(payload?.services) ? payload.services : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : text.loadError);
    } finally { setLoading(false); }
  }

  function openPanel() {
    setOpen(true); setCategory("ai"); setQuery(""); setSelected(new Set()); void load();
  }

  function toggle(key: string, blocked = false) {
    if (blocked) return;
    setSelected((current) => { const next = new Set(current); next.has(key) ? next.delete(key) : next.add(key); return next; });
  }

  function startSend() {
    if (!selected.size) { setError(text.nothingSelected); return; }
    setAgreed(false); setConfirmOpen(true); setError("");
  }

  async function sendSelected() {
    if (!agreed) return;
    setBusy(true); setConfirmOpen(false); setError("");
    try {
      const payments: string[] = [];

      // AI pricing is not yet stored in the server catalog, so never silently activate or charge it here.
      for (const ai of aiStates) {
        if (!selected.has(`ai:${ai.id}`) || ai.connected || !ai.available) continue;
        payments.push(`${ai.label} · ${korean ? "가격 확인 필요" : "Price confirmation required"}`);
      }

      for (const service of services) {
        if (!selected.has(`service:${service.service_key}`)) continue;
        const price = pricing(service);
        if (!price.confirmed) continue;
        if (service.default_included || service.selection_status === "active") continue;
        const response = await fetch(`/api/rooms/${roomId}/services`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceKey: service.service_key, action: "agree_connect", agree: true }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || text.connectError);
        if (payload.paymentRequired) payments.push(`${nameOf(service, locale)} · ${price.label}`);
      }

      setSelected(new Set());
      await load();
      if (payments.length) setPaymentItems(payments);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : text.connectError);
    } finally { setBusy(false); }
  }

  async function disconnect(service: Service) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/rooms/${roomId}/services`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceKey: service.service_key, action: "disconnect" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || text.disconnectError);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : text.disconnectError); }
    finally { setBusy(false); }
  }

  const cat = (value: Category, label: string, background: string, color: string) => (
    <button type="button" onClick={() => { setCategory(value); setQuery(""); }} style={{ flex: 1, minWidth: 150, height: 48, border: category === value ? "3px solid #fff2a8" : "1px solid rgba(255,255,255,.24)", borderRadius: 10, background, color, fontWeight: 900, fontSize: 14, cursor: "pointer" }}>{label}</button>
  );

  const selectStyle = (checked: boolean) => ({ minWidth: 110, height: 34, border: checked ? "1px solid #d6ad31" : "1px solid #667487", borderRadius: 8, background: checked ? "#2d6a45" : "#111c2a", color: checked ? "#fff7c7" : "#edf2f7", fontWeight: 850, cursor: "pointer" } as const);

  return <>
    <button type="button" onClick={openPanel} title={text.dialogTitle} style={{ position: "fixed", right: 184, top: 52, zIndex: 355, height: 60, minWidth: 172, maxWidth: 240, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "2px solid #9f1d2d", borderRadius: 9, background: "linear-gradient(180deg,#f2d566,#d9b640)", color: "#3a2410", padding: "0 16px", fontSize: 14, fontWeight: 900, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,.32)", cursor: "pointer" }}><Plug size={18}/>{text.connectButton}</button>

    {open && <div role="dialog" aria-modal="true" aria-label={text.dialogTitle} dir={rtl ? "rtl" : "ltr"} style={{ position: "fixed", inset: 0, zIndex: 5000, background: "rgba(0,0,0,.62)", display: "grid", placeItems: "center", padding: 18 }}>
      <div style={{ width: "min(900px,95vw)", maxHeight: "84vh", overflow: "hidden", border: "1px solid #d6ad31", borderRadius: 14, background: "#07111f", color: "#f3f5f7" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid rgba(214,173,49,.35)" }}><strong style={{ color: "#f6d76b", fontSize: 19 }}>{text.dialogTitle}</strong><button type="button" onClick={() => setOpen(false)} style={{ border: 0, background: "transparent", color: "#fff", cursor: "pointer" }}><X size={23}/></button></div>
        <div style={{ padding: 14, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ display: "flex", gap: 9 }}>{cat("ai", text.ai, "#173b68", "#fff")}{cat("tools", text.tools, "#28633f", "#fff")}{cat("services", text.services, "#d3ad38", "#241900")}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #455267", borderRadius: 9, background: "#0c1624", padding: "0 10px", marginTop: 10 }}><Search size={16}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={text.searchPlaceholder} style={{ width: "100%", height: 38, border: 0, outline: 0, background: "transparent", color: "#fff" }}/></div>
        </div>

        <div style={{ maxHeight: "52vh", overflowY: "auto", padding: "8px 14px" }}>
          {error && <div style={{ margin: "6px 0 10px", padding: 9, border: "1px solid #b64545", borderRadius: 8, color: "#ffd2cc" }}>{error}</div>}
          {loading ? <div style={{ padding: 26, textAlign: "center", color: "#b8c1cf" }}>{text.loading}</div> : <>
            {visibleAi.map((ai) => {
              const key = `ai:${ai.id}`; const checked = selected.has(key);
              return <div key={key} style={{ display: "grid", gridTemplateColumns: "180px 1fr 130px 120px", gap: 12, alignItems: "center", minHeight: 68, borderBottom: "1px solid rgba(255,255,255,.1)" }}>
                <div><strong>{ai.label}</strong><div style={{ fontSize: 11, color: "#9fb0c3", marginTop: 3 }}>{ai.modelInfo || (korean ? "모델 정보 확인 중" : "Model info pending")}</div></div>
                <div style={{ fontSize: 12, color: "#c7d1dc", lineHeight: 1.4 }}>{korean ? ai.ko : ai.en}</div>
                <div style={{ textAlign: "center", fontWeight: 900, color: "#ffd56a" }}>{korean ? "가격 확인" : "Price pending"}</div>
                {ai.connected ? <div style={{ textAlign: "center", color: "#7fe3a1", fontWeight: 850 }}>✓ {text.connected}</div> : !ai.available ? <div style={{ textAlign: "center", color: "#aeb8c6" }}>{text.notAvailable}</div> : <button type="button" onClick={() => toggle(key)} style={selectStyle(checked)}>{checked ? `✓ ${korean ? "선택됨" : "Selected"}` : text.connect}</button>}
              </div>;
            })}

            {visibleServices.map((service) => {
              const key = `service:${service.service_key}`; const checked = selected.has(key); const p = pricing(service); const active = service.default_included || service.selection_status === "active"; const pending = service.selection_status === "pending_payment"; const planned = service.connection_status === "planned";
              return <div key={key} style={{ display: "grid", gridTemplateColumns: "180px 1fr 130px 120px", gap: 12, alignItems: "center", minHeight: 68, borderBottom: "1px solid rgba(255,255,255,.1)" }}>
                <div><strong>{nameOf(service, locale)}</strong></div>
                <div style={{ fontSize: 12, color: "#c7d1dc", lineHeight: 1.4 }}>{summaryOf(service, locale) || (korean ? "이 Room에서 사용할 수 있는 연결 도구 또는 서비스" : "A tool or service that can be connected to this Room")}</div>
                <div style={{ textAlign: "center", fontWeight: 900, color: p.free ? "#7fe3a1" : p.confirmed ? "#ffd56a" : "#aeb8c6" }}>{p.label}</div>
                {active ? <div style={{ textAlign: "center", color: "#7fe3a1", fontWeight: 850 }}>✓ {text.connected}</div> : pending ? <div style={{ textAlign: "center", color: "#ffd56a", fontWeight: 850 }}>{text.payment}</div> : planned || !p.confirmed ? <div style={{ textAlign: "center", color: "#aeb8c6" }}>{planned ? text.planned : p.label}</div> : <button type="button" onClick={() => toggle(key)} style={selectStyle(checked)}>{checked ? `✓ ${korean ? "선택됨" : "Selected"}` : text.connect}</button>}
              </div>;
            })}
          </>}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,.08)" }}><span style={{ color: "#b8c1cf", fontSize: 12 }}>{selected.size} {text.selectedCount}</span><button type="button" disabled={busy || !selected.size} onClick={startSend} style={{ border: "1px solid #d6ad31", borderRadius: 9, background: "#7b1023", color: "#f6d76b", padding: "9px 14px", fontWeight: 900, opacity: selected.size && !busy ? 1 : .5 }}>{text.sendSelected}</button></div>
      </div>
    </div>}

    {confirmOpen && <div style={{ position: "fixed", inset: 0, zIndex: 5100, background: "rgba(0,0,0,.78)", display: "grid", placeItems: "center" }}><div style={{ width: "min(520px,92vw)", border: "1px solid #d6ad31", borderRadius: 14, background: "#081322", color: "#fff", padding: 18 }}><div style={{ fontSize: 19, fontWeight: 900, color: "#f6d76b" }}>{text.agreementTitle}</div><label style={{ display: "flex", gap: 9, marginTop: 14, lineHeight: 1.5 }}><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}/><span>{text.agreementBody}</span></label><div style={{ display: "flex", justifyContent: "flex-end", gap: 9, marginTop: 18 }}><button type="button" onClick={() => setConfirmOpen(false)} style={{ padding: "8px 12px" }}>{text.cancel}</button><button type="button" disabled={!agreed || busy} onClick={() => void sendSelected()} style={{ padding: "8px 12px", background: "#7b1023", color: "#f6d76b", border: "1px solid #d6ad31", borderRadius: 8 }}>{text.agreeAndSend}</button></div></div></div>}

    {paymentItems.length > 0 && <div style={{ position: "fixed", inset: 0, zIndex: 5200, background: "rgba(0,0,0,.8)", display: "grid", placeItems: "center" }}><div style={{ width: "min(520px,92vw)", border: "1px solid #d6ad31", borderRadius: 14, background: "#081322", color: "#fff", padding: 18 }}><div style={{ fontSize: 19, fontWeight: 900, color: "#f6d76b" }}>{text.paymentTitle}</div><div style={{ marginTop: 12, color: "#ffe6a0" }}>{text.paymentUnavailable}</div><div style={{ marginTop: 10, fontSize: 12, color: "#bdc7d4" }}>{paymentItems.join(" · ")}</div><div style={{ textAlign: "right", marginTop: 16 }}><button type="button" onClick={() => setPaymentItems([])} style={{ background: "#7b1023", color: "#f6d76b", border: "1px solid #d6ad31", borderRadius: 8, padding: "8px 12px" }}>{text.ok}</button></div></div></div>}
  </>;
}
