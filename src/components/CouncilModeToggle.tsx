"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "next/navigation";

type CouncilMode = "off" | "on";

function requestUrl(input: RequestInfo | URL) {
  try {
    if (typeof input === "string") return new URL(input, window.location.origin);
    if (input instanceof URL) return input;
    return new URL(input.url, window.location.origin);
  } catch {
    return null;
  }
}

function findAiDock() {
  const warehouse = document.querySelector<HTMLButtonElement>('button[title^="AI Warehouse"]');
  return warehouse?.parentElement instanceof HTMLElement ? warehouse.parentElement : null;
}

export default function CouncilModeToggle() {
  const params = useParams<{ id: string }>();
  const roomId = params?.id || "room";
  const storageKey = useMemo(() => `royalcommand:room:${roomId}:council-mode`, [roomId]);
  const [mounted, setMounted] = useState(false);
  const [dock, setDock] = useState<HTMLElement | null>(null);
  const [mode, setMode] = useState<CouncilMode>("off");

  useEffect(() => {
    setMounted(true);
    try {
      setMode(window.localStorage.getItem(storageKey) === "on" ? "on" : "off");
    } catch {
      setMode("off");
    }
  }, [storageKey]);

  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(storageKey, mode);
    } catch {}
  }, [mounted, mode, storageKey]);

  useEffect(() => {
    if (!mounted) return;

    const locate = () => setDock(findAiDock());
    locate();
    const observer = new MutationObserver(locate);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    const originalFetch = window.fetch.bind(window);
    const patchedFetch: typeof window.fetch = async (input, init) => {
      const url = requestUrl(input);
      const method = String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();

      if (url?.pathname === "/api/ai/chat/stream" && method === "POST" && typeof init?.body === "string") {
        try {
          const parsed = JSON.parse(init.body) as Record<string, unknown>;
          parsed.councilMode = mode;
          return originalFetch(input, { ...init, body: JSON.stringify(parsed) });
        } catch {
          return originalFetch(input, init);
        }
      }

      return originalFetch(input, init);
    };

    window.fetch = patchedFetch;
    return () => {
      if (window.fetch === patchedFetch) window.fetch = originalFetch;
    };
  }, [mounted, mode]);

  if (!mounted || !dock) return null;

  const on = mode === "on";

  return createPortal(
    <button
      id="rc-council-mode-toggle"
      type="button"
      onClick={() => setMode((current) => current === "on" ? "off" : "on")}
      aria-pressed={on}
      aria-label={on ? "Council ON. Click to stop Council." : "Council Stop. Click to turn Council on."}
      title={on ? "Council ON — click to stop Council" : "Council STOP — click only when Council is needed"}
      style={{
        position: "relative",
        zIndex: 1,
        display: "inline-flex",
        flex: "0 0 auto",
        height: 30,
        minWidth: 104,
        padding: "2px 10px",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 6,
        border: on ? "2px solid #22c55e" : "2px solid #ef4444",
        background: on ? "#166534" : "#991b1b",
        color: "#ffffff",
        fontSize: 10,
        fontWeight: 800,
        lineHeight: 1,
        boxShadow: on ? "0 0 8px rgba(34,197,94,.5)" : "0 0 7px rgba(239,68,68,.45)",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {on ? "Council ON" : "Council Stop"}
    </button>,
    dock,
  );
}
