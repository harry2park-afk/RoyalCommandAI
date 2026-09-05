"use client";

import { useEffect, useMemo, useState } from "react";
import {
  emptyRoomHeaderLayoutConfig,
  RoomHeaderLayoutConfig,
  RoomHeaderLayoutElementId,
  sanitiseRoomHeaderLayoutConfig,
} from "@/lib/layout-editor";

type QuickItem = {
  id: RoomHeaderLayoutElementId;
  label: string;
  selector: string;
  textEditable: boolean;
};

type Mode = "move" | "resize" | "text" | "colour" | null;

const REGISTRY: QuickItem[] = [
  { id: "build-your-room", label: "Build Your Room", selector: "#rc-room-finder-top", textEditable: true },
  { id: "integrated-answer", label: "Integrated Answer", selector: "[data-rc-native-synthesis-button='true']", textEditable: false },
  { id: "ai-warehouse", label: "AI Warehouse", selector: "button[title^='AI Warehouse']", textEditable: true },
  { id: "ai-chatgpt", label: "ChatGPT", selector: "button[title^='ChatGPT']", textEditable: false },
  { id: "ai-claude", label: "Claude", selector: "button[title^='Claude']", textEditable: false },
  { id: "ai-gemini", label: "Gemini", selector: "button[title^='Gemini']", textEditable: false },
  { id: "ai-grok", label: "Grok", selector: "button[title^='Grok']", textEditable: false },
  { id: "ai-codex", label: "Codex", selector: "button[title^='OpenAI Codex']", textEditable: false },
  { id: "ai-deepseek", label: "DeepSeek", selector: "button[title^='DeepSeek']", textEditable: false },
  { id: "ai-perplexity", label: "Perplexity", selector: "button[title^='Perplexity']", textEditable: false },
  { id: "ai-mistral", label: "Mistral", selector: "button[title^='Mistral']", textEditable: false },
  { id: "ai-llama", label: "Llama", selector: "button[title^='Meta Llama']", textEditable: false },
  { id: "ai-qwen", label: "Qwen", selector: "button[title^='Qwen']", textEditable: false },
  { id: "profile-button", label: "Profile", selector: "button[aria-label*='profile'],button[aria-label*='프로필'],button[title='My Profile'],button[title='내 프로필']", textEditable: false },
];

function resolveItem(item: QuickItem | null) {
  if (!item || typeof document === "undefined") return null;
  const node = document.querySelector(item.selector);
  return node instanceof HTMLElement ? node : null;
}

function rgbToHex(value: string, fallback: string) {
  const hex = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(hex)) return hex.toUpperCase();
  const match = hex.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return fallback;
  return `#${[match[1], match[2], match[3]].map((part) => Math.max(0, Math.min(255, Number(part))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function hexWithStrength(hex: string, strength: number) {
  const safe = /^#[0-9A-F]{6}$/i.test(hex) ? hex : "#000000";
  const r = Number.parseInt(safe.slice(1, 3), 16);
  const g = Number.parseInt(safe.slice(3, 5), 16);
  const b = Number.parseInt(safe.slice(5, 7), 16);
  const alpha = Math.max(1, Math.min(10, Math.round(strength))) / 10;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function selectInProtectedPanel(item: QuickItem) {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-rc-layout-editor-ui='true'] button"));
  const target = buttons.find((button) => (button.textContent || "").trim() === item.label);
  target?.click();
}

function focusProtectedTextInput() {
  const labels = Array.from(document.querySelectorAll<HTMLLabelElement>("[data-rc-layout-editor-ui='true'] label"));
  const label = labels.find((node) => (node.textContent || "").trim().startsWith("Button text"));
  const input = label?.querySelector<HTMLInputElement>("input[type='text']");
  input?.focus();
  input?.select();
}

function applyColours(config: RoomHeaderLayoutConfig) {
  for (const item of REGISTRY) {
    const element = resolveItem(item);
    if (!element) continue;
    const patch = config.elements[item.id];
    const strength = patch?.colourStrength ?? 10;
    if (patch?.borderColor) element.style.setProperty("border-color", hexWithStrength(patch.borderColor, strength), "important");
    if (patch?.backgroundColor) element.style.setProperty("background-color", hexWithStrength(patch.backgroundColor, strength), "important");
  }
}

export default function LayoutEditorQuickActions() {
  const [selectedId, setSelectedId] = useState<RoomHeaderLayoutElementId | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [borderColor, setBorderColor] = useState("#BCAE8D");
  const [backgroundColor, setBackgroundColor] = useState("#273A33");
  const [colourStrength, setColourStrength] = useState(10);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Double-click a button, then choose what you want to change.");

  const selected = useMemo(() => REGISTRY.find((item) => item.id === selectedId) || null, [selectedId]);

  useEffect(() => {
    let cancelled = false;
    let currentConfig = emptyRoomHeaderLayoutConfig();

    const load = () => {
      void fetch("/api/user/preferences", { cache: "no-store" })
        .then(async (response) => response.ok ? response.json() : null)
        .then((data) => {
          if (cancelled) return;
          currentConfig = sanitiseRoomHeaderLayoutConfig(data?.preferences?.layoutRoomHeaderV1) || emptyRoomHeaderLayoutConfig();
          applyColours(currentConfig);
        })
        .catch(() => undefined);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.detail < 2) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-rc-layout-editor-ui='true']")) return;
      const item = REGISTRY.find((candidate) => {
        const element = resolveItem(candidate);
        return Boolean(element && element.contains(target));
      });
      if (!item) return;

      setSelectedId(item.id);
      setMode(null);
      const element = resolveItem(item);
      if (element) {
        const computed = getComputedStyle(element);
        const patch = currentConfig.elements[item.id];
        setBorderColor(patch?.borderColor || rgbToHex(computed.borderColor, "#BCAE8D"));
        setBackgroundColor(patch?.backgroundColor || rgbToHex(computed.backgroundColor, "#273A33"));
        setColourStrength(patch?.colourStrength ?? 10);
      }
      setMessage(`${item.label} selected. Choose Move, Resize, Text, or Colours.`);
      window.setTimeout(() => selectInProtectedPanel(item), 0);
    };

    load();
    window.addEventListener("pointerdown", onPointerDown, true);
    const observer = new MutationObserver(() => applyColours(currentConfig));
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", onPointerDown, true);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!selected || mode !== "colour") return;
    const element = resolveItem(selected);
    if (!element) return;
    element.style.setProperty("border-color", hexWithStrength(borderColor, colourStrength), "important");
    element.style.setProperty("background-color", hexWithStrength(backgroundColor, colourStrength), "important");
  }, [selected, mode, borderColor, backgroundColor, colourStrength]);

  function chooseMode(next: Exclude<Mode, null>) {
    if (!selected) return;
    setMode(next);
    selectInProtectedPanel(selected);
    if (next === "move") setMessage("Move selected: drag the yellow box to the new position.");
    if (next === "resize") setMessage("Resize selected: drag any yellow round handle.");
    if (next === "text") {
      if (!selected.textEditable) {
        setMessage("This button's text is Core-protected. Choose another edit type.");
        return;
      }
      setMessage("Text selected: type the new button text in the editor field.");
      window.setTimeout(focusProtectedTextInput, 0);
    }
    if (next === "colour") setMessage("Colours selected: choose colours and strength 1–10, then save.");
  }

  async function saveColours(useCore = false) {
    if (!selected) return;
    setSaving(true);
    setMessage("Saving colours…");
    try {
      const read = await fetch("/api/user/preferences", { cache: "no-store" });
      const data = read.ok ? await read.json() : null;
      const config = sanitiseRoomHeaderLayoutConfig(data?.preferences?.layoutRoomHeaderV1) || emptyRoomHeaderLayoutConfig();
      const patch = { ...(config.elements[selected.id] || {}) };
      if (useCore) {
        delete patch.borderColor;
        delete patch.backgroundColor;
        delete patch.colourStrength;
      } else {
        patch.borderColor = borderColor;
        patch.backgroundColor = backgroundColor;
        patch.colourStrength = colourStrength;
      }
      const next: RoomHeaderLayoutConfig = {
        ...config,
        layoutVersion: config.layoutVersion + 1,
        updatedAt: new Date().toISOString(),
        elements: { ...config.elements, [selected.id]: patch },
      };
      const response = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layoutRoomHeaderV1: next }),
      });
      if (!response.ok) throw new Error("Server rejected the colour save.");
      setMessage(useCore ? "Core colours restored. Reloading editor…" : "Colours and strength saved. Reloading editor…");
      window.setTimeout(() => window.location.reload(), 250);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Colour save failed.");
      setSaving(false);
    }
  }

  if (!selected) {
    return (
      <div data-rc-layout-editor-ui="true" className="fixed right-[360px] top-[104px] z-[1002] rounded-lg border border-amber-300/50 bg-[#07101d]/95 px-3 py-2 text-xs text-white shadow-xl">
        <strong className="text-amber-200">Quick Edit</strong>
        <div className="mt-1 text-white/65">Double-click the button you want to change.</div>
      </div>
    );
  }

  return (
    <div data-rc-layout-editor-ui="true" className="fixed right-[360px] top-[104px] z-[1002] w-[360px] rounded-xl border border-amber-300/60 bg-[#07101d]/98 p-3 text-xs text-white shadow-2xl">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-semibold text-amber-200">Quick Edit · {selected.label}</div>
          <div className="mt-0.5 text-[10px] text-white/50">Double-click another button after Save or Cancel.</div>
        </div>
        <button type="button" onClick={() => { setSelectedId(null); setMode(null); }} className="rounded border border-white/15 px-2 py-1 text-white/70">×</button>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        <button type="button" onClick={() => chooseMode("move")} className={`rounded-md border px-2 py-2 ${mode === "move" ? "border-amber-300 bg-amber-300/15" : "border-white/15 bg-white/[0.04]"}`}>Move</button>
        <button type="button" onClick={() => chooseMode("resize")} className={`rounded-md border px-2 py-2 ${mode === "resize" ? "border-amber-300 bg-amber-300/15" : "border-white/15 bg-white/[0.04]"}`}>Resize</button>
        <button type="button" disabled={!selected.textEditable} onClick={() => chooseMode("text")} className={`rounded-md border px-2 py-2 disabled:opacity-30 ${mode === "text" ? "border-amber-300 bg-amber-300/15" : "border-white/15 bg-white/[0.04]"}`}>Text</button>
        <button type="button" onClick={() => chooseMode("colour")} className={`rounded-md border px-2 py-2 ${mode === "colour" ? "border-amber-300 bg-amber-300/15" : "border-white/15 bg-white/[0.04]"}`}>Colours</button>
      </div>

      {mode === "colour" ? (
        <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-2.5">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-[11px] text-white/65">Border colour
              <div className="mt-1 flex items-center gap-2">
                <input type="color" value={borderColor} onChange={(event) => setBorderColor(event.target.value.toUpperCase())} className="h-9 w-12 cursor-pointer rounded border border-white/15 bg-transparent p-0" />
                <span className="font-mono text-[10px] text-white/55">{borderColor}</span>
              </div>
            </label>
            <label className="text-[11px] text-white/65">Background colour
              <div className="mt-1 flex items-center gap-2">
                <input type="color" value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value.toUpperCase())} className="h-9 w-12 cursor-pointer rounded border border-white/15 bg-transparent p-0" />
                <span className="font-mono text-[10px] text-white/55">{backgroundColor}</span>
              </div>
            </label>
          </div>

          <label className="mt-3 block text-[11px] text-white/70">
            Colour strength: <strong className="text-amber-200">{colourStrength}</strong> / 10
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={colourStrength}
              onChange={(event) => setColourStrength(Number(event.target.value))}
              className="mt-2 w-full accent-amber-300"
            />
            <div className="mt-1 flex justify-between text-[9px] text-white/45"><span>1 · Very light</span><span>10 · Strong</span></div>
          </label>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" disabled={saving} onClick={() => void saveColours(false)} className="rounded-md border border-emerald-400/50 bg-emerald-500/10 px-2 py-2 font-semibold text-emerald-200 disabled:opacity-40">Save Colours</button>
            <button type="button" disabled={saving} onClick={() => void saveColours(true)} className="rounded-md border border-white/15 bg-white/[0.04] px-2 py-2 disabled:opacity-40">Use Core Colours</button>
          </div>
        </div>
      ) : null}

      <div className="mt-2 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[11px] leading-4 text-white/70">{message}</div>
    </div>
  );
}
