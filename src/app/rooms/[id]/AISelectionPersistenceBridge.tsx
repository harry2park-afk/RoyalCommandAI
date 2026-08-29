"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";

const AI_NAME_TO_ID: Array<[RegExp, string]> = [
  [/\bChatGPT\b/i, "openai"],
  [/\bClaude\b/i, "anthropic"],
  [/\bGemini\b/i, "google"],
  [/\bGrok\b/i, "xai"],
  [/\bCodex\b/i, "codex"],
  [/\bDeepSeek\b/i, "deepseek"],
  [/\bPerplexity\b/i, "perplexity"],
  [/\bMistral\b/i, "mistral"],
  [/\bLlama\b/i, "meta"],
  [/\bQwen\b/i, "qwen"],
];

function providerId(button: HTMLButtonElement) {
  const raw = `${button.getAttribute("title") || ""} ${button.textContent || ""}`;
  return AI_NAME_TO_ID.find(([pattern]) => pattern.test(raw))?.[1] || "";
}

function isActive(button: HTMLButtonElement) {
  return String(button.className || "").includes("bg-[#7A0C2E]");
}

function topAiButtons() {
  return Array.from(document.querySelectorAll<HTMLButtonElement>("button")).filter((button) => {
    if (!providerId(button)) return false;
    const rect = button.getBoundingClientRect();
    return rect.top >= 120 && rect.top <= 215 && rect.width > 0 && rect.height > 0;
  });
}

function cleanIds(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && AI_NAME_TO_ID.some(([, id]) => id === item))));
}

export default function AISelectionPersistenceBridge() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;

  useEffect(() => {
    if (!roomId) return;
    const storageKey = `royalcommand:room:${roomId}:selected-ai`;
    let restoring = true;
    let saveTimer = 0;
    let restoreTimer = 0;
    let attempts = 0;

    const readLocal = () => {
      try { return cleanIds(JSON.parse(localStorage.getItem(storageKey) || "[]")); }
      catch { return []; }
    };

    const save = (ids: string[]) => {
      const clean = cleanIds(ids);
      try { localStorage.setItem(storageKey, JSON.stringify(clean)); } catch {}
      void fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedAi: clean }),
        keepalive: true,
      }).catch(() => undefined);
    };

    const activeIds = () => topAiButtons().filter(isActive).map(providerId).filter(Boolean);

    const restoreIds = (wanted: string[]) => {
      attempts += 1;
      const buttons = topAiButtons();
      if (!buttons.length) {
        if (attempts < 30) restoreTimer = window.setTimeout(() => restoreIds(wanted), 100);
        else restoring = false;
        return;
      }
      for (const button of buttons) {
        const id = providerId(button);
        if (wanted.includes(id) && !isActive(button) && !button.disabled) button.click();
      }
      window.setTimeout(() => {
        const now = activeIds();
        const missing = wanted.filter((id) => !now.includes(id));
        if (missing.length && attempts < 30) restoreTimer = window.setTimeout(() => restoreIds(wanted), 120);
        else {
          restoring = false;
          if (now.length) save(now);
        }
      }, 80);
    };

    const restore = async () => {
      const local = readLocal();
      let account: string[] = [];
      try {
        const response = await fetch("/api/user/preferences", { cache: "no-store" });
        if (response.ok) {
          const payload = await response.json().catch(() => ({}));
          account = cleanIds(payload?.preferences?.selectedAi);
        }
      } catch {}
      const wanted = local.length ? local : account;
      if (wanted.length) restoreIds(wanted);
      else restoring = false;
    };

    const onClick = (event: MouseEvent) => {
      if (restoring) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("button");
      if (!(button instanceof HTMLButtonElement) || !providerId(button)) return;
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => save(activeIds()), 80);
    };

    document.addEventListener("click", onClick, true);
    void restore();
    return () => {
      document.removeEventListener("click", onClick, true);
      window.clearTimeout(saveTimer);
      window.clearTimeout(restoreTimer);
    };
  }, [roomId]);

  return null;
}
