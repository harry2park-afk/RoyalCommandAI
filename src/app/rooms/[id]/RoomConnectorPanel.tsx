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
  agreement_required?: boolean;
  selection_status: "selected" | "pending_payment" | "active" | "paused" | "cancelled";
};

type CoreAI = { id: string; label: string; titlePrefix: string };
type CoreAIState = CoreAI & { available: boolean; connected: boolean };
type Tab = "all" | "ai" | "tools" | "services";

const CORE_AI: CoreAI[] = [
  { id: "openai", label: "ChatGPT", titlePrefix: "ChatGPT" },
  { id: "anthropic", label: "Claude", titlePrefix: "Claude" },
  { id: "google", label: "Gemini", titlePrefix: "Gemini" },
  { id: "xai", label: "Grok", titlePrefix: "Grok" },
];

const TOOL_HINTS = [
  "email", "mail", "calendar", "file", "document", "phone", "telephony", "music", "media",
  "xero", "myob", "quickbooks", "payroll", "bank", "esign", "e-sign", "signature", "storage",
];

function findAiButton(ai: CoreAI) {
  return Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
    .find((button) => button.title === ai.titlePrefix || button.title.startsWith(`${ai.titlePrefix} —`)) || null;
}

function readAiStates(): CoreAIState[] {
  return CORE_AI.map((ai) => {
    const button = findAiButton(ai);
    const className = button?.className || "";
    return {
      ...ai,
      available: Boolean(button && !button.disabled),
      connected: Boolean(button && className.includes("bg-[#7A0C2E]")),
    };
  });
}

function serviceBucket(service: Service): Exclude<Tab, "all" | "ai"> {
  const haystack = `${service.category} ${service.service_key} ${service.name_en} ${service.name_ko}`.toLowerCase();
  return TOOL_HINTS.some((hint) => haystack.includes(hint)) ? "tools" : "services";
}

function serviceName(service: Service, locale: string) {
  return locale.toLowerCase().startsWith("ko") ? (service.name_ko || service.name_en) : (service.name_en || service.name_ko);
}

function serviceSummary(service: Service, locale: string) {
  return locale.toLowerCase().startsWith("ko") ? (service.summary_ko || service.summary_en || "") : (service.summary_en || service.summary_ko || "");
}

function priceLabel(service: Service, includedLabel: string) {
  if (service.default_included || service.pricing_type === "free") return includedLabel;
  if (service.price_status === "quote") return "Quote";
  if (service.price_status === "tbd" || service.price_minor == null) return "TBD";
  return `${service.currency || "AUD"} ${(service.price_minor / 100).toFixed(2)}`;
}

export default function RoomConnectorPanel() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const locale = useRoyalCommandLocale();
  const text = connectorDict(locale);
  const rtl = isRtlLocale(locale);

  const [open, setOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [aiStates, setAiStates] = useState<CoreAIState[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<Service[]>([]);

  const visibleServices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter((service) => {
      if (tab === "ai") return false;
      const bucket = serviceBucket(service);
      if (tab !== "all" && tab !== bucket) return false;
      if (!q) return true;
      return `${service.service_key} ${service.category} ${service.name_en} ${service.name_ko} ${service.summary_en || ""} ${service.summary_ko || ""}`
        .toLowerCase().includes(q);
    });
  }, [services, query, tab]);

  const visibleAi = useMemo(() => {
    if (tab === "tools" || tab === "services") return [];
    const q = query.trim().toLowerCase();
    return aiStates.filter((ai) => !q || ai.label.toLowerCase().includes(q));
  }, [aiStates, query, tab]);

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
    } finally {
      setLoading(false);
    }
  }

  function openConnector() {
    setOpen(true);
    setQuery("");
    setTab("all");
    setSelected(new Set());
    void load();
  }

  function toggleSelected(key: string, blocked = false) {
    if (blocked) return;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function beginSend() {
    if (!selected.size) {
      setError(text.nothingSelected);
      return;
    }
    setError("");
    const selectedServices = services.filter((service) => selected.has(`service:${service.service_key}`));
    if (selectedServices.length) {
      setAgreed(false);
      setConfirmOpen(true);
      return;
    }
    void sendSelected();
  }

  async function sendSelected() {
    setBusy(true);
    setError("");
    setConfirmOpen(false);
    try {
      for (const ai of aiStates) {
        if (!selected.has(`ai:${ai.id}`) || ai.connected || !ai.available) continue;
        findAiButton(ai)?.click();
      }

      const paid: Service[] = [];
      for (const service of services) {
        if (!selected.has(`service:${service.service_key}`)) continue;
        if (service.default_included || service.selection_status === "active") continue;
        const response = await fetch(`/api/rooms/${roomId}/services`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceKey: service.service_key, action: "agree_connect", agree: true }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || text.connectError);
        if (payload.paymentRequired) paid.push(service);
      }
      setSelected(new Set());
      await load();
      if (paid.length) setPaymentNotice(paid);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : text.connectError);
    } finally {
      setBusy(false);
    }
  }

  async function disconnect(service: Service) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/rooms/${roomId}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceKey: service.service_key, action: "disconnect" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || text.disconnectError);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : text.disconnectError);
    } finally {
      setBusy(false);
    }
  }

  const tabButton = (value: Tab, label: string) => (
    <button type="button" onClick={() => setTab(value)} style={{ border: "1px solid #566273", borderRadius: 8, padding: "7px 11px", background: tab === value ? "#7b1023" : "#101a29", color: tab === value ? "#f6d76b" : "#d9e0e8", cursor: "pointer", fontWeight: 800 }}>
      {label}
    </button>
  );

  return (
    <>
      <button
        type="button"
        onClick={openConnector}
        title={text.dialogTitle}
        style={{
          position: "fixed",
          right: 184,
          top: 52,
          zIndex: 355,
          height: 60,
          minWidth: 172,
          maxWidth: 240,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          border: "2px solid #9f1d2d",
          borderRadius: 9,
          background: "linear-gradient(180deg, #f2d566 0%, #d9b640 100%)",
          color: "#3a2410",
          padding: "0 16px",
          fontSize: 14,
          fontWeight: 900,
          whiteSpace: "nowrap",
          boxShadow: "0 4px 12px rgba(0,0,0,.32)",
          cursor: "pointer",
        }}
      >
        <Plug size={18} /> {text.connectButton}
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-label={text.dialogTitle} dir={rtl ? "rtl" : "ltr"} style={{ position: "fixed", inset: 0, zIndex: 5000, background: "rgba(0,0,0,.62)", display: "grid", placeItems: "center", padding: 18 }} onMouseDown={(event) => { if (event.target === event.currentTarget && !confirmOpen) setOpen(false); }}>
          <div style={{ width: "min(720px, 94vw)", maxHeight: "82vh", overflow: "hidden", border: "1px solid #d6ad31", borderRadius: 14, background: "#07111f", color: "#f3f5f7", boxShadow: "0 20px 60px rgba(0,0,0,.55)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid rgba(214,173,49,.35)" }}>
              <strong style={{ color: "#f6d76b", fontSize: 19 }}>{text.dialogTitle}</strong>
              <button type="button" aria-label={text.cancel} onClick={() => setOpen(false)} style={{ border: 0, background: "transparent", color: "#fff", cursor: "pointer" }}><X size={23} /></button>
            </div>

            <div style={{ padding: 14, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #455267", borderRadius: 9, background: "#0c1624", padding: "0 10px" }}>
                <Search size={16} style={{ opacity: .75 }} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text.searchPlaceholder} style={{ width: "100%", height: 38, border: 0, outline: 0, background: "transparent", color: "#fff", fontSize: 13 }} />
              </div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 10 }}>
                {tabButton("all", text.all)}
                {tabButton("ai", text.ai)}
                {tabButton("tools", text.tools)}
                {tabButton("services", text.services)}
              </div>
            </div>

            <div style={{ maxHeight: "52vh", overflowY: "auto", padding: 12 }}>
              {error && <div style={{ marginBottom: 10, padding: 9, border: "1px solid #a44", borderRadius: 8, color: "#ffd2cc" }}>{error}</div>}
              {loading ? <div style={{ padding: 26, textAlign: "center", color: "#b8c1cf" }}>{text.loading}</div> : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 9 }}>
                  {visibleAi.map((ai) => {
                    const key = `ai:${ai.id}`;
                    const checked = selected.has(key);
                    return <button key={key} type="button" disabled={!ai.available} onClick={() => toggleSelected(key, !ai.available || ai.connected)} style={{ textAlign: "start", border: `1px solid ${checked || ai.connected ? "#d6ad31" : "#344154"}`, borderRadius: 10, padding: 11, background: checked ? "#3a1b24" : "#0c1624", color: "#fff", cursor: ai.available && !ai.connected ? "pointer" : "default", opacity: ai.available ? 1 : .5 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong>{ai.label}</strong><span>{checked ? "✓" : ""}</span></div>
                      <div style={{ marginTop: 5, fontSize: 11, color: ai.connected ? "#7fe3a1" : "#aeb8c6" }}>{!ai.available ? text.notAvailable : ai.connected ? text.connected : text.notConnected}</div>
                    </button>;
                  })}

                  {visibleServices.map((service) => {
                    const key = `service:${service.service_key}`;
                    const active = service.default_included || service.selection_status === "active";
                    const pending = service.selection_status === "pending_payment";
                    const checked = selected.has(key);
                    return <div key={key} style={{ border: `1px solid ${checked || active ? "#d6ad31" : "#344154"}`, borderRadius: 10, padding: 11, background: checked ? "#3a1b24" : "#0c1624" }}>
                      <button type="button" onClick={() => toggleSelected(key, active || pending || service.connection_status === "planned")} style={{ width: "100%", textAlign: "start", border: 0, padding: 0, background: "transparent", color: "#fff", cursor: active || pending ? "default" : "pointer" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong>{serviceName(service, locale)}</strong><span>{checked ? "✓" : ""}</span></div>
                        <div style={{ marginTop: 4, fontSize: 11, color: "#d9bd65" }}>{priceLabel(service, text.included)}</div>
                        {serviceSummary(service, locale) && <div style={{ marginTop: 6, fontSize: 11, lineHeight: 1.4, color: "#aeb8c6" }}>{serviceSummary(service, locale)}</div>}
                      </button>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 8 }}>
                        <span style={{ fontSize: 11, color: pending ? "#f3c969" : active ? "#7fe3a1" : "#95a1b1" }}>{service.default_included ? text.included : pending ? text.pendingPayment : service.connection_status === "planned" ? text.planned : active ? text.connected : text.notConnected}</span>
                        {active && !service.default_included && <button type="button" disabled={busy} onClick={() => void disconnect(service)} style={{ border: "1px solid #8f4f5a", borderRadius: 7, background: "#31151c", color: "#ffd7dd", padding: "5px 8px", cursor: "pointer" }}>{text.disconnect}</button>}
                      </div>
                    </div>;
                  })}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,.08)" }}>
              <span style={{ color: "#b8c1cf", fontSize: 12 }}>{selected.size} {text.selectedCount}</span>
              <button type="button" disabled={busy || !selected.size} onClick={beginSend} style={{ border: "1px solid #d6ad31", borderRadius: 9, background: "#7b1023", color: "#f6d76b", padding: "9px 14px", fontWeight: 900, cursor: selected.size && !busy ? "pointer" : "not-allowed", opacity: selected.size && !busy ? 1 : .5 }}>{text.sendSelected}</button>
            </div>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div dir={rtl ? "rtl" : "ltr"} style={{ position: "fixed", inset: 0, zIndex: 5100, background: "rgba(0,0,0,.78)", display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ width: "min(520px,92vw)", border: "1px solid #d6ad31", borderRadius: 14, background: "#081322", color: "#fff", padding: 18 }}>
            <div style={{ fontSize: 19, fontWeight: 900, color: "#f6d76b" }}>{text.agreementTitle}</div>
            <label style={{ display: "flex", gap: 9, marginTop: 14, lineHeight: 1.5 }}><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} /><span>{text.agreementBody}</span></label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, marginTop: 18 }}>
              <button type="button" onClick={() => { setConfirmOpen(false); setAgreed(false); }} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #566273", background: "#142033", color: "#fff" }}>{text.cancel}</button>
              <button type="button" disabled={!agreed || busy} onClick={() => void sendSelected()} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #d6ad31", background: "#7b1023", color: "#f6d76b", fontWeight: 800, opacity: agreed && !busy ? 1 : .5 }}>{text.agreeAndSend}</button>
            </div>
          </div>
        </div>
      )}

      {paymentNotice.length > 0 && (
        <div dir={rtl ? "rtl" : "ltr"} style={{ position: "fixed", inset: 0, zIndex: 5200, background: "rgba(0,0,0,.8)", display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ width: "min(520px,92vw)", border: "1px solid #d6ad31", borderRadius: 14, background: "#081322", color: "#fff", padding: 18 }}>
            <div style={{ fontSize: 19, fontWeight: 900, color: "#f6d76b" }}>{text.paymentTitle}</div>
            <div style={{ marginTop: 12, color: "#ffe6a0", lineHeight: 1.5 }}>{text.paymentUnavailable}</div>
            <div style={{ marginTop: 10, color: "#bdc7d4", fontSize: 12 }}>{paymentNotice.map((service) => serviceName(service, locale)).join(", ")}</div>
            <div style={{ textAlign: "end", marginTop: 16 }}><button type="button" onClick={() => setPaymentNotice([])} style={{ background: "#7b1023", color: "#f6d76b", border: "1px solid #d6ad31", borderRadius: 8, padding: "8px 12px" }}>{text.ok}</button></div>
          </div>
        </div>
      )}
    </>
  );
}
