"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function requestUrl(input: RequestInfo | URL) {
  try {
    if (typeof input === "string") return new URL(input, window.location.origin);
    if (input instanceof URL) return input;
    return new URL(input.url, window.location.origin);
  } catch {
    return null;
  }
}

function selectedAiCount() {
  return Array.from(document.querySelectorAll<HTMLButtonElement>("button[title]"))
    .filter((button) => !button.title.startsWith("AI Warehouse"))
    .filter((button) => button.id !== "rc-council-mode-toggle")
    .filter((button) => button.className.includes('bg-[#7A0C2E]'))
    .length;
}

function latestUserQuestion() {
  const items = Array.from(document.querySelectorAll<HTMLButtonElement>('button[title="클릭하면 전체 내용을 봅니다"]'));
  return (items.at(-1)?.textContent || "").trim();
}

function setReactTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  setter?.call(textarea, value);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.dispatchEvent(new Event("change", { bubbles: true }));
}

function findAiDock() {
  const warehouse = document.querySelector<HTMLButtonElement>('button[title^="AI Warehouse"]');
  return warehouse?.parentElement instanceof HTMLElement ? warehouse.parentElement : null;
}

export default function CouncilModeToggle() {
  const [mounted, setMounted] = useState(false);
  const [dock, setDock] = useState<HTMLElement | null>(null);
  const [status, setStatus] = useState<"hold" | "requested" | "need-ai" | "no-question">("hold");
  const oneShotCouncilRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
          const runCouncil = oneShotCouncilRef.current;
          parsed.councilMode = runCouncil ? "on" : "off";
          oneShotCouncilRef.current = false;
          return originalFetch(input, { ...init, body: JSON.stringify(parsed) });
        } catch {
          oneShotCouncilRef.current = false;
          return originalFetch(input, init);
        }
      }

      return originalFetch(input, init);
    };

    window.fetch = patchedFetch;
    return () => {
      if (window.fetch === patchedFetch) window.fetch = originalFetch;
    };
  }, [mounted]);

  function runCouncilOnce() {
    if (status !== "hold") return;

    if (selectedAiCount() < 2) {
      setStatus("need-ai");
      window.setTimeout(() => setStatus("hold"), 1800);
      return;
    }

    const question = latestUserQuestion();
    if (!question) {
      setStatus("no-question");
      window.setTimeout(() => setStatus("hold"), 1800);
      return;
    }

    const textarea = document.querySelector<HTMLTextAreaElement>('textarea[placeholder^="Type or speak your order"]');
    const sendButton = document.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!textarea || !sendButton) return;

    oneShotCouncilRef.current = true;
    setStatus("requested");

    setReactTextareaValue(
      textarea,
      `Council synthesis request. Review the original question below with the currently selected AIs and return one final Council answer only.\n\nOriginal question:\n${question}`,
    );

    window.setTimeout(() => sendButton.click(), 80);
    window.setTimeout(() => setStatus("hold"), 2600);
  }

  if (!mounted || !dock) return null;

  const label = status === "requested"
    ? "Council Run"
    : status === "need-ai"
      ? "Need 2 AIs"
      : status === "no-question"
        ? "No Question"
        : "Council Hold";

  return createPortal(
    <button
      id="rc-council-mode-toggle"
      type="button"
      onClick={runCouncilOnce}
      disabled={status !== "hold"}
      aria-label="Council Hold. Click to run Council once for the latest question."
      title="Council is held by default. After individual AI answers arrive, click once to run Council on the latest question."
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
        border: "2px solid #22c55e",
        background: status === "requested" ? "#16a34a" : "#064e3b",
        color: "#f0fdf4",
        fontSize: 10,
        fontWeight: 800,
        lineHeight: 1,
        boxShadow: status === "requested" ? "0 0 10px rgba(34,197,94,.65)" : "0 0 4px rgba(34,197,94,.28)",
        cursor: status === "hold" ? "pointer" : "default",
        opacity: status === "hold" || status === "requested" ? 1 : 0.88,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>,
    dock,
  );
}
