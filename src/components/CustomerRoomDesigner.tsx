"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  CustomerRoomDesignConfig,
  CustomerRoomDesignElementId,
  CustomerRoomDesignPatch,
  emptyCustomerRoomDesignConfig,
  sanitiseCustomerRoomDesignConfig,
} from "@/lib/customer-room-designer";

type RegistryItem = {
  id: CustomerRoomDesignElementId;
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
  visibilityEditable?: boolean;
  protectedAction?: boolean;
  element?: HTMLElement;
};

type OriginalState = {
  translate: string;
  width: string;
  height: string;
  borderColor: string;
  backgroundColor: string;
  borderWidth: string;
  borderRadius: string;
  fontSize: string;
  textColor: string;
  display: string;
  textNode: Text | null;
  text: string | null;
};

type RectState = { left: number; top: number; width: number; height: number };
type PointerSession = {
  mode: "move" | "resize";
  direction?: string;
  startX: number;
  startY: number;
  startRect: DOMRect;
  startPatch: CustomerRoomDesignPatch;
};

const HEADER_TOP = 0;
const SNAP = 2;
const UUID_ROOM = /^\/rooms\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/?$/i;
const BUTTON_SELECTOR = "button,[role='button'],input[type='button'],input[type='submit']";
const PROTECTED_ACTION = /(?:delete|remove|erase|payment|pay|purchase|checkout|approve|approval|security|permission|authori[sz]e|submit|send|connect|sign[ -]?(?:in|out)|profile|account|close|new chat|save|finish|minimi[sz]e|room management|voice|microphone|attach|language|삭제|제거|결제|송금|승인|보안|권한|보내기|전송|연결|로그인|로그아웃|프로필|계정|닫기|새 채팅|저장|완료|줄이기|룸 관리|음성|마이크|첨부|언어|메뉴에서 빼기)/i;

const REGISTRY: RegistryItem[] = [
  { id: "build-your-room", label: "Build Your Room", selector: "#rc-room-finder-top", minWidth: 80, maxWidth: 260, minHeight: 24, maxHeight: 44, movable: true, resizable: true, textEditable: true, fontEditable: true, visibilityEditable: true, protectedAction: false },
  { id: "integrated-answer", label: "Integrated Answer", selector: "[data-rc-native-synthesis-button='true']", minWidth: 90, maxWidth: 260, minHeight: 24, maxHeight: 44, movable: true, resizable: true, textEditable: false, fontEditable: true },
  { id: "ai-warehouse", label: "AI Warehouse", selector: "button[title^='AI Warehouse']", minWidth: 90, maxWidth: 260, minHeight: 24, maxHeight: 44, movable: true, resizable: true, textEditable: true, fontEditable: true },
  { id: "ai-chatgpt", label: "ChatGPT", selector: "button[title^='ChatGPT']", minWidth: 54, maxWidth: 190, minHeight: 22, maxHeight: 44, movable: true, resizable: true, textEditable: false, fontEditable: true },
  { id: "ai-claude", label: "Claude", selector: "button[title^='Claude']", minWidth: 54, maxWidth: 190, minHeight: 22, maxHeight: 44, movable: true, resizable: true, textEditable: false, fontEditable: true },
  { id: "ai-gemini", label: "Gemini", selector: "button[title^='Gemini']", minWidth: 54, maxWidth: 190, minHeight: 22, maxHeight: 44, movable: true, resizable: true, textEditable: false, fontEditable: true },
  { id: "ai-grok", label: "Grok", selector: "button[title^='Grok']", minWidth: 54, maxWidth: 190, minHeight: 22, maxHeight: 44, movable: true, resizable: true, textEditable: false, fontEditable: true },
  { id: "ai-codex", label: "Codex", selector: "button[title^='OpenAI Codex']", minWidth: 54, maxWidth: 190, minHeight: 22, maxHeight: 44, movable: true, resizable: true, textEditable: false, fontEditable: true },
  { id: "ai-deepseek", label: "DeepSeek", selector: "button[title^='DeepSeek']", minWidth: 54, maxWidth: 190, minHeight: 22, maxHeight: 44, movable: true, resizable: true, textEditable: false, fontEditable: true },
  { id: "ai-perplexity", label: "Perplexity", selector: "button[title^='Perplexity']", minWidth: 54, maxWidth: 190, minHeight: 22, maxHeight: 44, movable: true, resizable: true, textEditable: false, fontEditable: true },
  { id: "ai-mistral", label: "Mistral", selector: "button[title^='Mistral']", minWidth: 54, maxWidth: 190, minHeight: 22, maxHeight: 44, movable: true, resizable: true, textEditable: false, fontEditable: true },
  { id: "ai-llama", label: "Llama", selector: "button[title^='Meta Llama']", minWidth: 54, maxWidth: 190, minHeight: 22, maxHeight: 44, movable: true, resizable: true, textEditable: false, fontEditable: true },
  { id: "ai-qwen", label: "Qwen", selector: "button[title^='Qwen']", minWidth: 54, maxWidth: 190, minHeight: 22, maxHeight: 44, movable: true, resizable: true, textEditable: false, fontEditable: true },
  { id: "profile-button", label: "Profile", selector: "button[aria-label*='profile'],button[aria-label*='프로필'],button[title='My Profile'],button[title='내 프로필']", minWidth: 28, maxWidth: 64, minHeight: 28, maxHeight: 64, movable: true, resizable: true, textEditable: false, fontEditable: false },
];

const ORIGINALS = new WeakMap<HTMLElement, OriginalState>();
const ELEMENT_IDS = new WeakMap<HTMLElement, CustomerRoomDesignElementId>();
const RUNTIME_IDS = new Map<string, CustomerRoomDesignElementId>();

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(8, "0").slice(0, 8);
}

function readableLabel(element: HTMLElement) {
  if (element instanceof HTMLInputElement) return element.value || element.name || "Button";
  return element.getAttribute("aria-label")
    || element.getAttribute("title")
    || (element.textContent || "").trim().replace(/\s+/g, " ")
    || "Button";
}

function semanticIdentity(element: HTMLElement) {
  const explicit = element.id
    || element.getAttribute("data-testid")
    || element.getAttribute("name")
    || element.getAttribute("aria-label")
    || element.getAttribute("title")
    || readableLabel(element);
  const parent = element.closest("header,nav,main,aside,section,[role='dialog']");
  const surface = parent?.getAttribute("aria-label") || parent?.id || parent?.tagName || "room";
  return `${surface}|${element.tagName}|${explicit}`.toLowerCase();
}

function structuralIdentity(element: HTMLElement) {
  const surface = element.closest("header,nav,main,aside,section,[role='dialog']") || document.body;
  const buttons = Array.from(surface.querySelectorAll(BUTTON_SELECTOR))
    .filter((node): node is HTMLElement => node instanceof HTMLElement)
    .filter((node) => !node.closest("[data-rc-customer-room-designer-ui='true']"));
  return `${surface.tagName}|${surface.id}|${buttons.indexOf(element)}|${element.tagName}`.toLowerCase();
}

function discoverRegistry() {
  const items: RegistryItem[] = [];
  const claimed = new Set<HTMLElement>();
  for (const item of REGISTRY) {
    const element = resolveItem(item);
    if (element) {
      const protectedAction = item.protectedAction || PROTECTED_ACTION.test(`${item.label} ${item.selector} ${readableLabel(element)}`);
      if (protectedAction) continue;
      items.push({
        ...item,
        element,
        textEditable: !protectedAction,
        visibilityEditable: protectedAction ? false : item.visibilityEditable !== false,
        protectedAction,
      });
      claimed.add(element);
    }
  }

  const occurrences = new Map<string, number>();
  const candidates = Array.from(document.querySelectorAll(BUTTON_SELECTOR))
    .filter((node): node is HTMLElement => node instanceof HTMLElement)
    .filter((node) => !node.closest("[data-rc-customer-room-designer-ui='true']"))
    .filter((node) => node.getClientRects().length > 0);

  for (const element of candidates) {
    if (claimed.has(element)) continue;
    const identity = semanticIdentity(element);
    const occurrence = occurrences.get(identity) || 0;
    occurrences.set(identity, occurrence + 1);
    const existingId = element.dataset.rcDesignerId;
    const structure = structuralIdentity(element);
    const id = existingId && /^auto-[a-z0-9]{8}$/.test(existingId)
      ? existingId
      : ELEMENT_IDS.get(element) || RUNTIME_IDS.get(structure) || `auto-${stableHash(`${identity}|${occurrence}`)}`;
    ELEMENT_IDS.set(element, id);
    RUNTIME_IDS.set(structure, id);
    element.dataset.rcDesignerId = id;
    const label = readableLabel(element).slice(0, 80);
    const protectedAction = PROTECTED_ACTION.test(`${identity} ${label}`);
    if (protectedAction) continue;
    items.push({
      id,
      label,
      selector: `[data-rc-designer-id='${id}']`,
      minWidth: 24,
      maxWidth: 520,
      minHeight: 20,
      maxHeight: 160,
      movable: true,
      resizable: true,
      textEditable: !protectedAction,
      fontEditable: true,
      visibilityEditable: !protectedAction,
      protectedAction,
      element,
    });
  }
  return items;
}

function sameRegistry(left: RegistryItem[], right: RegistryItem[]) {
  return left.length === right.length
    && left.every((item, index) => item.id === right[index]?.id && item.element === right[index]?.element);
}

function snap(value: number) {
  return Math.round(value / SNAP) * SNAP;
}

function cloneConfig(config: CustomerRoomDesignConfig): CustomerRoomDesignConfig {
  return JSON.parse(JSON.stringify(config)) as CustomerRoomDesignConfig;
}

function resolveItem(item: RegistryItem | null) {
  if (!item || typeof document === "undefined") return null;
  if (item.element?.isConnected) return item.element;
  const node = document.querySelector(item.selector);
  return node instanceof HTMLElement ? node : null;
}

function directLabelTarget(element: HTMLElement, item: RegistryItem) {
  if (!item.textEditable && !item.fontEditable) return element;
  if (item.id === "build-your-room") return element;
  const spans = Array.from(element.children).filter((child): child is HTMLSpanElement => child instanceof HTMLSpanElement);
  const candidates = spans.filter((span) => !span.dataset.rcAiTick && (span.textContent || "").trim().length > 1);
  return candidates[candidates.length - 1] || element;
}

function editableTextNode(element: HTMLElement) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node instanceof Text && node.nodeValue?.trim() && !node.parentElement?.closest("svg")) return node;
    node = walker.nextNode();
  }
  return null;
}

function captureOriginal(item: RegistryItem, element: HTMLElement) {
  if (ORIGINALS.has(element)) return;
  const target = directLabelTarget(element, item);
  const textNode = item.textEditable ? editableTextNode(element) : null;
  ORIGINALS.set(element, {
    translate: element.style.translate,
    width: element.style.width,
    height: element.style.height,
    borderColor: element.style.borderColor,
    backgroundColor: element.style.backgroundColor,
    borderWidth: element.style.borderWidth,
    borderRadius: element.style.borderRadius,
    fontSize: target.style.fontSize,
    textColor: target.style.color,
    display: element.style.display,
    textNode,
    text: textNode?.nodeValue || null,
  });
}

function restoreProperty(element: HTMLElement, property: string, value: string) {
  if (value) element.style.setProperty(property, value);
  else element.style.removeProperty(property);
}

function restoreOriginal(item: RegistryItem, element: HTMLElement) {
  const original = ORIGINALS.get(element);
  if (!original) return;
  const target = directLabelTarget(element, item);
  restoreProperty(element, "translate", original.translate);
  restoreProperty(element, "width", original.width);
  restoreProperty(element, "height", original.height);
  restoreProperty(element, "border-color", original.borderColor);
  restoreProperty(element, "background-color", original.backgroundColor);
  restoreProperty(element, "border-width", original.borderWidth);
  restoreProperty(element, "border-radius", original.borderRadius);
  restoreProperty(element, "display", original.display);
  if (item.fontEditable) restoreProperty(target, "font-size", original.fontSize);
  if (item.fontEditable) restoreProperty(target, "color", original.textColor);
  if (item.textEditable && original.textNode && original.text !== null && original.textNode.nodeValue !== original.text) original.textNode.nodeValue = original.text;
}

function strengthColour(hex: string, strength: number) {
  const safe = /^#[0-9A-F]{6}$/i.test(hex) ? hex : "#000000";
  const r = Number.parseInt(safe.slice(1, 3), 16);
  const g = Number.parseInt(safe.slice(3, 5), 16);
  const b = Number.parseInt(safe.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(1, Math.min(10, Math.round(strength))) / 10})`;
}

function applyPatch(item: RegistryItem, patch: CustomerRoomDesignPatch | undefined) {
  const element = resolveItem(item);
  if (!element) return;
  captureOriginal(item, element);
  if (!patch) {
    restoreOriginal(item, element);
    return;
  }
  const original = ORIGINALS.get(element);
  if (!original) return;
  const target = directLabelTarget(element, item);

  element.style.setProperty("translate", `${patch.offsetX ?? 0}px ${patch.offsetY ?? 0}px`, "important");
  if (patch.width !== undefined) element.style.setProperty("width", `${patch.width}px`, "important");
  else restoreProperty(element, "width", original.width);
  if (patch.height !== undefined) element.style.setProperty("height", `${patch.height}px`, "important");
  else restoreProperty(element, "height", original.height);

  const strength = patch.colourStrength ?? 10;
  if (patch.borderColor) element.style.setProperty("border-color", strengthColour(patch.borderColor, strength), "important");
  else restoreProperty(element, "border-color", original.borderColor);
  if (patch.backgroundColor) element.style.setProperty("background-color", strengthColour(patch.backgroundColor, strength), "important");
  else restoreProperty(element, "background-color", original.backgroundColor);
  if (patch.borderWidth !== undefined) element.style.setProperty("border-width", `${patch.borderWidth}px`, "important");
  else restoreProperty(element, "border-width", original.borderWidth);
  if (patch.borderRadius !== undefined) element.style.setProperty("border-radius", `${patch.borderRadius}px`, "important");
  else restoreProperty(element, "border-radius", original.borderRadius);
  if (item.visibilityEditable !== false && patch.visible === false) element.style.setProperty("display", "none", "important");
  else restoreProperty(element, "display", original.display);

  if (item.fontEditable && patch.fontSize !== undefined) target.style.setProperty("font-size", `${patch.fontSize}px`, "important");
  else if (item.fontEditable) restoreProperty(target, "font-size", original.fontSize);
  if (item.fontEditable && patch.textColor) target.style.setProperty("color", patch.textColor, "important");
  else if (item.fontEditable) restoreProperty(target, "color", original.textColor);
  if (item.textEditable) {
    const wanted = patch.label || original.text;
    if (original.textNode && wanted !== null && wanted !== undefined && original.textNode.nodeValue !== wanted) original.textNode.nodeValue = wanted;
  }
}

function applyConfig(config: CustomerRoomDesignConfig, registry: RegistryItem[]) {
  for (const item of registry) applyPatch(item, config.elements[item.id]);
}

export default function CustomerRoomDesigner() {
  const pathname = usePathname();
  const roomId = UUID_ROOM.exec(pathname || "")?.[1] || null;
  const [canEdit, setCanEdit] = useState(false);
  const [designMode, setDesignMode] = useState(false);
  const [saved, setSaved] = useState<CustomerRoomDesignConfig>(emptyCustomerRoomDesignConfig);
  const [draft, setDraft] = useState<CustomerRoomDesignConfig>(emptyCustomerRoomDesignConfig);
  const [registry, setRegistry] = useState<RegistryItem[]>([]);
  const [selectedId, setSelectedId] = useState<CustomerRoomDesignElementId | null>(null);
  const [rect, setRect] = useState<RectState | null>(null);
  const [pointerSession, setPointerSession] = useState<PointerSession | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const selected = selectedId ? registry.find((item) => item.id === selectedId) || null : null;
  const selectedPatch = selectedId ? draft.elements[selectedId] || {} : {};

  const refreshUi = useCallback(() => {
    const nextRegistry = discoverRegistry();
    setRegistry((current) => sameRegistry(current, nextRegistry) ? current : nextRegistry);
    const nextSelected = selectedId ? nextRegistry.find((item) => item.id === selectedId) || null : null;
    const element = resolveItem(nextSelected);
    if (element) {
      const box = element.getBoundingClientRect();
      setRect({ left: box.left, top: box.top, width: box.width, height: box.height });
    } else {
      setRect(null);
    }
  }, [selectedId]);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    void fetch(`/api/rooms/${roomId}/designer`, { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => {
        if (cancelled || !data) return;
        const next = sanitiseCustomerRoomDesignConfig(data.design) || emptyCustomerRoomDesignConfig();
        setSaved(next);
        setDraft(cloneConfig(next));
        setCanEdit(data.canEdit === true);
        const requested = new URLSearchParams(window.location.search).get("roomDesign") === "1";
        setDesignMode(data.canEdit === true && requested);
        const initialRegistry = discoverRegistry();
        applyConfig(next, initialRegistry);
        window.requestAnimationFrame(() => setRegistry(initialRegistry));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    const render = () => {
      const nextRegistry = discoverRegistry();
      setRegistry((current) => sameRegistry(current, nextRegistry) ? current : nextRegistry);
      applyConfig(designMode ? draft : saved, nextRegistry);
      window.requestAnimationFrame(refreshUi);
    };
    const observer = new MutationObserver(render);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("resize", render);
    queueMicrotask(render);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", render);
    };
  }, [roomId, designMode, draft, saved, refreshUi]);

  useEffect(() => {
    if (!roomId || !designMode || !canEdit) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-rc-customer-room-designer-ui='true']")) return;
      for (const item of registry) {
        const element = resolveItem(item);
        if (!element || !element.contains(target)) continue;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        const suppressActivation = (clickEvent: MouseEvent) => {
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
          clickEvent.stopImmediatePropagation();
        };
        element.addEventListener("click", suppressActivation, { capture: true, once: true });
        window.setTimeout(() => element.removeEventListener("click", suppressActivation, true), 500);
        if (selectedId && selectedId !== item.id) {
          setMessage("Save or Cancel this button before selecting another one.");
          return;
        }
        window.setTimeout(() => {
          const box = element.getBoundingClientRect();
          setSelectedId(item.id);
          setRect({ left: box.left, top: box.top, width: box.width, height: box.height });
          setMessage(`${item.label} selected.`);
        }, 0);
        return;
      }
    };
    const blockButtonAction = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest("[data-rc-customer-room-designer-ui='true']")) return;
      if (!registry.some((item) => resolveItem(item)?.contains(target))) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("click", blockButtonAction, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("click", blockButtonAction, true);
    };
  }, [roomId, designMode, canEdit, selectedId, refreshUi, registry]);

  useEffect(() => {
    if (!designMode || !selectedId) return;
    const frame = window.requestAnimationFrame(refreshUi);
    return () => window.cancelAnimationFrame(frame);
  }, [designMode, selectedId, draft, refreshUi]);

  useEffect(() => {
    if (!pointerSession || !selectedId || !selected) return;
    const onMove = (event: PointerEvent) => {
      event.preventDefault();
      const dx = event.clientX - pointerSession.startX;
      const dy = event.clientY - pointerSession.startY;
      const base = pointerSession.startPatch;
      const next: CustomerRoomDesignPatch = { ...base };
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (pointerSession.mode === "move") {
        const proposedLeft = Math.max(0, Math.min(viewportWidth - pointerSession.startRect.width, pointerSession.startRect.left + dx));
        const proposedTop = Math.max(HEADER_TOP, Math.min(viewportHeight - pointerSession.startRect.height, pointerSession.startRect.top + dy));
        next.offsetX = snap((base.offsetX || 0) + proposedLeft - pointerSession.startRect.left);
        next.offsetY = snap((base.offsetY || 0) + proposedTop - pointerSession.startRect.top);
      } else {
        const dir = pointerSession.direction || "se";
        let width = pointerSession.startRect.width;
        let height = pointerSession.startRect.height;
        let offsetX = base.offsetX || 0;
        let offsetY = base.offsetY || 0;
        if (dir.includes("e")) width += dx;
        if (dir.includes("s")) height += dy;
        if (dir.includes("w")) { width -= dx; offsetX += dx; }
        if (dir.includes("n")) { height -= dy; offsetY += dy; }
        width = snap(Math.max(selected.minWidth, Math.min(selected.maxWidth, width)));
        height = snap(Math.max(selected.minHeight, Math.min(selected.maxHeight, height)));
        const nextLeft = Math.max(0, Math.min(viewportWidth - width, pointerSession.startRect.left + (offsetX - (base.offsetX || 0))));
        const nextTop = Math.max(HEADER_TOP, Math.min(viewportHeight - height, pointerSession.startRect.top + (offsetY - (base.offsetY || 0))));
        next.width = width;
        next.height = height;
        next.offsetX = snap((base.offsetX || 0) + nextLeft - pointerSession.startRect.left);
        next.offsetY = snap((base.offsetY || 0) + nextTop - pointerSession.startRect.top);
      }
      setDraft((current) => ({ ...current, elements: { ...current.elements, [selectedId]: next } }));
    };
    const onUp = () => setPointerSession(null);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [pointerSession, selectedId, selected]);

  function rememberCurrent() {
    if (!selectedId) return;
  }

  function updateSelected(patch: Partial<CustomerRoomDesignPatch>) {
    if (!selectedId) return;
    setDraft((current) => ({
      ...current,
      elements: {
        ...current.elements,
        [selectedId]: { ...(current.elements[selectedId] || {}), ...patch },
      },
    }));
  }

  function beginPointer(event: React.PointerEvent, mode: "move" | "resize", direction?: string) {
    if (!selectedId || !selected) return;
    const element = resolveItem(selected);
    if (!element) return;
    event.preventDefault();
    event.stopPropagation();
    const patch = { ...(draft.elements[selectedId] || {}) };
    setPointerSession({
      mode,
      direction,
      startX: event.clientX,
      startY: event.clientY,
      startRect: element.getBoundingClientRect(),
      startPatch: patch,
    });
  }

  function validateSelected() {
    if (!selectedId || !selected) return "Select one button first.";
    const element = resolveItem(selected);
    if (!element) return `${selected.label} is not visible.`;
    if (selectedPatch.visible === false && selected.visibilityEditable !== false) return "";
    const current = element.getBoundingClientRect();
    if (current.left < -0.5 || current.right > window.innerWidth + 0.5 || current.top < -0.5 || current.bottom > window.innerHeight + 0.5) {
      return "This button is outside the visible Room area.";
    }
    return "";
  }

  async function saveSelected() {
    if (!roomId || !selectedId) return;
    const problem = validateSelected();
    if (problem) { setMessage(problem); return; }
    const next: CustomerRoomDesignConfig = { ...draft, updatedAt: new Date().toISOString() };
    setSaving(true);
    setMessage("Saving this button…");
    try {
      const response = await fetch(`/api/rooms/${roomId}/designer`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design: next }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Room design save failed.");
      const savedNext = sanitiseCustomerRoomDesignConfig(data.design) || next;
      setSaved(savedNext);
      setDraft(cloneConfig(savedNext));
      setSelectedId(null);
      setRect(null);
      setMessage("Saved. Select another button or Finish.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Room design save failed.");
    } finally {
      setSaving(false);
    }
  }

  function cancelSelected() {
    setDraft(cloneConfig(saved));
    applyConfig(saved, registry);
    setSelectedId(null);
    setRect(null);
    setMessage("Changes cancelled.");
  }

  function resetSelected() {
    if (!selectedId) return;
    rememberCurrent();
    setDraft((current) => {
      const elements = { ...current.elements };
      delete elements[selectedId];
      return { ...current, elements };
    });
    setMessage("Reset to RC template. Press Save This Button to keep it.");
  }

  function startDesigner() {
    if (!canEdit) return;
    setDesignMode(true);
    const url = new URL(window.location.href);
    url.searchParams.set("roomDesign", "1");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    setMessage("Choose one button to edit.");
    window.requestAnimationFrame(refreshUi);
  }

  const finishDesigner = useCallback(() => {
    setDraft(cloneConfig(saved));
    applyConfig(saved, registry);
    setSelectedId(null);
    setRect(null);
    setDesignMode(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("roomDesign");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    setMessage("");
  }, [registry, saved]);

  useEffect(() => {
    if (!designMode) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      finishDesigner();
    };
    window.addEventListener("keydown", closeOnEscape, true);
    return () => window.removeEventListener("keydown", closeOnEscape, true);
  }, [designMode, finishDesigner]);

  if (!roomId) return null;

  if (!designMode) {
    return canEdit ? (
      <button
        type="button"
        data-rc-customer-room-designer-ui="true"
        onClick={startDesigner}
        className="fixed right-4 top-[96px] z-[997] rounded-lg border border-amber-300/60 bg-[#07101d]/95 px-3 py-2 text-xs font-semibold text-amber-100 shadow-xl"
      >
        버튼 수정 / Edit
      </button>
    ) : null;
  }

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
      <div data-rc-customer-room-designer-ui="true" className="fixed left-1/2 top-[96px] z-[1000] -translate-x-1/2 rounded-b-xl border border-amber-300/70 bg-[#111827]/95 px-3 py-2 text-xs text-white shadow-2xl">
        <div className="flex items-center gap-2">
          <strong className="text-amber-200">MY ROOM DESIGN</strong>
          <span className="text-white/60">One button at a time</span>
          <button type="button" onClick={finishDesigner} className="rounded-md border border-emerald-400/60 bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-200">Finish</button>
        </div>
      </div>

      {selected && rect ? (
        <div
          data-rc-customer-room-designer-ui="true"
          className="fixed z-[999] border border-amber-300 bg-transparent shadow-[0_0_0_1px_rgba(15,23,42,.72),0_0_10px_rgba(251,191,36,.28)]"
          style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height, touchAction: "none" }}
          onPointerDown={(event) => { if (selected.movable) beginPointer(event, "move"); }}
        >
          {selected.resizable ? handles.map((direction) => (
            <button
              key={direction}
              type="button"
              aria-label={`Resize ${direction}`}
              className={`absolute h-[6px] w-[6px] rounded-full border border-white bg-amber-300 ${handleClass[direction]}`}
              onPointerDown={(event) => beginPointer(event, "resize", direction)}
            />
          )) : null}
        </div>
      ) : null}

      <aside data-rc-customer-room-designer-ui="true" className="fixed bottom-4 right-4 z-[1001] w-[330px] max-h-[calc(100vh-130px)] overflow-y-auto rounded-2xl border border-amber-300/50 bg-[#07101d]/98 p-4 text-sm text-white shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-amber-200">My Room Designer</div>
            <div className="text-[11px] text-white/55">Single-click one button to edit it.</div>
          </div>
          <button type="button" aria-label="Exit Designer" onClick={finishDesigner} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border-2 border-amber-300 bg-amber-300/10 text-2xl font-bold text-amber-100" title="Exit without saving">×</button>
        </div>

        <div className="mt-2 rounded-md border border-sky-400/20 bg-sky-500/5 px-2 py-1.5 text-[10px] leading-4 text-sky-100/70">
          Click a button on the Room screen to edit it. Unsaved changes are discarded when you exit.
        </div>

        {selected ? (
          <div className="mt-4 border-t border-white/10 pt-3">
            <div className="mb-2 font-semibold text-amber-100">Editing: {selected.label}</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-white/60">X offset
                <input type="number" value={selectedPatch.offsetX ?? 0} onFocus={rememberCurrent} onChange={(event) => updateSelected({ offsetX: Number(event.target.value) || 0 })} className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-white" />
              </label>
              <label className="text-[11px] text-white/60">Y offset
                <input type="number" value={selectedPatch.offsetY ?? 0} onFocus={rememberCurrent} onChange={(event) => updateSelected({ offsetY: Number(event.target.value) || 0 })} className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-white" />
              </label>
              <label className="text-[11px] text-white/60">Width px
                <input type="number" min={selected.minWidth} max={selected.maxWidth} value={Math.round(selectedPatch.width ?? rect?.width ?? 0)} disabled={!selected.resizable} onFocus={rememberCurrent} onChange={(event) => updateSelected({ width: Math.max(selected.minWidth, Math.min(selected.maxWidth, Number(event.target.value) || selected.minWidth)) })} className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-white disabled:opacity-35" />
              </label>
              <label className="text-[11px] text-white/60">Height px
                <input type="number" min={selected.minHeight} max={selected.maxHeight} value={Math.round(selectedPatch.height ?? rect?.height ?? 0)} disabled={!selected.resizable} onFocus={rememberCurrent} onChange={(event) => updateSelected({ height: Math.max(selected.minHeight, Math.min(selected.maxHeight, Number(event.target.value) || selected.minHeight)) })} className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-white disabled:opacity-35" />
              </label>
            </div>

            {selected.fontEditable ? (
              <label className="mt-2 block text-[11px] text-white/60">Font size px
                <input type="number" min={8} max={32} value={selectedPatch.fontSize ?? 12} onFocus={rememberCurrent} onChange={(event) => updateSelected({ fontSize: Math.max(8, Math.min(32, Number(event.target.value) || 12)) })} className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-white" />
              </label>
            ) : null}

            {selected.textEditable ? (
              <label className="mt-2 block text-[11px] text-white/60">Button text
                <input type="text" maxLength={80} value={selectedPatch.label ?? ""} placeholder="Leave blank to use RC label" onFocus={rememberCurrent} onChange={(event) => updateSelected({ label: event.target.value })} className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-white" />
              </label>
            ) : null}

            <label className="mt-3 flex items-center justify-between rounded-md border border-white/10 px-3 py-2 text-[11px] text-white/70">
              Show this button
              <input
                type="checkbox"
                checked={selectedPatch.visible !== false}
                disabled={selected.visibilityEditable === false}
                onChange={(event) => { rememberCurrent(); updateSelected({ visible: event.target.checked }); }}
                className="h-4 w-4 accent-amber-300 disabled:opacity-35"
              />
            </label>
            {selected.protectedAction ? <div className="mt-2 text-[10px] leading-4 text-amber-200/75">Protected action: function, text and visibility are locked. Position, size and colours remain editable.</div> : null}

            <div className="mt-3 border-t border-white/10 pt-3">
              <div className="mb-2 font-semibold text-amber-100">Style</div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] text-white/60">Border colour
                  <input type="color" value={selectedPatch.borderColor ?? "#D9B84C"} onFocus={rememberCurrent} onChange={(event) => updateSelected({ borderColor: event.target.value.toUpperCase() })} className="mt-1 h-9 w-full rounded-md border border-white/15 bg-black/30 p-1" />
                </label>
                <label className="text-[11px] text-white/60">Background colour
                  <input type="color" value={selectedPatch.backgroundColor ?? "#273A33"} onFocus={rememberCurrent} onChange={(event) => updateSelected({ backgroundColor: event.target.value.toUpperCase() })} className="mt-1 h-9 w-full rounded-md border border-white/15 bg-black/30 p-1" />
                </label>
                <label className="text-[11px] text-white/60">Colour strength 1–10
                  <input type="number" min={1} max={10} value={selectedPatch.colourStrength ?? 10} onFocus={rememberCurrent} onChange={(event) => updateSelected({ colourStrength: Math.max(1, Math.min(10, Number(event.target.value) || 1)) })} className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-white" />
                </label>
                <label className="text-[11px] text-white/60">Border width 1–5
                  <input type="number" min={1} max={5} value={selectedPatch.borderWidth ?? 1} onFocus={rememberCurrent} onChange={(event) => updateSelected({ borderWidth: Math.max(1, Math.min(5, Number(event.target.value) || 1)) })} className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-white" />
                </label>
                <label className="text-[11px] text-white/60">Border radius 0–40
                  <input type="number" min={0} max={40} value={selectedPatch.borderRadius ?? 8} onFocus={rememberCurrent} onChange={(event) => updateSelected({ borderRadius: Math.max(0, Math.min(40, Number(event.target.value) || 0)) })} className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-white" />
                </label>
              </div>
              {selected.fontEditable ? (
                <label className="mt-2 block text-[11px] text-white/60">Text colour
                  <input type="color" value={selectedPatch.textColor ?? "#FFFFFF"} onFocus={rememberCurrent} onChange={(event) => updateSelected({ textColor: event.target.value.toUpperCase() })} className="mt-1 h-9 w-full rounded-md border border-white/15 bg-black/30 p-1" />
                </label>
              ) : null}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => void saveSelected()} disabled={saving} className="rounded-lg border border-emerald-400/60 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-50">Save This Button</button>
              <button type="button" onClick={cancelSelected} className="rounded-lg border border-white/20 bg-white/[0.04] px-3 py-2 text-xs">Cancel This Button</button>
              <button type="button" onClick={resetSelected} className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">Reset to RC Template</button>
              <button type="button" onClick={() => { rememberCurrent(); updateSelected({ visible: false }); setMessage("Button marked for deletion. Press Save to keep it hidden."); }} className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">Delete Button</button>
            </div>
          </div>
        ) : null}

        {message ? <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] leading-4 text-white/75">{message}</div> : null}
        <div className="mt-3 text-[10px] leading-4 text-white/40">Owner-only writes. This designer never changes RC Master or another customer Room.</div>
      </aside>
    </>
  );
}
