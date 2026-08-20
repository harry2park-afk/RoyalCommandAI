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
  return name.replace(/\.lnk$/i, "").trim().toLowerCase();
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
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(".rc-right-work-sidebar")) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    }

    function onDrop(event: DragEvent) {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(".rc-right-work-sidebar")) return;

      const names = Array.from(event.dataTransfer?.files || []).map((file) => normaliseShortcutName(file.name));
      if (!names.length) return;

      const chrome = names.some((name) => name === "chrome" || name === "google chrome" || name.includes("chrome"));
      const kakao = names.some((name) => name === "kakaotalk" || name === "카카오톡" || name.includes("kakao") || name.includes("카카오"));
      if (!chrome && !kakao) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      if (chrome) addDesktopShortcut("chrome-desktop");
      if (kakao) addDesktopShortcut("kakaotalk-desktop");
      renderDesktopShortcuts();
    }

    document.addEventListener("paste", onPaste, true);
    document.addEventListener("dragover", onDragOver, true);
    document.addEventListener("drop", onDrop, true);

    renderDesktopShortcuts();
    const observer = new MutationObserver(() => renderDesktopShortcuts());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("paste", onPaste, true);
      document.removeEventListener("dragover", onDragOver, true);
      document.removeEventListener("drop", onDrop, true);
      observer.disconnect();
    };
  }, []);

  return null;
}
