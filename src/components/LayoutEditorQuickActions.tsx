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
  fontEditable: boolean;
};

type Mode = "move" | "resize" | "text" | "colour" | null;

const REGISTRY: QuickItem[] = [
  { id: "build-your-room", label: "Build Your Room", selector: "#rc-room-finder-top", textEditable: true, fontEditable: true },
  { id: "integrated-answer", label: "Integrated Answer", selector: "[data-rc-native-synthesis-button='true']", textEditable: false, fontEditable: true },
  { id: "ai-warehouse", label: "AI Warehouse", selector: "button[title^='AI Warehouse']", textEditable: true, fontEditable: true },
  { id: "ai-chatgpt", label: "ChatGPT", selector: "button[title^='ChatGPT']", textEditable: false, fontEditable: true },
  { id: "ai-claude", label: "Claude", selector: "button[title^='Claude']", textEditable: false, fontEditable: true },
  { id: "ai-gemini", label: "Gemini", selector: "button[title^='Gemini']", textEditable: false, fontEditable: true },
  { id: "ai-grok", label: "Grok", selector: "button[title^='Grok']", textEditable: false, fontEditable: true },
  { id: "ai-codex", label: "Codex", selector: "button[title^='OpenAI Codex']", textEditable: false, fontEditable: true },
  { id: "ai-deepseek", label: "DeepSeek", selector: "button[title^='DeepSeek']", textEditable: false, fontEditable: true },
  { id: "ai-perplexity", label: "Perplexity", selector: "button[title^='Perplexity']", textEditable: false, fontEditable: true },
  { id: "ai-mistral", label: "Mistral", selector: "button[title^='Mistral']", textEditable: false, fontEditable: true },
  { id: "ai-llama", label: "Llama", selector: "button[title^='Meta Llama']", textEditable: false, fontEditable: true },
  { id: "ai-qwen", label: "Qwen", selector: "button[title^='Qwen']", textEditable: false, fontEditable: true },
  { id: "profile-button", label: "Profile", selector: "button[aria-label*='profile'],button[aria-label*='프로필'],button[title='My Profile'],button[title='내 프로필']", textEditable: false, fontEditable: false },
];

function resolveItem(item: QuickItem | null) {
  if (!item || typeof document === "undefined") return null;
  const node = document.querySelector(item.selector);
  return node instanceof HTMLElement ? node : null;
}

function directLabelTarget(element: HTMLElement, item: QuickItem) {
  if (!item.textEditable && !item.fontEditable) return element;
  if (item.id === "build-your-room") return element;
  const spans = Array.from(element.children).filter((child): child is HTMLSpanElement => child instanceof HTMLSpanElement);
  const candidates = spans.filter((span) => !span.dataset.rcAiTick && (span.textContent || "").trim().length > 1);
  return candidates[candidates.length - 1] || element;
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

function applyVisualOverrides(config: RoomHeaderLayoutConfig) {
  for (const item of REGISTRY) {
    const element = resolveItem(item);
    if (!element) continue;
    const patch = config.elements[item.id];
    const strength = patch?.colourStrength ?? 10;
    if (patch?.borderColor) element.style.setProperty("border-color", hexWithStrength(patch.borderColor, strength), "important");
    if (patch?.backgroundColor) element.style.setProperty("background-color", hexWithStrength(patch.backgroundColor, strength), "important");
    const target = directLabelTarget(element, item);
    if (item.fontEditable && patch?.fontSize !== undefined) target.style.setProperty("font-size", `${patch.fontSize}px`, "important");
    if (item.fontEditable && patch?.textColor) target.style.setProperty("color", patch.textColor, "important");
  }
}

export default function LayoutEditorQuickActions() {
  const [selectedId, setSelectedId] = useState<RoomHeaderLayoutElementId | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [borderColor, setBorderColor] = useState("#BCAE8D");
  const [backgroundColor, setBackgroundColor] = useState("#273A33");
  const [colourStrength, setColourStrength] = useState(10);
  const [textValue, setTextValue] = useState("");
  const [fontSize, setFontSize] = useState(12);
  const [textColor, setTextColor] = useState("#FFFFFF");
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
          applyVisualOverrides(currentConfig);
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
        const patch = currentConfig.elements[item.id];
        const computed = getComputedStyle(element);
        const labelTarget = directLabelTarget(element, item);
        const labelComputed = getComputedStyle(labelTarget);
        setBorderColor(patch?.borderColor || rgbToHex(computed.borderColor, "#BCAE8D"));
        setBackgroundColor(patch?.backgroundColor || rgbToHex(computed.backgroundColor, "#273A33"));
        setColourStrength(patch?.colourStrength ?? 10);
        setTextValue(patch?.label || (labelTarget.textContent || "").trim());
        setFontSize(Math.max(8, Math.min(32, Math.round(patch?.fontSize ?? Number.parseFloat(labelComputed.fontSize) || 12))));
        setTextColor(patch?.textColor || rgbToHex(labelComputed.color, "#FFFFFF"));
      }
      setMessage(`${item.label} selected. Choose Move, Resize, Text, or Colours.`);
      window.setTimeout(() => selectInProtectedPanel(item), 0);
    };

    load();
    window.addEventListener("pointerdown", onPointerDown, true);
    const observer = new MutationObserver(() => applyVisualOverrides(currentConfig));
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

  useEffect(() => {
    if (!selected || mode !== "text") return;
    const element = resolveItem(selected);
    if (!element) return;
    const target = directLabelTarget(element, selected);
    if (selected.textEditable && textValue.trim()) target.textContent = textValue;
    if (selected.fontEditable) {
      target.style.setProperty("font-size", `${fontSize}px`, "important");
      target.style.setProperty("color", textColor, "important");
    }
  }, [selected, mode, textValue, fontSize, textColor]);

  function chooseMode(next: Exclude<Mode, null>) {
    if (!selected) return;
    setMode(next);
    selectInProtectedPanel(selected);
    if (next === "move") setMessage("Move selected: drag the yellow box to the new position.");
    if (next === "resize") setMessage("Resize selected: drag any yellow round handle.");
    if (next === "text") setMessage(selected.textEditable ? "Text selected: change text, size, and colour here, then save." : "Text style selected: this Core label cannot be renamed, but size and colour can be changed.");
    if (next === "colour") setMessage("Colours selected: choose colours and strength 1–10, then save.");
  }

  async function savePatch(update: (patch: NonNullable<RoomHeaderLayoutConfig["elements"][RoomHeaderLayoutElementId]>) => void, success: string) {
    if (!selected) return;
    setSaving(true);
    try {
      const read = await fetch("/api/user/preferences", { cache: "no-store" });
      const data = read.ok ? await read.json() : null;
      const config = sanitiseRoomHeaderLayoutConfig(data?.preferences?.layoutRoomHeaderV1) || emptyRoomHeaderLayoutConfig();
      const patch = { ...(config.elements[selected.id] || {}) };
      update(patch);
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
      if (!response.ok) throw new Error("Server rejected the save.");
      setMessage(`${success} Reloading editor…`);
      window.setTimeout(() => window.location.reload(), 250);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
      setSaving(false);
    }
  }

  async function saveColours(useCore = false) {
    setMessage("Saving colours…");
    await savePatch((patch) => {
      if (useCore) {
        delete patch.borderColor;
        delete patch.backgroundColor;
        delete patch.colourStrength;
      } else {
        patch.borderColor = borderColor;
        patch.backgroundColor = backgroundColor;
        patch.colourStrength = colourStrength;
      }
    }, useCore ? "Core colours restored." : "Colours and strength saved.");
  }

  async function saveText(useCoreStyle = false) {
    if (!selected) return;
    if (selected.textEditable && !textValue.trim()) {
      setMessage("Button text cannot be empty.");
      return;
    }
    setMessage("Saving text settings…");
    await savePatch((patch) => {
      if (selected.textEditable) patch.label = textValue.trim().replace(/\s+/g, " ").slice(0, 80);
      if (useCoreStyle) {
        delete patch.fontSize;
        delete patch.textColor;
      } else if (selected.fontEditable) {
        patch.fontSize = Math.max(8, Math.min(32, Math.round(fontSize)));
        patch.textColor = textColor;
      }
    }, useCoreStyle ? "Core text size and colour restored." : "Text settings saved.");
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
        <button type="button" disabled={!selected.textEditable && !selected.fontEditable} onClick={() => chooseMode("text")} className={`rounded-md border px-2 py-2 disabled:opacity-30 ${mode === "text" ? "border-amber-300 bg-amber-300/15" : "border-white/15 bg-white/[0.04]"}`}>Text</button>
        <button type="button" onClick={() => chooseMode("colour")} className={`rounded-md border px-2 py-2 ${mode === "colour" ? "border-amber-300 bg-amber-300/15" : "border-white/15 bg-white/[0.04]"}`}>Colours</button>
      </div>

      {mode === "text" ? (
        <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-2.5">
          {selected.textEditable ? (
            <label className="block text-[11px] text-white/65">Button text
              <input type="text" maxLength={80} value={textValue} onChange={(event) => setTextValue(event.target.value)} className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-2 py-2 text-white" />
            </label>
          ) : (
            <div className="text-[10px] text-white/45">Button name is Core-protected. Size and colour are editable.</div>
          )}

          {selected.fontEditable ? (
            <>
              <label className="mt-3 block text-[11px] text-white/70">Text size: <strong className="text-amber-200">{fontSize}px</strong>
                <input type="range" min={8} max={32} step={1} value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} className="mt-2 w-full accent-amber-300" />
                <div className="mt-1 flex justify-between text-[9px] text-white/45"><span>8 · Small</span><span>32 · Large</span></div>
              </label>
              <label className="mt-3 block text-[11px] text-white/65">Text colour
                <div className="mt-1 flex items-center gap-2">
                  <input type="color" value={textColor} onChange={(event) => setTextColor(event.target.value.toUpperCase())} className="h-9 w-12 cursor-pointer rounded border border-white/15 bg-transparent p-0" />
                  <span className="font-mono text-[10px] text-white/55">{textColor}</span>
                </div>
              </label>
            </>
          ) : null}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" disabled={saving} onClick={() => void saveText(false)} className="rounded-md border border-emerald-400/50 bg-emerald-500/10 px-2 py-2 font-semibold text-emerald-200 disabled:opacity-40">Save Text</button>
            <button type="button" disabled={saving || !selected.fontEditable} onClick={() => void saveText(true)} className="rounded-md border border-white/15 bg-white/[0.04] px-2 py-2 disabled:opacity-40">Core Text Style</button>
          </div>
        </div>
      ) : null}

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
            <input type="range" min={1} max={10} step={1} value={colourStrength} onChange={(event) => setColourStrength(Number(event.target.value))} className="mt-2 w-full accent-amber-300" />
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
