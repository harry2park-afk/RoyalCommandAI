"use client";

import { useEffect, useState } from "react";
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
  payment_required?: boolean;
  payment_status?: string;
  selection_status: "selected" | "pending_payment" | "active" | "paused" | "cancelled";
};

function priceLabel(service: Service) {
  if (service.default_included || service.pricing_type === "free") return "Included";
  if (service.price_status === "quote") return "Quote";
  if (service.price_status === "tbd" || service.price_minor == null) return "Price to confirm";
  return `${service.currency || "AUD"} ${(service.price_minor / 100).toFixed(2)}`;
}

export default function RCAConnectionManager() {
  const [open, setOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [agreeService, setAgreeService] = useState<Service | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [paymentService, setPaymentService] = useState<Service | null>(null);
  const [busy, setBusy] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/rca/services", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Unable to load RCA connections");
      setServices(Array.isArray(payload?.services) ? payload.services : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load RCA connections");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (open) void load(); }, [open]);

  async function update(service: Service, action: "agree_connect" | "disconnect") {
    setBusy(service.service_key);
    setError("");
    try {
      const response = await fetch("/api/rca/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceKey: service.service_key, action, agree: action === "agree_connect" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Update failed");
      setServices((current) => current.map((item) => item.service_key === service.service_key
        ? { ...item, selection_status: payload.selectionStatus, payment_status: payload.paymentStatus }
        : item));
      if (action === "agree_connect" && payload.paymentRequired) setPaymentService(service);
      setAgreeService(null);
      setAgreed(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Update failed");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={{ position: "fixed", right: 18, bottom: 18, zIndex: 190, display: "flex", alignItems: "center", gap: 7, border: "1px solid #d6ad31", borderRadius: 10, background: "#7b1023", color: "#f6d76b", padding: "9px 14px", fontWeight: 800, cursor: "pointer" }}>
        <Plug size={17} /> RCA Connections
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 210, background: "rgba(0,0,0,.68)", display: "grid", placeItems: "center", padding: 24 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <div style={{ width: "min(760px,94vw)", maxHeight: "82vh", overflow: "hidden", border: "1px solid #d6ad31", borderRadius: 14, background: "#07111f", color: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 18, borderBottom: "1px solid rgba(214,173,49,.35)" }}>
              <div><div style={{ color: "#f6d76b", fontSize: 20, fontWeight: 900 }}>RCA 채팅룸 공통 연결</div><div style={{ color: "#b8c1cf", fontSize: 13, marginTop: 4 }}>RCA에서 공통으로 사용하는 기능만 표시됩니다.</div></div>
              <button type="button" onClick={() => setOpen(false)} style={{ border: 0, background: "transparent", color: "#fff" }}><X /></button>
            </div>
            <div style={{ padding: 16, overflowY: "auto", maxHeight: "65vh" }}>
              {error && <div style={{ marginBottom: 12, color: "#ffd2cc" }}>{error}</div>}
              {loading ? <div>Loading…</div> : services.length === 0 ? <div style={{ color: "#b8c1cf" }}>현재 RCA 공통 연결 항목이 없습니다.</div> : services.map((service) => {
                const active = service.default_included || service.selection_status === "active";
                const pending = service.selection_status === "pending_payment";
                return (
                  <div key={service.service_key} style={{ border: "1px solid #344154", borderRadius: 10, padding: 14, marginBottom: 10, background: "#0c1624" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><strong>{service.name_ko || service.name_en}</strong><span style={{ color: "#f6d76b", fontSize: 12 }}>{priceLabel(service)}</span></div>
                    <div style={{ color: "#b8c1cf", marginTop: 6, fontSize: 13 }}>{service.summary_ko || service.summary_en || "RCA common service"}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                      <span style={{ fontSize: 12, color: pending ? "#f3c969" : active ? "#7fe3a1" : "#95a1b1" }}>{service.default_included ? "기본 포함" : pending ? "결제 대기" : active ? "연결됨" : "연결 안 됨"}</span>
                      {service.default_included ? null : active ? <button type="button" disabled={busy === service.service_key} onClick={() => void update(service, "disconnect")} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #9e5360", background: "#31151c", color: "#ffd7dd" }}>Disconnect</button> : pending ? <button type="button" onClick={() => setPaymentService(service)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #d6ad31", background: "#6b4b0b", color: "#ffe9a6" }}>Payment</button> : <button type="button" onClick={() => { setAgreeService(service); setAgreed(false); }} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #d6ad31", background: "#7b1023", color: "#f6d76b" }}>Connect</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {agreeService && (
        <div style={{ position: "fixed", inset: 0, zIndex: 230, background: "rgba(0,0,0,.74)", display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ width: "min(500px,92vw)", border: "1px solid #d6ad31", borderRadius: 14, background: "#081322", color: "#fff", padding: 20 }}>
            <div style={{ fontWeight: 900, color: "#f6d76b", fontSize: 20 }}>Agreement</div>
            <div style={{ marginTop: 12 }}>{agreeService.name_ko || agreeService.name_en}</div>
            <label style={{ display: "flex", gap: 8, marginTop: 16 }}><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /><span>이 기능의 요금과 Royal Command 서비스 약관에 동의합니다.</span></label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}><button type="button" onClick={() => setAgreeService(null)}>Cancel</button><button type="button" disabled={!agreed || busy === agreeService.service_key} onClick={() => void update(agreeService, "agree_connect")} style={{ background: "#7b1023", color: "#f6d76b", border: "1px solid #d6ad31", borderRadius: 8, padding: "8px 14px", opacity: agreed ? 1 : .5 }}>{agreeService.payment_required ? "Agree & Pay" : "Agree & Connect"}</button></div>
          </div>
        </div>
      )}

      {paymentService && (
        <div style={{ position: "fixed", inset: 0, zIndex: 240, background: "rgba(0,0,0,.76)", display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ width: "min(500px,92vw)", border: "1px solid #d6ad31", borderRadius: 14, background: "#081322", color: "#fff", padding: 20 }}>
            <div style={{ fontWeight: 900, color: "#f6d76b", fontSize: 20 }}>Payment</div>
            <div style={{ marginTop: 12 }}>{paymentService.name_ko || paymentService.name_en} · {priceLabel(paymentService)}</div>
            <div style={{ marginTop: 14, color: "#ffe6a0", lineHeight: 1.5 }}>현재 결제업체가 아직 연결되지 않아 실제 결제는 받을 수 없습니다. 상태는 결제 대기로 유지되며, 서버가 결제 성공을 확인하기 전에는 활성화되지 않습니다.</div>
            <div style={{ textAlign: "right", marginTop: 18 }}><button type="button" onClick={() => setPaymentService(null)} style={{ background: "#7b1023", color: "#f6d76b", border: "1px solid #d6ad31", borderRadius: 8, padding: "8px 14px" }}>OK</button></div>
          </div>
        </div>
      )}
    </>
  );
}
