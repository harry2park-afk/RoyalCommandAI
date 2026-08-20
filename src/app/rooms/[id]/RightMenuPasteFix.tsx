"use client";

import { useEffect } from "react";

const DESKTOP_SHORTCUT_KEY = "royalcommand:right-panel-desktop-shortcuts";

type DesktopShortcut = {
  id: "chrome-desktop" | "kakaotalk-desktop";
  title: string;
  icon: string;
};

const DESKTOP_SHORTCUTS: Record<DesktopShortcut["id"], DesktopShortcut> = {
  "chrome-desktop": {
    id: "chrome-desktop",
    title: "Chrome Desktop",
    icon: "https://cdn.simpleicons.org/googlechrome/4285F4",
  },
  "kakaotalk-desktop": {
    id: "kakaotalk-desktop",
    title: "KakaoTalk Desktop",
    icon: "/brand-logos/kakaotalk.svg",
  },
};

function normaliseShortcutName(name: string) {
  let decoded = name;
  try { decoded = decodeURIComponent(name); } catch {}
  decoded = decoded.replace(/^file:\/+/i, "").replace(/\\/g, "/");
  const last = decoded.split("/").filter(Boolean).pop() || decoded;
  return last.replace(/\.lnk(?:[#?].*)?$/i, "").trim().toLowerCase();
}

function getDroppedShortcutNames(dataTransfer: DataTransfer | null) {
  if (!dataTransfer) return [] as string[];

  const rawNames = new Set<string>();
  for (const file of Array.from(dataTransfer.files || [])) {
    if (file.name) rawNames.add(file.name);
  }

  for (const type of ["text/uri-list", "text/plain", "text/html"]) {
    let raw = "";
    try { raw = dataTransfer.getData(type) || ""; } catch {}
    if (!raw) continue;

    for (const part of raw.split(/[\r\n\t<>"']+/)) {
      const value = part.trim();
      if (!value) continue;
      if (/\.lnk(?:[#?].*)?$/i.test(value) || /file:\/\//i.test(value)) rawNames.add(value);
    }
  }

  return Array.from(rawNames).map(normaliseShortcutName).filter(Boolean);
}

function isKnownShortcut(names: string[]) {
  const chrome = names.some((name) => name === "chrome" || name === "google chrome" || name.includes("chrome"));
  const kakao = names.some((name) => name === "kakaotalk" || name === "카카오톡" || name.includes("kakao") || name.includes("카카오"));
  return { chrome, kakao, known: chrome || kakao };
}

function readDesktopShortcuts(): DesktopShortcut[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DESKTOP_SHORTCUT_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item) => item?.id === "chrome-desktop" || item?.id === "kakaotalk-desktop")
      : [];
  } catch {
    return [];
  }
}

function writeDesktopShortcuts(items: DesktopShortcut[]) {
  try { window.localStorage.setItem(DESKTOP_SHORTCUT_KEY, JSON.stringify(items)); } catch {}
}

function addDesktopShortcut(id: DesktopShortcut["id"]) {
  const current = readDesktopShortcuts();
  if (!current.some((item) => item.id === id)) {
    writeDesktopShortcuts([...current, DESKTOP_SHORTCUTS[id]]);
  }
}

function renderDesktopShortcuts() {
  const menu = document.querySelector(".rc-right-menu");
  if (!(menu instanceof HTMLElement)) return;

  const shortcuts = readDesktopShortcuts();
  const activeIds = new Set(shortcuts.map((item) => item.id));

  for (const id of ["chrome-desktop", "kakaotalk-desktop"] as const) {
    const selector = `[data-rc-desktop-shortcut="${id}"]`;
    const existing = menu.querySelector(selector);
    if (!activeIds.has(id)) {
      existing?.remove();
      continue;
    }
    if (existing) continue;

    const shortcut = DESKTOP_SHORTCUTS[id];
    const row = document.createElement("div");
    row.dataset.rcDesktopShortcut = id;
    row.className = "rc-right-row group flex w-full items-center";
    row.style.height = "28px";

    const open = document.createElement("button");
    open.type = "button";
    open.className = "rc-right-app-button flex h-full min-w-0 flex-1 items-center gap-2 px-1.5 text-left hover:bg-white/[0.05]";
    open.title = `${shortcut.title} · local Windows shortcut`;
    open.addEventListener("click", () => {
      window.alert(`${shortcut.title}은(는) 이 PC의 로컬 프로그램입니다. 웹브라우저 보안 때문에 Royal Command 웹페이지에서 Windows .lnk 파일을 직접 실행할 수는 없습니다.`);
    });

    const icon = document.createElement("img");
    icon.src = shortcut.icon;
    icon.alt = "";
    icon.className = "h-5 w-5 shrink-0 object-contain";
    icon.draggable = false;

    const label = document.createElement("span");
    label.className = "rc-right-app-title min-w-0 flex-1 truncate text-[10px] font-semibold leading-none";
    label.textContent = shortcut.title;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "rc-right-remove mr-0.5 grid h-6 w-6 shrink-0 place-items-center bg-transparent text-white/55 hover:text-white/90";
    remove.title = "메뉴에서 빼기";
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      writeDesktopShortcuts(readDesktopShortcuts().filter((item) => item.id !== id));
      row.remove();
    });

    open.append(icon, label);
    row.append(open, remove);
    menu.prepend(row);
  }
}

export default function RightMenuPasteFix() {
  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!target.closest(".rc-right-search")) return;

      const text = event.clipboardData?.getData("text/plain") || "";
      if (!text) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? start;
      const next = `${target.value.slice(0, start)}${text}${target.value.slice(end)}`;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      if (setter) setter.call(target, next);
      else target.value = next;
      target.dispatchEvent(new Event("input", { bubbles: true }));

      requestAnimationFrame(() => {
        const caret = start + text.length;
        target.setSelectionRange(caret, caret);
        target.focus();
      });
    }

    function onDragOver(event: DragEvent) {
      const names = getDroppedShortcutNames(event.dataTransfer);
      const match = isKnownShortcut(names);
      const target = event.target;
      const overSidebar = target instanceof Element && Boolean(target.closest(".rc-right-work-sidebar"));
      if (!match.known && !overSidebar) return;

      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = overSidebar ? "copy" : "none";
    }

    function onDrop(event: DragEvent) {
      const names = getDroppedShortcutNames(event.dataTransfer);
      const match = isKnownShortcut(names);
      if (!match.known) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const target = event.target;
      const overSidebar = target instanceof Element && Boolean(target.closest(".rc-right-work-sidebar"));
      if (!overSidebar) return;

      if (match.chrome) addDesktopShortcut("chrome-desktop");
      if (match.kakao) addDesktopShortcut("kakaotalk-desktop");
      renderDesktopShortcuts();
    }

    document.addEventListener("paste", onPaste, true);
    window.addEventListener("dragover", onDragOver, true);
    window.addEventListener("drop", onDrop, true);

    renderDesktopShortcuts();
    const observer = new MutationObserver(() => renderDesktopShortcuts());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("paste", onPaste, true);
      window.removeEventListener("dragover", onDragOver, true);
      window.removeEventListener("drop", onDrop, true);
      observer.disconnect();
    };
  }, []);

  return null;
}
