"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const AI_TITLES: Record<string, string> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  google: "Gemini",
  xai: "Grok",
  codex: "Codex",
  deepseek: "DeepSeek",
  perplexity: "Perplexity",
  mistral: "Mistral",
  meta: "Meta Llama",
  qwen: "Qwen",
  cohere: "Cohere",
};

const TITLE_TO_ID = Object.fromEntries(Object.entries(AI_TITLES).map(([id, title]) => [title, id]));
const RIGHT_KEY = "royalcommand:right-panel-apps";
const LANG_KEY = "royalcommand:selected-language";
const WIDTH_KEY = "royalcommand:chat-sidebar-width";
const COLLAPSED_KEY = "royalcommand:chat-sidebar-collapsed";

function roomId(pathname: string) {
  const match = pathname.match(/^\/rooms\/([^/]+)/);
  return match?.[1] || "";
}

function safeArray(raw: string | null) {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function selectedKey(id: string) {
  return `royalcommand:room:${id}:selected-ai`;
}

function slotsKey(id: string) {
  return `royalcommand:room:${id}:ai-slots-v2`;
}

function aiButtons() {
  return Array.from(document.querySelectorAll<HTMLButtonElement>("button")).filter((button) => {
    const title = button.getAttribute("title") || "";
    return Object.values(AI_TITLES).some((name) => title === name || title.startsWith(`${name} —`));
  });
}

function buttonAiId(button: HTMLButtonElement) {
  const title = button.getAttribute("title") || "";
  const matched = Object.keys(TITLE_TO_ID).find((name) => title === name || title.startsWith(`${name} —`));
  return matched ? TITLE_TO_ID[matched] : undefined;
}

function isActive(button: HTMLButtonElement) {
  return String(button.className || "").includes("bg-[#7A0C2E]");
}

export default function RoomPreferenceAuthority() {
  const pathname = usePathname();
  const lastSent = useRef("");
  const ready = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = roomId(pathname);
    if (!id) return;

    let cancelled = false;
    ready.current = false;
    lastSent.current = "";

    function setArray(key: string, value: unknown) {
      if (!Array.isArray(value)) return;
      localStorage.setItem(key, JSON.stringify(value.filter((item): item is string => typeof item === "string")));
    }

    function reconcile(wanted: string[]) {
      const wantedSet = new Set(wanted);
      for (const button of aiButtons()) {
        const aiId = buttonAiId(button);
        if (!aiId || button.disabled) continue;
        if (isActive(button) !== wantedSet.has(aiId)) button.click();
      }
    }

    function snapshot() {
      const buttons = aiButtons();
      const selectedAi = buttons.filter((button) => !button.disabled && isActive(button)).map(buttonAiId).filter((value): value is string => Boolean(value));
      const aiSlots = buttons.map(buttonAiId).filter((value): value is string => Boolean(value)).slice(0, 10);
      const languageSelect = document.querySelector<HTMLSelectElement>('select[aria-label="Language"]');
      const width = Number(localStorage.getItem(WIDTH_KEY));
      return {
        selectedAi,
        aiSlots: aiSlots.length ? aiSlots : safeArray(localStorage.getItem(slotsKey(id))),
        rightPanelApps: safeArray(localStorage.getItem(RIGHT_KEY)),
        language: languageSelect?.value || localStorage.getItem(LANG_KEY) || undefined,
        chatSidebarWidth: Number.isFinite(width) && width > 0 ? width : undefined,
        chatSidebarCollapsed: localStorage.getItem(COLLAPSED_KEY) === "1",
      };
    }

    async function saveNow() {
      if (!ready.current || cancelled) return;
      const data = snapshot();
      const serial = JSON.stringify(data);
      if (serial === lastSent.current) return;
      try {
        const res = await fetch("/api/user/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: serial,
          keepalive: true,
        });
        if (res.ok) {
          lastSent.current = serial;
          localStorage.setItem(selectedKey(id), JSON.stringify(data.selectedAi));
          localStorage.setItem(slotsKey(id), JSON.stringify(data.aiSlots));
        }
      } catch {}
    }

    function scheduleSave() {
      if (!ready.current || cancelled) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void saveNow(), 350);
    }

    async function restore() {
      let wantedSelected: string[] | null = null;
      try {
        const res = await fetch("/api/user/preferences", { cache: "no-store", credentials: "same-origin" });
        if (res.ok) {
          const data = await res.json();
          const prefs = data?.preferences || {};
          if (Array.isArray(prefs.selectedAi)) {
            wantedSelected = prefs.selectedAi.filter((item: unknown): item is string => typeof item === "string");
            setArray(selectedKey(id), wantedSelected);
          }
          if (Array.isArray(prefs.aiSlots)) setArray(slotsKey(id), prefs.aiSlots);
          if (Array.isArray(prefs.rightPanelApps)) setArray(RIGHT_KEY, prefs.rightPanelApps);
          if (typeof prefs.language === "string" && prefs.language) localStorage.setItem(LANG_KEY, prefs.language);
          if (typeof prefs.chatSidebarWidth === "number") localStorage.setItem(WIDTH_KEY, String(prefs.chatSidebarWidth));
          if (typeof prefs.chatSidebarCollapsed === "boolean") localStorage.setItem(COLLAPSED_KEY, prefs.chatSidebarCollapsed ? "1" : "0");
        }
      } catch {}

      if (cancelled) return;
      const target = wantedSelected ?? safeArray(localStorage.getItem(selectedKey(id)));
      requestAnimationFrame(() => reconcile(target));
      setTimeout(() => reconcile(target), 250);
      setTimeout(() => reconcile(target), 700);
      setTimeout(() => reconcile(target), 1200);
      setTimeout(() => {
        if (cancelled) return;
        reconcile(target);
        ready.current = true;
        lastSent.current = JSON.stringify(snapshot());
      }, 1500);
    }

    const observer = new MutationObserver(() => {
      if (!ready.current) return;
      scheduleSave();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "title"] });

    const onInteraction = () => setTimeout(scheduleSave, 0);
    document.addEventListener("click", onInteraction, true);
    document.addEventListener("change", onInteraction, true);
    window.addEventListener("mouseup", onInteraction, true);
    window.addEventListener("beforeunload", saveNow);

    void restore();

    return () => {
      cancelled = true;
      ready.current = false;
      observer.disconnect();
      document.removeEventListener("click", onInteraction, true);
      document.removeEventListener("change", onInteraction, true);
      window.removeEventListener("mouseup", onInteraction, true);
      window.removeEventListener("beforeunload", saveNow);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [pathname]);

  return null;
}