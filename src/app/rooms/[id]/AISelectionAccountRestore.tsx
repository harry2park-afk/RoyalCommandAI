"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";

const KNOWN_AI_IDS = new Set([
  "openai", "anthropic", "google", "xai", "codex", "deepseek", "perplexity", "mistral", "meta", "qwen",
  "cohere", "moonshot", "minimax", "zai", "microsoft", "amazon", "nvidia", "ai21", "nous", "writer",
  "stepfun", "inception", "liquid", "arcee", "zeroone", "tencent",
]);

function cleanIds(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && KNOWN_AI_IDS.has(item))));
}

export default function AISelectionAccountRestore() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;

  useEffect(() => {
    if (!roomId) return;
    const storageKey = `royalcommand:room:${roomId}:selected-ai`;
    const reloadKey = `royalcommand:room:${roomId}:selected-ai-account-restored`;

    let local: string[] = [];
    try {
      local = cleanIds(JSON.parse(localStorage.getItem(storageKey) || "[]"));
    } catch {}
    if (local.length) return;
    if (sessionStorage.getItem(reloadKey) === "1") return;

    let cancelled = false;
    void fetch("/api/user/preferences", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (cancelled) return;
        const account = cleanIds(payload?.preferences?.selectedAi);
        if (!account.length) return;
        try {
          localStorage.setItem(storageKey, JSON.stringify(account));
          sessionStorage.setItem(reloadKey, "1");
          window.location.reload();
        } catch {}
      })
      .catch(() => undefined);

    return () => { cancelled = true; };
  }, [roomId]);

  return null;
}
