"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { RoomHeaderLayoutElementId } from "@/lib/layout-editor";
import {
  emptyRoomHeaderStyleConfig,
  RoomHeaderStyleConfig,
  RoomHeaderStylePatch,
  sanitiseRoomHeaderStyleConfig,
} from "@/lib/layout-editor-style";

type Item = {
  id: RoomHeaderLayoutElementId;
  label: string;
  selector: string;
  textColour: boolean;
};

const ITEMS: Item[] = [
  { id: "build-your-room", label: "Build Your Room", selector: "#rc-room-finder-top", textColour: true },
  { id: "integrated-answer", label: "Integrated Answer", selector: "[data-rc-native-synthesis-button='true']", textColour: true },
  { id: "ai-warehouse", label: "AI Warehouse", selector: "button[title^='AI Warehouse']", textColour: true },
  { id: "ai-chatgpt", label: "ChatGPT", selector: "button[title^='ChatGPT']", textColour: true },
  { id: "ai-claude", label: "Claude", selector: "button[title^='Claude']", textColour: true },
  { id: "ai-gemini", label: "Gemini", selector: "button[title^='Gemini']", textColour: true },
  { id: "ai-grok", label: "Grok", selector: "button[title^='Grok']", textColour: true },
  { id: "ai-codex", label: "Codex", selector: "button[title^='OpenAI Codex']", textColour: true },
  { id: "ai-deepseek", label: "DeepSeek", selector: "button[title^='DeepSeek']", textColour: true },
  { id: "ai-perplexity", label: "Perplexity", selector: "button[title^='Perplexity']", textColour: true },
  { id: "ai-mistral", label: "Mistral", selector: "button[title^='Mistral']", textColour: true },
  { id: "ai-llama", label: "Llama", selector: "button[title^='Meta Llama']", textColour: true },
  { id: "ai-qwen", label: "Qwen", selector: "button[title^='Qwen']", textColour: true },
  { id: "profile-button", label: "Profile", selector: "button[aria-label*='profile'],button[aria-label*='프로필'],button[title='My Profile'],button[title='내 프로필']", textColour: false },
];

const ORIGINAL_ELEMENT = new WeakMap<HTMLElement, { borderColor: string; backgroundColor: string; borderWidth: string }>();
const ORIGINAL_TEXT = new WeakMap<HTMLElement, { color: string }>();

function resolveItem(item: Item) {
  const node = document.querySelector(item.selector);
  return node instanceof HTMLElement ? node : null;
}

function directLabelTarget(element: HTMLElement, item: Item) {
  if (item.id === "build-your-room") return element;
  const spans = Array.from(element.children).filter((child): child is HTMLSpanElement => child instanceof HTMLSpanElement);
  const candidates = spans.filter((span) => !span.dataset.rcAiTick && (span.textContent || "").trim().length > 1);
  return candidates[candidates.length - 1] || element;
}

function rememberOriginal(element: HTMLElement, textTarget: HTMLElement) {
  if (!ORIGINAL_ELEMENT.has(element)) {
    ORIGINAL_ELEMENT.set(element, {
      borderColor: element.style.borderColor,
      backgroundColor: element.style.backgroundColor,
      borderWidth: element.style.borderWidth,
    });
  }
  if (!ORIGINAL_TEXT.has(textTarget)) ORIGINAL_TEXT.set(textTarget, { color: textTarget.style.color });
}

function strengthColour(hex: string, strength: number) {
  const safe = /^#[0-9A-F]{6}$/i.test(hex) ? hex : "#000000";
  const r = Number.parseInt(safe.slice(1, 3), 16);
  const g = Number.parseInt(safe.slice(3, 5), 16);
  const b = Number.parseInt(safe.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(1, Math.min(10, Math.round(strength))) / 10})`;
}

function restoreProperty(element: HTMLElement, property: "border-color" | "background-color" | "border-width", value: string) {
  if (value) element.style.setProperty(property, value);
  else element.style.removeProperty(property);
}

function applyItem(item: Item, patch?: RoomHeaderStylePatch) {
  const element = resolveItem(item);
  if (!element) return;
  const target = directLabelTarget(element, item);
  rememberOriginal(element, target);
  const original = ORIGINAL_ELEMENT.get(element)!;
  const originalText = ORIGINAL_TEXT.get(target)!;
  const strength = patch?.colourStrength ?? 10;

  if (patch?.borderColor) element.style.setProperty("border-color", strengthColour(patch.borderColor, strength), "important");
  else restoreProperty(element, "border-color", original.borderColor);
  if (patch?.backgroundColor) element.style.setProperty("background-color", strengthColour(patch.backgroundColor, strength), "important");
  else restoreProperty(element, "background-color", original.backgroundColor);
  if (patch?.borderWidth !== undefined) element.style.setProperty("border-width", `${patch.borderWidth}px`, "important");
  else restoreProperty(element, "border-width", original.borderWidth);
  if (item.textColour && patch?.textColor) target.style.setProperty("color", patch.textColor, "important");
  else if (item.textColour) {
    if (originalText.color) target.style.setProperty("color", originalText.color);
    else target.style.removeProperty("color");
  }
}

function applyConfig(config: RoomHeaderStyleConfig) {
  for (const item of ITEMS) applyItem(item, config.elements[item.id]);
}

function rgbToHex(value: string, fallback: string) {
  if (/^#[0-9a-f]{6}$/i.test(value.trim())) return value.trim().toUpperCase();
  const match = value.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return fallback;
  return `#${[match[1], match[2], match[3]].map((part) => Math.max(0, Math.min(255, Number(part))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

export default function RoomHeaderStyleAuthority() {
  const pathname = usePathname();
  const roomPage = /^\/rooms\/[^/]+\/?$/.test(pathname || "");
  const [config, setConfig] = useState<RoomHeaderStyleConfig>(emptyRoomHeaderStyleConfig);
  const configRef = useRef(config);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [selectedId, setSelectedId] = useState<RoomHeaderLayoutElementId | null>(null);
  const [borderColor, setBorderColor] = useState("#E6C85C");
  const [backgroundColor, setBackgroundColor] = useState("#1F2937");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [colourStrength, setColourStrength] = useState(10);
  const [borderWidth, setBorderWidth] = useState(1);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const selected = useMemo(() => ITEMS.find((item) => item.id === selectedId) || null, [selectedId]);

  const discoverEditor = useCallback(() => {
    if (!roomPage || new URLSearchParams(window.location.search).get("layoutEdit") !== "1") {
      setHost(null);
      setSelectedId(null);
      return;
    }
    const aside = Array.from(document.querySelectorAll<HTMLElement>("aside[data-rc-layout-editor-ui='true']"))
      .find((node) => (node.textContent || "").includes("Protected UI Editor")) || null;
    setHost(aside);
    if (!aside) { setSelectedId(null); return; }
    const text = aside.textContent || "";
    const item = ITEMS.find((candidate) => text.includes(`Editing: ${candidate.label}`));
    setSelectedId(item?.id || null);
  }, [roomPage]);

  useEffect(() => {
    configRef.current = config;
    if (roomPage) applyConfig(config);
  }, [roomPage, config]);

  useEffect(() => {
    if (!roomPage) return;
    let cancelled = false;
    void fetch("/api/layout-editor/style", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => {
        if (cancelled) return;
        setConfig(sanitiseRoomHeaderStyleConfig(data?.style) || emptyRoomHeaderStyleConfig());
      })
      .catch(() => undefined);

    const observer = new MutationObserver(() => {
      applyConfig(configRef.current);
      discoverEditor();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    const timer = window.setInterval(discoverEditor, 300);
    const first = window.setTimeout(discoverEditor, 0);
    return () => {
      cancelled = true;
      observer.disconnect();
      window.clearInterval(timer);
      window.clearTimeout(first);
    };
  }, [roomPage, discoverEditor]);

  useEffect(() => {
    if (!selected) return;
    const timer = window.setTimeout(() => {
      const element = resolveItem(selected);
      if (!element) return;
      const target = directLabelTarget(element, selected);
      const patch = configRef.current.elements[selected.id];
      const computed = getComputedStyle(element);
      const textComputed = getComputedStyle(target);
      setBorderColor(patch?.borderColor || rgbToHex(computed.borderColor, "#E6C85C"));
      setBackgroundColor(patch?.backgroundColor || rgbToHex(computed.backgroundColor, "#1F2937"));
      setTextColor(patch?.textColor || rgbToHex(textComputed.color, "#FFFFFF"));
      setColourStrength(patch?.colourStrength ?? 10);
      setBorderWidth(patch?.borderWidth ?? Math.max(1, Math.min(5, Math.round(Number.parseFloat(computed.borderWidth) || 1))));
      setMessage("");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    applyItem(selected, {
      borderColor,
      backgroundColor,
      textColor: selected.textColour ? textColor : undefined,
      colourStrength,
      borderWidth,
    });
  }, [selected, borderColor, backgroundColor, textColor, colourStrength, borderWidth]);

  async function saveStyle() {
    if (!selected) return;
    const next: RoomHeaderStyleConfig = {
      ...configRef.current,
      updatedAt: new Date().toISOString(),
      elements: {
        ...configRef.current.elements,
        [selected.id]: {
          borderColor,
          backgroundColor,
          textColor: selected.textColour ? textColor : undefined,
          colourStrength,
          borderWidth,
        },
      },
    };
    setSaving(true);
    setMessage("Saving style…");
    try {
      const response = await fetch("/api/layout-editor/style", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style: next }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Style save failed.");
      setConfig(sanitiseRoomHeaderStyleConfig(data?.style) || next);
      setMessage("Style saved. Move/resize settings were not changed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Style save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function restoreCoreStyle() {
    if (!selected) return;
    const elements = { ...configRef.current.elements };
    delete elements[selected.id];
    const next: RoomHeaderStyleConfig = { ...configRef.current, updatedAt: new Date().toISOString(), elements };
    setSaving(true);
    try {
      const response = await fetch("/api/layout-editor/style", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style: next }),
      });
      if (!response.ok) throw new Error("Core style restore failed.");
      setConfig(next);
      applyItem(selected, undefined);
      setMessage("Core style restored for this button.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Core style restore failed.");
    } finally {
      setSaving(false);
    }
  }

  if (!roomPage) return null;

  return (
    <>
      <style>{`
        [data-rc-layout-editor-ui='true']:has(> button[aria-label^='Resize ']) {
          border-width: 1px !important;
          background: transparent !important;
          box-shadow: 0 0 0 1px rgba(15,23,42,.72), 0 0 10px rgba(251,191,36,.28) !important;
        }
        button[aria-label^='Resize '] {
          width: 6px !important;
          height: 6px !important;
          border-width: 1px !important;
          box-shadow: none !important;
        }
      `}</style>
      {host && selected ? createPortal(
        <div className="mt-3 border-t border-white/10 pt-3" data-rc-layout-style-ui="true">
          <div className="mb-2 font-semibold text-amber-100">Style</div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-white/60">Border colour
              <input type="color" value={borderColor} onChange={(event) => setBorderColor(event.target.value.toUpperCase())} className="mt-1 h-9 w-full rounded-md border border-white/15 bg-black/30 p-1" />
            </label>
            <label className="text-[11px] text-white/60">Background colour
              <input type="color" value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value.toUpperCase())} className="mt-1 h-9 w-full rounded-md border border-white/15 bg-black/30 p-1" />
            </label>
            <label className="text-[11px] text-white/60">Colour strength 1–10
              <input type="number" min={1} max={10} value={colourStrength} onChange={(event) => setColourStrength(Math.max(1, Math.min(10, Number(event.target.value) || 1)))} className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-white" />
            </label>
            <label className="text-[11px] text-white/60">Border width 1–5
              <input type="number" min={1} max={5} value={borderWidth} onChange={(event) => setBorderWidth(Math.max(1, Math.min(5, Number(event.target.value) || 1)))} className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-white" />
            </label>
          </div>
          {selected.textColour ? (
            <label className="mt-2 block text-[11px] text-white/60">Text colour
              <input type="color" value={textColor} onChange={(event) => setTextColor(event.target.value.toUpperCase())} className="mt-1 h-9 w-full rounded-md border border-white/15 bg-black/30 p-1" />
            </label>
          ) : null}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" disabled={saving} onClick={() => void saveStyle()} className="rounded-lg border border-emerald-400/60 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-50">Save Style</button>
            <button type="button" disabled={saving} onClick={() => void restoreCoreStyle()} className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 disabled:opacity-50">Use Core Style</button>
          </div>
          {message ? <div className="mt-2 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[10px] leading-4 text-white/70">{message}</div> : null}
        </div>,
        host,
      ) : null}
    </>
  );
}
