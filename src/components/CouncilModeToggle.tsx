"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "next/navigation";

type CouncilMode = "off" | "on";

type Position = {
  top: number;
  left: number;
  visible: boolean;
};

function requestUrl(input: RequestInfo | URL) {
  try {
    if (typeof input === "string") return new URL(input, window.location.origin);
    if (input instanceof URL) return input;
    return new URL(input.url, window.location.origin);
  } catch {
    return null;
  }
}

export default function CouncilModeToggle() {
  const params = useParams<{ id: string }>();
  const roomId = params?.id || "room";
  const storageKey = useMemo(() => `royalcommand:room:${roomId}:council-mode`, [roomId]);
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<CouncilMode>("off");
  const [position, setPosition] = useState<Position>({ top: -9999, left: -9999, visible: false });

  useEffect(() => {
    setMounted(true);
    try {
      setMode(localStorage.getItem(storageKey) === "on" ? "on" : "off");
    } catch {
      setMode("off");
    }
  }, [storageKey]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(storageKey, mode);
    } catch {}
  }, [mounted, mode, storageKey]);

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

  useEffect(() => {
    if (!mounted) return;

    let frame = 0;
    const place = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const warehouse = document.querySelector<HTMLButtonElement>('button[title^="AI Warehouse"]');
        if (!warehouse) {
          setPosition((prev) => prev.visible ? { ...prev, visible: false } : prev);
          return;
        }

        const rect = warehouse.getBoundingClientRect();
        const width = 94;
        const gap = 6;
        const desiredLeft = rect.right + gap;
        const maxLeft = Math.max(4, window.innerWidth - width - 4);
        const left = Math.min(desiredLeft, maxLeft);

        setPosition({
          top: rect.top,
          left,
          visible: rect.width > 0 && rect.height > 0,
        });
      });
    };

    place();
    const observer = new MutationObserver(place);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.cancelAnimationFrame(frame);
    };
  }, [mounted]);

  if (!mounted) return null;

  const on = mode === "on";
  return createPortal(
    <button
      id="rc-council-mode-toggle"
      type="button"
      onClick={() => setMode((current) => current === "on" ? "off" : "on")}
      aria-pressed={on}
      title={on ? "Council ON — 선택된 AI 답변을 Council로 통합" : "Council OFF — 각 AI가 독립적으로 답변"}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        zIndex: 195,
        display: position.visible ? "flex" : "none",
        height: 32,
        width: 94,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 6,
        border: on ? "2px solid #86efac" : "2px solid #22c55e",
        background: on ? "#16a34a" : "#064e3b",
        color: "#f0fdf4",
        fontSize: 10,
        fontWeight: 800,
        lineHeight: 1,
        boxShadow: on ? "0 0 10px rgba(34,197,94,.65)" : "0 0 4px rgba(34,197,94,.28)",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {on ? "Council ON" : "Council OFF"}
    </button>,
    document.body,
  );
}
