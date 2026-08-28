"use client";

import { useEffect } from "react";

type ModelStatus = "working" | "done" | "failed" | "cancelled";

const MODEL_NAMES: Record<string, string> = {
  "openai:gpt-5.6-sol": "GPT-5.6 Sol",
  "google:gemini-3.7-flash": "Gemini 3.7 Flash",
  "xai:grok-4.5": "Grok 4.5",
};

const STYLE_ID = "rc-integrated-per-model-style";

export default function IntegratedAnswerPerModelStatus() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    const states = new Map<string, ModelStatus>();

    const ensureStyle = () => {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
        @keyframes rcIntegratedRowSpin { to { transform: rotate(360deg); } }
        [data-rc-integrated-row-status="working"]::before {
          content: "";
          width: 11px;
          height: 11px;
          flex: 0 0 11px;
          border: 2px solid rgba(52,211,153,.28);
          border-top-color: #6ee7b7;
          border-radius: 9999px;
          animation: rcIntegratedRowSpin .72s linear infinite;
        }
      `;
      document.head.appendChild(style);
    };

    const updateRows = () => {
      ensureStyle();
      const modal = Array.from(document.querySelectorAll<HTMLElement>("div.fixed.inset-0")).find((node) =>
        (node.textContent || "").includes("Integrated Answer") && (node.textContent || "").includes("Not Connected"),
      );
      if (!modal) return;

      for (const [modelId, status] of states) {
        const name = MODEL_NAMES[modelId];
        if (!name) continue;
        const row = Array.from(modal.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
          (button.textContent || "").includes(name),
        );
        if (!row) continue;

        const badges = Array.from(row.querySelectorAll<HTMLSpanElement>("span"));
        const badge = badges.find((span) => {
          const text = (span.textContent || "").trim();
          return text === "Connected" || text === "Working..." || text === "Done" || text === "Failed" || text === "Cancelled";
        });
        if (!badge) continue;

        badge.dataset.rcIntegratedRowStatus = status;
        badge.classList.add("inline-flex", "items-center", "gap-1");

        if (status === "working") badge.textContent = "Working...";
        if (status === "done") badge.textContent = "Done";
        if (status === "failed") badge.textContent = "Failed";
        if (status === "cancelled") badge.textContent = "Cancelled";
      }
    };

    const setStatus = (modelId: string, status: ModelStatus) => {
      states.set(modelId, status);
      queueMicrotask(updateRows);
    };

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (!url.includes("/api/ai/integrated-answer")) return originalFetch(input, init);

      let modelId = "";
      try {
        if (typeof init?.body === "string") {
          const payload = JSON.parse(init.body) as { modelId?: unknown };
          if (typeof payload.modelId === "string") modelId = payload.modelId;
        }
      } catch {}

      if (modelId) setStatus(modelId, "working");

      try {
        const response = await originalFetch(input, init);
        if (modelId) setStatus(modelId, response.ok ? "done" : "failed");
        return response;
      } catch (error) {
        if (modelId) {
          const aborted = init?.signal?.aborted || (error instanceof DOMException && error.name === "AbortError");
          setStatus(modelId, aborted ? "cancelled" : "failed");
        }
        throw error;
      }
    };

    const observer = new MutationObserver(updateRows);
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    updateRows();

    return () => {
      window.fetch = originalFetch;
      observer.disconnect();
      document.getElementById(STYLE_ID)?.remove();
    };
  }, []);

  return null;
}
