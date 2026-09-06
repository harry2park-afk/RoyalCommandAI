"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";

const KNOWN_AI_IDS = new Set([
  "openai", "anthropic", "google", "xai", "codex", "deepseek", "perplexity", "mistral", "meta", "qwen",
  "cohere", "moonshot", "minimax", "zai", "microsoft", "amazon", "nvidia", "ai21", "nous", "writer",
  "stepfun", "inception", "liquid", "arcee", "zeroone", "tencent",
]);

const RCA_FIXED_TEAM_IDS = ["openai", "anthropic", "google", "xai", "codex"] as const;
const RCA_FIXED_TOP_SLOTS = [
  "openai", "anthropic", "google", "xai", "codex",
  "deepseek", "perplexity", "mistral", "meta", "qwen",
] as const;
const RCA_FIXED_DOCK_NAMES = ["ChatGPT", "Claude", "Gemini", "Grok", "Codex"] as const;

function cleanIds(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && KNOWN_AI_IDS.has(item))));
}

function sameArray(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

export default function AISelectionAccountRestore() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;

  useEffect(() => {
    if (!roomId) return;

    // `/rooms/rca` is Harry's internal Royal Command development workspace.
    // It must never inherit customer AI selection/billing state or stale browser
    // preferences. The fixed five-member development team is authoritative.
    if (roomId.toLowerCase() === "rca") {
      const selectedKey = `royalcommand:room:${roomId}:selected-ai`;
      const slotsKey = `royalcommand:room:${roomId}:ai-slots-v3`;
      const dockKey = `royalcommand:room:/rooms/rca:compact-ai-dock`;

      let changed = false;
      try {
        const selected = cleanIds(JSON.parse(localStorage.getItem(selectedKey) || "[]"));
        if (!sameArray(selected, RCA_FIXED_TEAM_IDS)) {
          localStorage.setItem(selectedKey, JSON.stringify(RCA_FIXED_TEAM_IDS));
          changed = true;
        }

        const savedSlots = cleanIds(JSON.parse(localStorage.getItem(slotsKey) || "[]"));
        if (!sameArray(savedSlots, RCA_FIXED_TOP_SLOTS)) {
          localStorage.setItem(slotsKey, JSON.stringify(RCA_FIXED_TOP_SLOTS));
          changed = true;
        }

        const savedDock = JSON.parse(localStorage.getItem(dockKey) || "[]");
        if (!sameArray(Array.isArray(savedDock) ? savedDock : [], RCA_FIXED_DOCK_NAMES)) {
          localStorage.setItem(dockKey, JSON.stringify(RCA_FIXED_DOCK_NAMES));
          changed = true;
        }
      } catch {
        localStorage.setItem(selectedKey, JSON.stringify(RCA_FIXED_TEAM_IDS));
        localStorage.setItem(slotsKey, JSON.stringify(RCA_FIXED_TOP_SLOTS));
        localStorage.setItem(dockKey, JSON.stringify(RCA_FIXED_DOCK_NAMES));
        changed = true;
      }

      // One bounded reload lets RoomV3 consume the canonical state before any
      // old browser value can render. Session guard prevents reload loops.
      const lockKey = "royalcommand:rca-fixed-dev-team-v1";
      if (changed && sessionStorage.getItem(lockKey) !== "1") {
        sessionStorage.setItem(lockKey, "1");
        window.location.reload();
      }
      return;
    }

    // Customer Rooms keep their own user/account selection workflow. The fixed
    // RCA development team is intentionally not copied into UUID customer Rooms.
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
