"use client";

import { useEffect, useMemo, useState } from "react";
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
  agreement_required?: boolean;
  terms_version?: string;
  payment_required?: boolean;
  payment_status?: string;
  selection_status: "selected" | "pending_payment" | "active" | "paused" | "cancelled";
};

function isActive(status: Service["selection_status"]) {
  return status === "active";
}

function priceLabel(service: Service) {
  if (service.default_included || service.pricing_type === "free") return "Included";
  if (service.price_status === "quote") return "Quote";
  if (service.price_status === "tbd" || service.price_minor == null) return "Price to confirm";
  const currency = service.currency || "AUD";
  return `${currency} ${(service.price_minor / 100).toFixed(2)}`;
}

export default function RoomConnectionManager() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const [open, setOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [category, setCategory] = useState("all");
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

  useEffect(() => {
    if (open) void load();
  }, [open, roomId]);

  function openRoomUtility(target: "sites" | "ai-help") {
    const selector = target === "sites"
      ? 'button[title="My Sites"], button[title="Accounting Sites"]'
      : 'button[title="AI Help"]';
    const button = document.querySelector<HTMLButtonElement>(selector);
    if (!button) {
      setError(target === "sites" ? "My Sites is not available in this Room." : "AI Help is not available in this Room.");
      return;
    }
    setOpen(false);
    window.requestAnimationFrame(() => button.click());
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
      <button type="button" onClick={() => setOpen(true)} title="Connect or disconnect Room services" style={{ position: "fixed", right: 342, bottom: 18, zIndex: 86, display: "flex", alignItems: "center", gap: 7, border: "1px solid #d6ad31", borderRadius: 10, background: "#7b1023", color: "#f6d76b", padding: "9px 14px", fontWeight: 800, boxShadow: "0 6px 18px rgba(0,0,0,.35)", cursor: "pointer" }}>
        <Plug size={17} /> 연결 관리 / Connections
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Room connections" style={{ position: "fixed", inset: 0, zIndex: 5000, background: "rgba(0,0,0,.62)", display: "grid", placeItems: "center", padding: 24 }} onMouseDown={(event) => { if (event.target === event.currentTarget && !agreeService && !paymentNotice) setOpen(false); }}>
          <div style={{ width: "min(980px, 94vw)", maxHeight: "84vh", overflow: "hidden", border: "1px solid #d6ad31", borderRadius: 16, background: "#07111f", color: "#f3f5f7", boxShadow: "0 20px 60px rgba(0,0,0,.55)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", borderBottom: "1px solid rgba(214,173,49,.35)" }}>
              <div><div style={{ color: "#f6d76b", fontSize: 21, fontWeight: 900 }}>연결 관리 / Connections</div><div style={{ marginTop: 4, color: "#b8c1cf", fontSize: 13 }}>기능만 선택하세요. 공급업체 연결은 Royal Command가 처리합니다.</div></div>
              <button type="button" onClick={() => setOpen(false)} style={{ border: 0, background: "transparent", color: "#fff", cursor: "pointer" }}><X size={25} /></button>
            </div>

            <div role="tablist" aria-label="Room utility sections" style={{ padding: "10px 18px", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, borderBottom: "1px solid rgba(214,173,49,.25)", background: "#091522" }}>
              <button type="button" role="tab" aria-selected="true" style={{ border: "1px solid #d6ad31", borderRadius: 9, padding: "9px 10px", background: "#7b1023", color: "#f6d76b", fontWeight: 850, cursor: "default" }}>연결 관리 / Connections</button>
              <button type="button" role="tab" aria-selected="false" onClick={() => openRoomUtility("sites")} style={{ border: "1px solid #566273", borderRadius: 9, padding: "9px 10px", background: "#101a29", color: "#d9e0e8", fontWeight: 800, cursor: "pointer" }}>사이트 / My Sites</button>
              <button type="button" role="tab" aria-selected="false" onClick={() => openRoomUtility("ai-help")} style={{ border: "1px solid #566273", borderRadius: 9, padding: "9px 10px", background: "#101a29", color: "#d9e0e8", fontWeight: 800, cursor: "pointer" }}>AI Help</button>
            </div>

            <div style={{ padding: "12px 18px", display: "flex", gap: 8, flexWrap: "wrap", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
              <button type="button" onClick={() => setCategory("all")} style={{ border: "1px solid #566273", borderRadius: 8, padding: "7px 11px", background: category === "all" ? "#7b1023" : "#101a29", color: category === "all" ? "#f6d76b" : "#d9e0e8", cursor: "pointer" }}>전체 / All</button>
              {categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} style={{ border: "1px solid #566273", borderRadius: 8, padding: "7px 11px", background: category === item ? "#7b1023" : "#101a29", color: category === item ? "#f6d76b" : "#d9e0e8", cursor: "pointer" }}>{item}</button>)}
            </div>

            <div style={{ overflowY: "auto", maxHeight: "62vh", padding: 16 }}>
              {error && <div style={{ marginBottom: 12, padding: 10, border: "1px solid #b54", borderRadius: 8, color: "#ffd2cc" }}>{error}</div>}
              {loading ? <div style={{ padding: 28, textAlign: "center", color: "#b8c1cf" }}>Loading…</div> : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                  {visible.map((service) => {
                    const active = service.default_included || isActive(service.selection_status);
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
      )}

      {agreeService && (
        <div style={{ position: "fixed", inset: 0, zIndex: 5100, background: "rgba(0,0,0,.78)", display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ width: "min(520px,92vw)", maxHeight: "80vh", overflowY: "auto", border: "1px solid #d6ad31", borderRadius: 14, background: "#081322", color: "#fff", padding: 20, boxShadow: "0 24px 70px rgba(0,0,0,.65)" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#f6d76b" }}>연결 동의 / Agreement</div>
            <div style={{ marginTop: 12, fontWeight: 800 }}>{agreeService.name_ko || agreeService.name_en}</div>
            <div style={{ marginTop: 8, color: "#bdc7d4", lineHeight: 1.5 }}>이 기능을 이 Room에 추가하는 것과 표시된 요금 및 Royal Command 서비스 약관에 동의합니다.</div>
            <label style={{ display: "flex", gap: 9, marginTop: 16, alignItems: "flex-start" }}><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /><span>동의합니다 / I Agree</span></label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button type="button" onClick={() => { setAgreeService(null); setAgreed(false); }} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #566273", background: "#142033", color: "#fff" }}>Cancel</button>
              <button type="button" disabled={!agreed || busyKey === agreeService.service_key} onClick={() => void agreeAndContinue()} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #d6ad31", background: "#7b1023", color: "#f6d76b", fontWeight: 800, opacity: agreed ? 1 : .5 }}>{agreeService.payment_required ? "Agree & Pay" : "Agree & Connect"}</button>
            </div>
          </div>
        </div>
      )}

      {paymentNotice && (
        <div style={{ position: "fixed", inset: 0, zIndex: 5200, background: "rgba(0,0,0,.8)", display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ width: "min(520px,92vw)", maxHeight: "80vh", overflowY: "auto", border: "1px solid #d6ad31", borderRadius: 14, background: "#081322", color: "#fff", padding: 20, boxShadow: "0 24px 70px rgba(0,0,0,.65)" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#f6d76b" }}>결제 / Payment</div>
            <div style={{ marginTop: 12, fontWeight: 800 }}>{paymentNotice.name_ko || paymentNotice.name_en}</div>
            <div style={{ marginTop: 8, color: "#bdc7d4" }}>{priceLabel(paymentNotice)}</div>
            <div style={{ marginTop: 14, padding: 12, border: "1px solid #6d5b2b", borderRadius: 9, background: "#161407", color: "#ffe6a0", lineHeight: 1.5 }}>결제 시스템 연결 전입니다. 현재는 결제 대기 상태로만 저장되며 실제 연결은 활성화되지 않습니다. 결제업체가 연결되면 이 창에서 결제하고, 서버가 결제 성공을 확인한 뒤 자동으로 활성화됩니다.</div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}><button type="button" onClick={() => setPaymentNotice(null)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #d6ad31", background: "#7b1023", color: "#f6d76b", fontWeight: 800 }}>OK</button></div>
          </div>
        </div>
      )}
    </>
  );
}
