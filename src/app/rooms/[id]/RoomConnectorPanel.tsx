"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Plug, X } from "lucide-react";

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

type CoreAI = { id: string; label: string; titlePrefix: string };
type CoreAIState = CoreAI & { available: boolean; connected: boolean };

const CORE_AI: CoreAI[] = [
  { id: "openai", label: "ChatGPT", titlePrefix: "ChatGPT" },
  { id: "anthropic", label: "Claude", titlePrefix: "Claude" },
  { id: "google", label: "Gemini", titlePrefix: "Gemini" },
  { id: "xai", label: "Grok", titlePrefix: "Grok" },
];

function priceLabel(service: Service) {
  if (service.default_included || service.pricing_type === "free") return "Included";
  if (service.price_status === "quote") return "Quote";
  if (service.price_status === "tbd" || service.price_minor == null) return "Price to confirm";
  return `${service.currency || "AUD"} ${(service.price_minor / 100).toFixed(2)}`;
}

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

export default function RoomConnectorPanel() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const [open, setOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [category, setCategory] = useState("all");
  const [aiStates, setAiStates] = useState<CoreAIState[]>([]);
  const [agreeService, setAgreeService] = useState<Service | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<Service | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(services.map((service) => service.category).filter(Boolean))),
    [services],
  );

  const visible = useMemo(
    () => services.filter((service) => category === "all" || service.category === category),
    [services, category],
  );

  async function load() {
    setLoading(true);
    setError("");
    setAiStates(readAiStates());
    try {
      const response = await fetch(`/api/rooms/${roomId}/services`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Unable to load connections");
      setServices(Array.isArray(payload?.services) ? payload.services : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load connections");
    } finally {
      setLoading(false);
    }
  }

  function openConnector() {
    setOpen(true);
    void load();
  }

  function toggleAI(ai: CoreAIState) {
    const button = findAiButton(ai);
    if (!button || button.disabled) {
      setError(`${ai.label} is not available in this Room yet.`);
      return;
    }
    setError("");
    button.click();
    window.requestAnimationFrame(() => setAiStates(readAiStates()));
  }

  async function disconnect(service: Service) {
    setBusyKey(service.service_key);
    setError("");
    try {
      const response = await fetch(`/api/rooms/${roomId}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceKey: service.service_key, action: "disconnect" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Disconnect failed");
      setServices((current) => current.map((item) => item.service_key === service.service_key
        ? { ...item, selection_status: "cancelled", payment_status: "not_required" }
        : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Disconnect failed");
    } finally {
      setBusyKey("");
    }
  }

  async function agreeAndContinue() {
    const service = agreeService;
    if (!service || !agreed) return;
    setBusyKey(service.service_key);
    setError("");
    try {
      const response = await fetch(`/api/rooms/${roomId}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceKey: service.service_key, action: "agree_connect", agree: true }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Connection request failed");
      setServices((current) => current.map((item) => item.service_key === service.service_key
        ? { ...item, selection_status: payload.selectionStatus, payment_status: payload.paymentStatus }
        : item));
      setAgreeService(null);
      setAgreed(false);
      if (payload.paymentRequired) setPaymentNotice(service);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connection request failed");
    } finally {
      setBusyKey("");
    }
  }

  return (
    <>
      <button type="button" onClick={openConnector} title="Connect things to this Room" style={{ position: "fixed", right: 342, bottom: 18, zIndex: 86, display: "flex", alignItems: "center", gap: 7, border: "1px solid #d6ad31", borderRadius: 10, background: "#7b1023", color: "#f6d76b", padding: "9px 14px", fontWeight: 800, boxShadow: "0 6px 18px rgba(0,0,0,.35)", cursor: "pointer" }}>
        <Plug size={17} /> Connect to this Room
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Connect to this Room" style={{ position: "fixed", inset: 0, zIndex: 5000, background: "rgba(0,0,0,.62)", display: "grid", placeItems: "center", padding: 24 }} onMouseDown={(event) => { if (event.target === event.currentTarget && !agreeService && !paymentNotice) setOpen(false); }}>
          <div style={{ width: "min(1000px, 94vw)", maxHeight: "84vh", overflow: "hidden", border: "1px solid #d6ad31", borderRadius: 16, background: "#07111f", color: "#f3f5f7", boxShadow: "0 20px 60px rgba(0,0,0,.55)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", borderBottom: "1px solid rgba(214,173,49,.35)" }}>
              <div>
                <div style={{ color: "#f6d76b", fontSize: 21, fontWeight: 900 }}>이 Room에 연결 / Connect to this Room</div>
                <div style={{ marginTop: 4, color: "#b8c1cf", fontSize: 13 }}>이 창은 방을 찾는 곳이 아닙니다. 지금 열려 있는 이 Room에 AI·업무도구·전문 서비스·전화·파일 등을 연결하는 연결함입니다.</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} style={{ border: 0, background: "transparent", color: "#fff", cursor: "pointer" }}><X size={25} /></button>
            </div>

            <div style={{ overflowY: "auto", maxHeight: "72vh" }}>
              <section style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                <div style={{ fontWeight: 900, color: "#f6d76b", marginBottom: 9 }}>AI 연결 / AI Connections</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
                  {aiStates.map((ai) => (
                    <button key={ai.id} type="button" disabled={!ai.available} onClick={() => toggleAI(ai)} style={{ border: `1px solid ${ai.connected ? "#d6ad31" : "#566273"}`, borderRadius: 9, padding: "10px 8px", background: ai.connected ? "#7b1023" : "#101a29", color: ai.connected ? "#f6d76b" : "#d9e0e8", fontWeight: 850, cursor: ai.available ? "pointer" : "not-allowed", opacity: ai.available ? 1 : .45 }}>
                      <div>{ai.label}</div>
                      <div style={{ marginTop: 3, fontSize: 11, fontWeight: 600 }}>{!ai.available ? "Not available" : ai.connected ? "Connected · click to disconnect" : "Connect"}</div>
                    </button>
                  ))}
                </div>
              </section>

              <section style={{ padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                <div style={{ fontWeight: 900, color: "#f6d76b", marginBottom: 9 }}>기능·서비스 연결 / Service Connections</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => setCategory("all")} style={{ border: "1px solid #566273", borderRadius: 8, padding: "7px 11px", background: category === "all" ? "#7b1023" : "#101a29", color: category === "all" ? "#f6d76b" : "#d9e0e8", cursor: "pointer" }}>전체 / All</button>
                  {categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} style={{ border: "1px solid #566273", borderRadius: 8, padding: "7px 11px", background: category === item ? "#7b1023" : "#101a29", color: category === item ? "#f6d76b" : "#d9e0e8", cursor: "pointer" }}>{item}</button>)}
                </div>
              </section>

              <div style={{ padding: 16 }}>
                {error && <div style={{ marginBottom: 12, padding: 10, border: "1px solid #b54", borderRadius: 8, color: "#ffd2cc" }}>{error}</div>}
                {loading ? <div style={{ padding: 28, textAlign: "center", color: "#b8c1cf" }}>Loading…</div> : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                    {visible.map((service) => {
                      const active = service.default_included || service.selection_status === "active";
                      const pending = service.selection_status === "pending_payment";
                      const planned = service.connection_status === "planned";
                      return (
                        <div key={service.service_key} style={{ border: `1px solid ${active ? "#d6ad31" : "#344154"}`, borderRadius: 12, padding: 14, background: active ? "rgba(214,173,49,.07)" : "#0c1624" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div style={{ fontWeight: 850, color: "#fff" }}>{service.name_ko || service.name_en}</div><div style={{ whiteSpace: "nowrap", color: "#f6d76b", fontSize: 12 }}>{priceLabel(service)}</div></div>
                          {service.name_en && service.name_en !== service.name_ko && <div style={{ color: "#9ea9b8", fontSize: 12, marginTop: 3 }}>{service.name_en}</div>}
                          <div style={{ color: "#bac4d1", fontSize: 13, lineHeight: 1.45, marginTop: 9, minHeight: 38 }}>{service.summary_ko || service.summary_en || "Royal Command Room connection"}</div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 12 }}>
                            <span style={{ fontSize: 12, color: pending ? "#f3c969" : active ? "#7fe3a1" : "#95a1b1" }}>{service.default_included ? "기본 포함" : pending ? "결제 대기 / Pending payment" : planned ? "준비 중" : active ? "연결됨" : "연결 안 됨"}</span>
                            {service.default_included ? null : active ? (
                              <button type="button" disabled={busyKey === service.service_key} onClick={() => void disconnect(service)} style={{ border: "1px solid #9e5360", borderRadius: 8, padding: "7px 12px", background: "#31151c", color: "#ffd7dd", fontWeight: 800, cursor: "pointer" }}>Disconnect</button>
                            ) : pending ? (
                              <button type="button" onClick={() => setPaymentNotice(service)} style={{ border: "1px solid #d6ad31", borderRadius: 8, padding: "7px 12px", background: "#6b4b0b", color: "#ffe9a6", fontWeight: 800, cursor: "pointer" }}>Payment</button>
                            ) : (
                              <button type="button" disabled={busyKey === service.service_key} onClick={() => { setAgreeService(service); setAgreed(false); }} style={{ border: "1px solid #d6ad31", borderRadius: 8, padding: "7px 12px", background: "#7b1023", color: "#f6d76b", fontWeight: 800, cursor: "pointer" }}>Connect</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {agreeService && (
        <div style={{ position: "fixed", inset: 0, zIndex: 5100, background: "rgba(0,0,0,.78)", display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ width: "min(520px,92vw)", border: "1px solid #d6ad31", borderRadius: 14, background: "#081322", color: "#fff", padding: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#f6d76b" }}>연결 동의 / Agreement</div>
            <div style={{ marginTop: 12, fontWeight: 800 }}>{agreeService.name_ko || agreeService.name_en}</div>
            <label style={{ display: "flex", gap: 9, marginTop: 16 }}><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /><span>이 기능을 이 Room에 연결하는 것과 표시된 요금 및 Royal Command 서비스 약관에 동의합니다.</span></label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button type="button" onClick={() => { setAgreeService(null); setAgreed(false); }} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #566273", background: "#142033", color: "#fff" }}>Cancel</button>
              <button type="button" disabled={!agreed || busyKey === agreeService.service_key} onClick={() => void agreeAndContinue()} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #d6ad31", background: "#7b1023", color: "#f6d76b", fontWeight: 800, opacity: agreed ? 1 : .5 }}>{agreeService.payment_required ? "Agree & Pay" : "Agree & Connect"}</button>
            </div>
          </div>
        </div>
      )}

      {paymentNotice && (
        <div style={{ position: "fixed", inset: 0, zIndex: 5200, background: "rgba(0,0,0,.8)", display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ width: "min(520px,92vw)", border: "1px solid #d6ad31", borderRadius: 14, background: "#081322", color: "#fff", padding: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#f6d76b" }}>결제 / Payment</div>
            <div style={{ marginTop: 12, fontWeight: 800 }}>{paymentNotice.name_ko || paymentNotice.name_en}</div>
            <div style={{ marginTop: 8, color: "#bdc7d4" }}>{priceLabel(paymentNotice)}</div>
            <div style={{ marginTop: 14, color: "#ffe6a0", lineHeight: 1.5 }}>현재 결제업체가 아직 연결되지 않아 실제 결제는 받을 수 없습니다. 결제 성공이 서버에서 확인되기 전에는 이 기능이 활성화되지 않습니다.</div>
            <div style={{ textAlign: "right", marginTop: 18 }}><button type="button" onClick={() => setPaymentNotice(null)} style={{ background: "#7b1023", color: "#f6d76b", border: "1px solid #d6ad31", borderRadius: 8, padding: "8px 14px" }}>OK</button></div>
          </div>
        </div>
      )}
    </>
  );
}
