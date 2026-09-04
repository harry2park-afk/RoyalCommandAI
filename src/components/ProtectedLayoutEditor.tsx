"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  emptyRoomHeaderLayoutConfig,
  RoomHeaderLayoutConfig,
  RoomHeaderLayoutElementId,
  RoomHeaderLayoutPatch,
  sanitiseRoomHeaderLayoutConfig,
} from "@/lib/layout-editor";

type RegistryItem = {
  id: RoomHeaderLayoutElementId;
  label: string;
  selector: string;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  movable: boolean;
  resizable: boolean;
  textEditable: boolean;
  fontEditable: boolean;
};

type OriginalState = {
  translate: string;
  width: string;
  height: string;
  fontSize: string;
  text: string | null;
};

type RectState = { left: number; top: number; width: number; height: number };

type PointerSession = {
  mode: "move" | "resize";
  direction?: string;
  startX: number;
  startY: number;
  startRect: DOMRect;
  startPatch: RoomHeaderLayoutPatch;
};

const STORAGE_KEY = "royalcommand:layout:room-header:v1";
const HEADER_TOP = 0;
const HEADER_BOTTOM = 92;
const SNAP = 2;

const REGISTRY: RegistryItem[] = [
  { id: "build-your-room", label: "Build Your Room", selector: "#rc-room-finder-top", minWidth: 80, maxWidth: 260, minHeight: 24, maxHeight: 44, movable: true, resizable: true, textEditable: true, fontEditable: true },
  { id: "integrated-answer", label: "Integrated Answer", selector: "[data-rc-native-synthesis-button='true']", minWidth: 90, maxWidth: 260, minHeight: 24, maxHeight: 44, movable: true, resizable: true, textEditable: false, fontEditable: true },
  { id: "ai-warehouse", label: "AI Warehouse", selector: "button[title^='AI Warehouse']", minWidth: 90, maxWidth: 260, minHeight: 24, maxHeight: 44, movable: true, resizable: true, textEditable: true, fontEditable: true },
  { id: "ai-chatgpt", label: "ChatGPT", selector: "button[title^='ChatGPT']", minWidth: 54, maxWidth: 190, minHeight: 22, maxHeight: 44, movable: true, resizable: true, textEditable: true, fontEditable: true },
  { id: "ai-claude", label: "Claude", selector: "button[title^='Claude']", minWidth: 54, maxWidth: 190, minHeight: 22, maxHeight: 44, movable: true, resizable: true, textEditable: true, fontEditable: true },
  { id: "ai-gemini", label: "Gemini", selector: "button[title^='Gemini']", minWidth: 54, maxWidth: 190, minHeight: 22, maxHeight: 44, movable: true, resizable: true, textEditable: true, fontEditable: true },
  { id: "ai-grok", label: "Grok", selector: "button[title^='Grok']", minWidth: 54, maxWidth: 190, minHeight: 22, maxHeight: 44, movable: true, resizable: true, textEditable: true, fontEditable: true },
  { id: "ai-codex", label: "Codex", selector: "button[title^='OpenAI Codex']", minWidth: 54, maxWidth: 190, minHeight: 22, maxHeight: 44, movable: true, resizable: true, textEditable: true, fontEditable: true },
  { id: "ai-deepseek", label: "DeepSeek", selector: "button[title^='DeepSeek']", minWidth: 54, maxWidth: 190, minHeight: 22, maxHeight: 44, movable: true, resizable: true, textEditable: true, fontEditable: true },
  { id: "ai-perplexity", label: "Perplexity", selector: "button[title^='Perplexity']", minWidth: 54, maxWidth: 190, minHeight: 22, maxHeight: 44, movable: true, resizable: true, textEditable: true, fontEditable: true },
  { id: "ai-mistral", label: "Mistral", selector: "button[title^='Mistral']", minWidth: 54, maxWidth: 190, minHeight: 22, maxHeight: 44, movable: true, resizable: true, textEditable: true, fontEditable: true },
  { id: "ai-llama", label: "Llama", selector: "button[title^='Meta Llama']", minWidth: 54, maxWidth: 190, minHeight: 22, maxHeight: 44, movable: true, resizable: true, textEditable: true, fontEditable: true },
  { id: "ai-qwen", label: "Qwen", selector: "button[title^='Qwen']", minWidth: 54, maxWidth: 190, minHeight: 22, maxHeight: 44, movable: true, resizable: true, textEditable: true, fontEditable: true },
  { id: "language-picker", label: "Language", selector: ".rc-lang-picker > button", minWidth: 100, maxWidth: 260, minHeight: 26, maxHeight: 44, movable: true, resizable: true, textEditable: false, fontEditable: false },
  { id: "profile-button", label: "Profile", selector: "button[aria-label*='profile'],button[aria-label*='프로필'],button[title='My Profile'],button[title='내 프로필']", minWidth: 28, maxWidth: 64, minHeight: 28, maxHeight: 64, movable: true, resizable: true, textEditable: false, fontEditable: false },
];

const BY_ID = new Map(REGISTRY.map((item) => [item.id, item]));

function snap(value: number) {
  return Math.round(value / SNAP) * SNAP;
}

function cloneConfig(config: RoomHeaderLayoutConfig): RoomHeaderLayoutConfig {
  return JSON.parse(JSON.stringify(config)) as RoomHeaderLayoutConfig;
}

function directLabelTarget(element: HTMLElement, item: RegistryItem) {
  if (!item.textEditable && !item.fontEditable) return element;
  if (item.id === "build-your-room") return element;
  const spans = Array.from(element.children).filter((child): child is HTMLSpanElement => child instanceof HTMLSpanElement);
  const candidates = spans.filter((span) => !span.dataset.rcAiTick && (span.textContent || "").trim().length > 1);
  return candidates[candidates.length - 1] || element;
}

function elementRect(element: HTMLElement): RectState {
  const rect = element.getBoundingClientRect();
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

function overlap(a: DOMRect, b: DOMRect) {
  return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) > 1
    && Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)) > 1;
}

export default function ProtectedLayoutEditor() {
  const [roomPage, setRoomPage] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<RoomHeaderLayoutElementId | null>(null);
  const [config, setConfig] = useState<RoomHeaderLayoutConfig>(() => emptyRoomHeaderLayoutConfig());
  const [draft, setDraft] = useState<RoomHeaderLayoutConfig>(() => emptyRoomHeaderLayoutConfig());
  const [rect, setRect] = useState<RectState | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const pointerSession = useRef<PointerSession | null>(null);
  const originals = useRef(new Map<RoomHeaderLayoutElementId, OriginalState>());
  const history = useRef<RoomHeaderLayoutPatch[]>([]);

  const selected = selectedId ? BY_ID.get(selectedId) || null : null;
  const selectedPatch = selectedId ? draft.elements[selectedId] || {} : {};

  const visibleItems = useMemo(() => REGISTRY.map((item) => ({
    ...item,
    visible: typeof document !== "undefined" ? Boolean(document.querySelector(item.selector)?.getClientRects().length) : false,
  })), [rect, roomPage, editMode]);

  function resolve(item: RegistryItem | null) {
    if (!item || typeof document === "undefined") return null;
    const node = document.querySelector(item.selector);
    return node instanceof HTMLElement ? node : null;
  }

  function captureOriginal(item: RegistryItem, element: HTMLElement) {
    if (originals.current.has(item.id)) return;
    const target = directLabelTarget(element, item);
    originals.current.set(item.id, {
      translate: element.style.translate,
      width: element.style.width,
      height: element.style.height,
      fontSize: target.style.fontSize,
      text: item.textEditable ? target.textContent : null,
    });
  }

  function restoreOriginal(item: RegistryItem) {
    const element = resolve(item);
    const original = originals.current.get(item.id);
    if (!element || !original) return;
    const target = directLabelTarget(element, item);
    element.style.translate = original.translate;
    element.style.width = original.width;
    element.style.height = original.height;
    target.style.fontSize = original.fontSize;
    if (item.textEditable && original.text !== null) target.textContent = original.text;
  }

  function applyPatch(item: RegistryItem, patch: RoomHeaderLayoutPatch | undefined) {
    const element = resolve(item);
    if (!element) return;
    captureOriginal(item, element);
    const original = originals.current.get(item.id)!;
    const target = directLabelTarget(element, item);
    const x = patch?.offsetX ?? 0;
    const y = patch?.offsetY ?? 0;
    element.style.setProperty("translate", `${x}px ${y}px`, "important");
    if (patch?.width !== undefined) element.style.setProperty("width", `${patch.width}px`, "important");
    else element.style.width = original.width;
    if (patch?.height !== undefined) element.style.setProperty("height", `${patch.height}px`, "important");
    else element.style.height = original.height;
    if (item.fontEditable && patch?.fontSize !== undefined) target.style.setProperty("font-size", `${patch.fontSize}px`, "important");
    else if (item.fontEditable) target.style.fontSize = original.fontSize;
    if (item.textEditable && patch?.label) target.textContent = patch.label;
    else if (item.textEditable && original.text !== null) target.textContent = original.text;
  }

  function applyConfig(next: RoomHeaderLayoutConfig) {
    for (const item of REGISTRY) applyPatch(item, next.elements[item.id]);
  }

  function refreshRect() {
    const element = resolve(selected);
    setRect(element ? elementRect(element) : null);
  }

  useEffect(() => {
    const isRoom = /^\/rooms\/[^/]+\/?$/.test(window.location.pathname);
    setRoomPage(isRoom);
    if (!isRoom) return;

    let local = emptyRoomHeaderLayoutConfig();
    try {
      const parsed = sanitiseRoomHeaderLayoutConfig(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"));
      if (parsed) local = parsed;
    } catch {}
    setConfig(local);
    setDraft(cloneConfig(local));
    applyConfig(local);

    const params = new URLSearchParams(window.location.search);
    setEditMode(params.get("layoutEdit") === "1");

    let cancelled = false;
    void fetch("/api/user/preferences", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => {
        if (cancelled) return;
        const remote = sanitiseRoomHeaderLayoutConfig(data?.preferences?.layoutRoomHeaderV1);
        if (!remote) return;
        setConfig(remote);
        setDraft(cloneConfig(remote));
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(remote)); } catch {}
        applyConfig(remote);
      })
      .catch(() => undefined);

    const observer = new MutationObserver(() => {
      applyConfig(editMode ? draft : local);
      requestAnimationFrame(refreshRect);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    const onResize = () => requestAnimationFrame(refreshRect);
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
    // Initial room-page mount only. Runtime updates are applied by dedicated effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!roomPage) return;
    applyConfig(editMode ? draft : config);
    requestAnimationFrame(refreshRect);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, config, editMode, selectedId, roomPage]);

  useEffect(() => {
    if (!roomPage || !editMode) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-rc-layout-editor-ui='true']")) return;
      for (const item of REGISTRY) {
        const element = resolve(item);
        if (!element || !element.contains(target)) continue;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        setSelectedId(item.id);
        setMessage(`${item.label} selected. Only this button can be edited now.`);
        history.current = [];
        requestAnimationFrame(refreshRect);
        return;
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [roomPage, editMode]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const session = pointerSession.current;
      if (!session || !selectedId || !selected) return;
      event.preventDefault();
      const dx = event.clientX - session.startX;
      const dy = event.clientY - session.startY;
      const base = session.startPatch;
      const viewportWidth = window.innerWidth;
      let next: RoomHeaderLayoutPatch = { ...base };

      if (session.mode === "move") {
        const proposedLeft = Math.max(0, Math.min(viewportWidth - session.startRect.width, session.startRect.left + dx));
        const proposedTop = Math.max(HEADER_TOP, Math.min(HEADER_BOTTOM - session.startRect.height, session.startRect.top + dy));
        next.offsetX = snap((base.offsetX || 0) + proposedLeft - session.startRect.left);
        next.offsetY = snap((base.offsetY || 0) + proposedTop - session.startRect.top);
      } else {
        const dir = session.direction || "se";
        let width = session.startRect.width;
        let height = session.startRect.height;
        let offsetX = base.offsetX || 0;
        let offsetY = base.offsetY || 0;

        if (dir.includes("e")) width = session.startRect.width + dx;
        if (dir.includes("s")) height = session.startRect.height + dy;
        if (dir.includes("w")) {
          width = session.startRect.width - dx;
          offsetX += dx;
        }
        if (dir.includes("n")) {
          height = session.startRect.height - dy;
          offsetY += dy;
        }

        width = snap(Math.max(selected.minWidth, Math.min(selected.maxWidth, width)));
        height = snap(Math.max(selected.minHeight, Math.min(selected.maxHeight, height)));
        const maxX = Math.max(0, viewportWidth - width);
        const maxY = Math.max(HEADER_TOP, HEADER_BOTTOM - height);
        const nextLeft = Math.max(0, Math.min(maxX, session.startRect.left + (offsetX - (base.offsetX || 0))));
        const nextTop = Math.max(HEADER_TOP, Math.min(maxY, session.startRect.top + (offsetY - (base.offsetY || 0))));
        next.width = width;
        next.height = height;
        next.offsetX = snap((base.offsetX || 0) + nextLeft - session.startRect.left);
        next.offsetY = snap((base.offsetY || 0) + nextTop - session.startRect.top);
      }

      setDraft((current) => ({ ...current, elements: { ...current.elements, [selectedId]: next } }));
    };

    const onUp = () => { pointerSession.current = null; };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [selectedId, selected]);

  function beginPointer(event: React.PointerEvent, mode: "move" | "resize", direction?: string) {
    if (!selectedId || !selected) return;
    const element = resolve(selected);
    if (!element) return;
    event.preventDefault();
    event.stopPropagation();
    const patch = { ...(draft.elements[selectedId] || {}) };
    history.current.push(patch);
    pointerSession.current = {
      mode,
      direction,
      startX: event.clientX,
      startY: event.clientY,
      startRect: element.getBoundingClientRect(),
      startPatch: patch,
    };
  }

  function updateSelected(patch: Partial<RoomHeaderLayoutPatch>, remember = false) {
    if (!selectedId) return;
    if (remember) history.current.push({ ...(draft.elements[selectedId] || {}) });
    setDraft((current) => ({
      ...current,
      elements: {
        ...current.elements,
        [selectedId]: { ...(current.elements[selectedId] || {}), ...patch },
      },
    }));
  }

  function validateSelected() {
    if (!selectedId || !selected) return "Select one button first.";
    const element = resolve(selected);
    if (!element) return `${selected.label} is not currently visible.`;
    const current = element.getBoundingClientRect();
    if (current.left < -0.5 || current.right > window.innerWidth + 0.5 || current.top < HEADER_TOP - 0.5 || current.bottom > HEADER_BOTTOM + 0.5) {
      return "The button is outside the protected Room Header zone.";
    }
    for (const item of REGISTRY) {
      if (item.id === selectedId) continue;
      const other = resolve(item);
      if (!other || other.getClientRects().length === 0) continue;
      if (overlap(current, other.getBoundingClientRect())) return `Overlap detected with ${item.label}. Move or resize before saving.`;
    }
    return "";
  }

  async function saveSelected() {
    if (!selectedId) return;
    const problem = validateSelected();
    if (problem) { setMessage(problem); return; }
    const next: RoomHeaderLayoutConfig = {
      ...draft,
      layoutVersion: Math.max(config.layoutVersion + 1, draft.layoutVersion + 1),
      updatedAt: new Date().toISOString(),
    };
    setSaving(true);
    setMessage("Saving this button…");
    try {
      const response = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layoutRoomHeaderV1: next }),
      });
      if (!response.ok) throw new Error("Server rejected the layout save.");
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      setConfig(next);
      setDraft(cloneConfig(next));
      setSelectedId(null);
      setRect(null);
      history.current = [];
      setMessage("Saved and locked. Select another button, or Finish & Lock.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Layout save failed. The button remains in Edit Mode.");
    } finally {
      setSaving(false);
    }
  }

  function cancelSelected() {
    if (!selectedId) return;
    const next = cloneConfig(config);
    setDraft(next);
    applyConfig(next);
    setSelectedId(null);
    setRect(null);
    history.current = [];
    setMessage("Current button changes cancelled.");
  }

  function resetSelected() {
    if (!selectedId || !selected) return;
    history.current.push({ ...(draft.elements[selectedId] || {}) });
    restoreOriginal(selected);
    setDraft((current) => {
      const elements = { ...current.elements };
      delete elements[selectedId];
      return { ...current, elements };
    });
    setMessage("This button is reset to the Core layout. Press Save This Button to keep the reset.");
  }

  function undoSelected() {
    if (!selectedId || !history.current.length) return;
    const previous = history.current.pop()!;
    setDraft((current) => ({ ...current, elements: { ...current.elements, [selectedId]: previous } }));
    setMessage("Undid the last change for this button.");
  }

  function finishAndLock() {
    if (selectedId) {
      setMessage("Save or Cancel the selected button before finishing.");
      return;
    }
    setEditMode(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("layoutEdit");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    setMessage("");
  }

  if (!roomPage) return null;
  if (!editMode) return null;

  const handles = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
  const handleClass: Record<string, string> = {
    n: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-n-resize",
    ne: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-ne-resize",
    e: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-e-resize",
    se: "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-se-resize",
    s: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-s-resize",
    sw: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-sw-resize",
    w: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-w-resize",
    nw: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nw-resize",
  };

  return (
    <>
      <div data-rc-layout-editor-ui="true" className="fixed left-1/2 top-[96px] z-[1000] -translate-x-1/2 rounded-b-xl border border-amber-300/70 bg-[#111827]/95 px-3 py-2 text-xs text-white shadow-2xl backdrop-blur">
        <div className="flex items-center gap-2">
          <strong className="text-amber-200">LAYOUT EDIT MODE</strong>
          <span className="text-white/60">One button at a time</span>
          <button type="button" onClick={finishAndLock} className="rounded-md border border-emerald-400/60 bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-200">Finish & Lock</button>
        </div>
      </div>

      {selected && rect ? (
        <>
          <div data-rc-layout-editor-ui="true" className="pointer-events-none fixed z-[998] border-t border-dashed border-amber-300/60" style={{ left: 0, right: 0, top: rect.top + rect.height / 2 }} />
          <div data-rc-layout-editor-ui="true" className="pointer-events-none fixed z-[998] border-l border-dashed border-amber-300/60" style={{ top: HEADER_TOP, height: HEADER_BOTTOM - HEADER_TOP, left: rect.left + rect.width / 2 }} />
          <div
            data-rc-layout-editor-ui="true"
            className="fixed z-[999] border-2 border-amber-300 bg-amber-300/5 shadow-[0_0_0_2px_rgba(15,23,42,.8),0_0_22px_rgba(251,191,36,.35)]"
            style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height, touchAction: "none" }}
            onPointerDown={(event) => selected.movable && beginPointer(event, "move")}
          >
            {selected.resizable ? handles.map((direction) => (
              <button
                key={direction}
                type="button"
                aria-label={`Resize ${direction}`}
                className={`absolute h-3 w-3 rounded-full border border-white bg-amber-300 shadow ${handleClass[direction]}`}
                onPointerDown={(event) => beginPointer(event, "resize", direction)}
              />
            )) : null}
          </div>
        </>
      ) : null}

      <aside data-rc-layout-editor-ui="true" className="fixed bottom-4 right-4 z-[1001] w-[330px] max-h-[calc(100vh-130px)] overflow-y-auto rounded-2xl border border-amber-300/50 bg-[#07101d]/98 p-4 text-sm text-white shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-amber-200">Protected UI Editor</div>
            <div className="text-[11px] text-white/55">Click one visible button to edit it.</div>
          </div>
          <span className="rounded-md border border-white/15 px-2 py-1 text-[10px] text-white/60">LOCKED EXCEPT SELECTED</span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1">
          {visibleItems.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={!item.visible}
              onClick={() => { setSelectedId(item.id); history.current = []; setMessage(`${item.label} selected.`); requestAnimationFrame(refreshRect); }}
              className={`rounded-md border px-2 py-1.5 text-[10px] ${selectedId === item.id ? "border-amber-300 bg-amber-300/15 text-amber-100" : "border-white/10 bg-white/[0.03] text-white/70"} disabled:cursor-not-allowed disabled:opacity-25`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {selected ? (
          <div className="mt-4 border-t border-white/10 pt-3">
            <div className="mb-2 font-semibold text-amber-100">Editing: {selected.label}</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-white/60">X offset
                <input type="number" value={selectedPatch.offsetX ?? 0} onFocus={() => history.current.push({ ...selectedPatch })} onChange={(event) => updateSelected({ offsetX: Number(event.target.value) || 0 })} onKeyDown={(event) => { if (event.key === "Enter") void saveSelected(); }} className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-white" />
              </label>
              <label className="text-[11px] text-white/60">Y offset
                <input type="number" value={selectedPatch.offsetY ?? 0} onFocus={() => history.current.push({ ...selectedPatch })} onChange={(event) => updateSelected({ offsetY: Number(event.target.value) || 0 })} onKeyDown={(event) => { if (event.key === "Enter") void saveSelected(); }} className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-white" />
              </label>
              <label className="text-[11px] text-white/60">Width px
                <input type="number" min={selected.minWidth} max={selected.maxWidth} value={Math.round(selectedPatch.width ?? rect?.width ?? 0)} disabled={!selected.resizable} onFocus={() => history.current.push({ ...selectedPatch })} onChange={(event) => updateSelected({ width: Math.max(selected.minWidth, Math.min(selected.maxWidth, Number(event.target.value) || selected.minWidth)) })} onKeyDown={(event) => { if (event.key === "Enter") void saveSelected(); }} className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-white disabled:opacity-35" />
              </label>
              <label className="text-[11px] text-white/60">Height px
                <input type="number" min={selected.minHeight} max={selected.maxHeight} value={Math.round(selectedPatch.height ?? rect?.height ?? 0)} disabled={!selected.resizable} onFocus={() => history.current.push({ ...selectedPatch })} onChange={(event) => updateSelected({ height: Math.max(selected.minHeight, Math.min(selected.maxHeight, Number(event.target.value) || selected.minHeight)) })} onKeyDown={(event) => { if (event.key === "Enter") void saveSelected(); }} className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-white disabled:opacity-35" />
              </label>
            </div>

            {selected.fontEditable ? (
              <label className="mt-2 block text-[11px] text-white/60">Font size px
                <input type="number" min={8} max={32} value={selectedPatch.fontSize ?? 12} onFocus={() => history.current.push({ ...selectedPatch })} onChange={(event) => updateSelected({ fontSize: Math.max(8, Math.min(32, Number(event.target.value) || 12)) })} onKeyDown={(event) => { if (event.key === "Enter") void saveSelected(); }} className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-white" />
              </label>
            ) : null}

            {selected.textEditable ? (
              <label className="mt-2 block text-[11px] text-white/60">Button text
                <input type="text" maxLength={80} value={selectedPatch.label ?? ""} placeholder="Leave blank to use Core label" onFocus={() => history.current.push({ ...selectedPatch })} onChange={(event) => updateSelected({ label: event.target.value })} onKeyDown={(event) => { if (event.key === "Enter") void saveSelected(); }} className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-white" />
              </label>
            ) : null}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => void saveSelected()} disabled={saving} className="rounded-lg border border-emerald-400/60 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-50">Save This Button</button>
              <button type="button" onClick={cancelSelected} className="rounded-lg border border-white/20 bg-white/[0.04] px-3 py-2 text-xs">Cancel This Button</button>
              <button type="button" onClick={undoSelected} disabled={!history.current.length} className="rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-200 disabled:opacity-35">Undo</button>
              <button type="button" onClick={resetSelected} className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">Reset This Button</button>
            </div>
          </div>
        ) : null}

        {message ? <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] leading-4 text-white/75">{message}</div> : null}
        <div className="mt-3 text-[10px] leading-4 text-white/40">Saved layout is user-scoped. Core DOM order is not rewritten. Dragging uses visual offsets inside the protected 92px Room Header zone.</div>
      </aside>
    </>
  );
}
