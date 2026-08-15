"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";

function makeRequestId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `rc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

async function reportIncident(payload: Record<string, unknown>) {
  try {
    await fetch("/api/monitoring/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Never let monitoring crash the Room.
  }
}

export default function RoomIncidentMonitor() {
  const params = useParams<{ id: string }>();
  const roomId = params?.id;

  useEffect(() => {
    if (!roomId) return;

    const base = () => ({
      roomId,
      url: location.href,
      userAgent: navigator.userAgent,
      visibilityState: document.visibilityState,
      requestId: makeRequestId(),
    });

    const onError = (event: ErrorEvent) => {
      void reportIncident({
        ...base(),
        severity: "P1",
        eventType: "window_error",
        message: event.message || "Unhandled browser error",
        errorName: event.error?.name || "Error",
        stack: event.error?.stack || null,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      void reportIncident({
        ...base(),
        severity: "P1",
        eventType: "unhandled_promise_rejection",
        message: reason instanceof Error ? reason.message : String(reason ?? "Unhandled promise rejection"),
        errorName: reason instanceof Error ? reason.name : "PromiseRejection",
        stack: reason instanceof Error ? reason.stack : null,
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    const heartbeat = window.setInterval(() => {
      const root = document.querySelector(".royal-room-layout");
      const main = document.querySelector(".royal-room-main");
      if (!root || !main) {
        void reportIncident({
          ...base(),
          severity: "P1",
          eventType: "room_dom_missing",
          message: "Royal Command Room root DOM is missing while the page is still active.",
        });
      }
    }, 15000);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.clearInterval(heartbeat);
    };
  }, [roomId]);

  return null;
}
