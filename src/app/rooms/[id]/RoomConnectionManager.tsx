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
  selection_status: "selected" | "pending_payment" | "active" | "paused" | "cancelled";
};

function isChosen(status: Service["selection_status"]) {
  return status === "selected" || status === "pending_payment" || status === "active" || status === "paused";
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

  async function change(service: Service, action: "connect" | "disconnect") {
    setBusyKey(service.service_key);
    setError("");
    try {
      const response = await fetch(`/api/rooms/${roomId}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceKey: service.service_key, action }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Connection update failed");
      setServices((current) => current.map((item) => item.service_key === service.service_key
        ? { ...item, selection_status: payload.selectionStatus }
        : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connection update failed");
    } finally {
      setBusyKey("");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Connect or disconnect Room services"
        style={{
          position: "fixed",
          right: 342,
          bottom: 18,
          zIndex: 86,
          display: "flex",
          alignItems: "center",
          gap: 7,
          border: "1px solid #d6ad31",
          borderRadius: 10,
          background: "#7b1023",
          color: "#f6d76b",
          padding: "9px 14px",
          fontWeight: 800,
          boxShadow: "0 6px 18px rgba(0,0,0,.35)",
          cursor: "pointer",
        }}
      >
        <Plug size={17} /> 연결 관리 / Connections
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Room connections"
          style={{ position: "fixed", inset: 0, zIndex: 180, background: "rgba(0,0,0,.62)", display: "grid", placeItems: "center", padding: 24 }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        >
          <div style={{ width: "min(980px, 94vw)", maxHeight: "84vh", overflow: "hidden", border: "1px solid #d6ad31", borderRadius: 16, background: "#07111f", color: "#f3f5f7", boxShadow: "0 20px 60px rgba(0,0,0,.55)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", borderBottom: "1px solid rgba(214,173,49,.35)" }}>
              <div>
                <div style={{ color: "#f6d76b", fontSize: 21, fontWeight: 900 }}>연결 관리 / Connections</div>
                <div style={{ marginTop: 4, color: "#b8c1cf", fontSize: 13 }}>원하는 기능만 선택하세요. 공급업체 연결은 Royal Command가 처리합니다.</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} style={{ border: 0, background: "transparent", color: "#fff", cursor: "pointer" }}><X size={25} /></button>
            </div>

            <div style={{ padding: "12px 18px", display: "flex", gap: 8, flexWrap: "wrap", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
              <button type="button" onClick={() => setCategory("all")} style={{ border: "1px solid #566273", borderRadius: 8, padding: "7px 11px", background: category === "all" ? "#7b1023" : "#101a29", color: category === "all" ? "#f6d76b" : "#d9e0e8", cursor: "pointer" }}>전체 / All</button>
              {categories.map((item) => (
                <button key={item} type="button" onClick={() => setCategory(item)} style={{ border: "1px solid #566273", borderRadius: 8, padding: "7px 11px", background: category === item ? "#7b1023" : "#101a29", color: category === item ? "#f6d76b" : "#d9e0e8", cursor: "pointer" }}>{item}</button>
              ))}
            </div>

            <div style={{ overflowY: "auto", maxHeight: "62vh", padding: 16 }}>
              {error && <div style={{ marginBottom: 12, padding: 10, border: "1px solid #b54", borderRadius: 8, color: "#ffd2cc" }}>{error}</div>}
              {loading ? (
                <div style={{ padding: 28, textAlign: "center", color: "#b8c1cf" }}>Loading…</div>
              ) : visible.length === 0 ? (
                <div style={{ padding: 28, textAlign: "center", color: "#b8c1cf" }}>No services found.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                  {visible.map((service) => {
                    const chosen = service.default_included || isChosen(service.selection_status);
                    const planned = service.connection_status === "planned";
                    return (
                      <div key={service.service_key} style={{ border: `1px solid ${chosen ? "#d6ad31" : "#344154"}`, borderRadius: 12, padding: 14, background: chosen ? "rgba(214,173,49,.07)" : "#0c1624" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <div style={{ fontWeight: 850, color: "#fff" }}>{service.name_ko || service.name_en}</div>
                          <div style={{ whiteSpace: "nowrap", color: "#f6d76b", fontSize: 12 }}>{priceLabel(service)}</div>
                        </div>
                        {service.name_en && service.name_en !== service.name_ko && <div style={{ color: "#9ea9b8", fontSize: 12, marginTop: 3 }}>{service.name_en}</div>}
                        <div style={{ color: "#bac4d1", fontSize: 13, lineHeight: 1.45, marginTop: 9, minHeight: 38 }}>{service.summary_ko || service.summary_en || "Royal Command Room connection"}</div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 12 }}>
                          <span style={{ fontSize: 12, color: planned ? "#d8ba67" : chosen ? "#7fe3a1" : "#95a1b1" }}>
                            {service.default_included ? "기본 포함" : planned && chosen ? "연결 선택됨 · 준비 중" : planned ? "준비 중" : chosen ? "연결됨" : "연결 안 됨"}
                          </span>
                          {service.default_included ? null : (
                            <button
                              type="button"
                              disabled={busyKey === service.service_key}
                              onClick={() => void change(service, chosen ? "disconnect" : "connect")}
                              style={{ border: `1px solid ${chosen ? "#9e5360" : "#d6ad31"}`, borderRadius: 8, padding: "7px 12px", background: chosen ? "#31151c" : "#7b1023", color: chosen ? "#ffd7dd" : "#f6d76b", fontWeight: 800, cursor: busyKey === service.service_key ? "wait" : "pointer" }}
                            >
                              {busyKey === service.service_key ? "…" : chosen ? "Disconnect" : "Connect"}
                            </button>
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
    </>
  );
}
