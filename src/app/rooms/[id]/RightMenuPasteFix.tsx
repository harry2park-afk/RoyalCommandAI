"use client";

import { useEffect } from "react";

const DESKTOP_SHORTCUT_KEY = "royalcommand:right-panel-desktop-shortcuts";

type DesktopShortcut = {
  id: "chrome";
  title: string;
  url: string;
  icon: string;
};

const CHROME_SHORTCUT: DesktopShortcut = {
  id: "chrome",
  title: "Chrome",
  url: "https://www.google.com",
  icon: "https://cdn.simpleicons.org/googlechrome/4285F4",
};

function normaliseShortcutName(name: string) {
  return name.replace(/\.lnk$/i, "").trim().toLowerCase();
}

function readDesktopShortcuts(): DesktopShortcut[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DESKTOP_SHORTCUT_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id === "chrome") : [];
  } catch {
    return [];
  }
}

function writeDesktopShortcuts(items: DesktopShortcut[]) {
  try { window.localStorage.setItem(DESKTOP_SHORTCUT_KEY, JSON.stringify(items)); } catch {}
}

function addChromeShortcut() {
  const current = readDesktopShortcuts();
  if (!current.some((item) => item.id === "chrome")) {
    writeDesktopShortcuts([...current, CHROME_SHORTCUT]);
  }
}

function addKakaoTalkFromCatalog() {
  const existing = Array.from(document.querySelectorAll(".rc-right-app-button")).some((node) =>
    (node.getAttribute("title") || "").toLowerCase() === "kakaotalk"
  );
  if (existing) return;

  const search = document.querySelector(".rc-right-search input");
  if (!(search instanceof HTMLInputElement)) return;

  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (setter) setter.call(search, "KakaoTalk"); else search.value = "KakaoTalk";
  search.dispatchEvent(new Event("input", { bubbles: true }));

  window.setTimeout(() => {
    const addButton = Array.from(document.querySelectorAll("button")).find((button) =>
      (button.getAttribute("title") || "").includes("KakaoTalk") &&
      (button.getAttribute("title") || "").includes("추가")
    );
    if (addButton instanceof HTMLButtonElement) addButton.click();
  }, 80);
}

function renderDesktopShortcuts() {
  const menu = document.querySelector(".rc-right-menu");
  if (!(menu instanceof HTMLElement)) return;

  const shortcuts = readDesktopShortcuts();
  const hasChrome = shortcuts.some((item) => item.id === "chrome");
  const existing = menu.querySelector('[data-rc-desktop-shortcut="chrome"]');

  if (!hasChrome) {
    existing?.remove();
    return;
  }
  if (existing) return;

  const row = document.createElement("div");
  row.dataset.rcDesktopShortcut = "chrome";
  row.className = "rc-right-row group flex w-full items-center";
  row.style.height = "28px";

  const open = document.createElement("button");
  open.type = "button";
  open.className = "rc-right-app-button flex h-full min-w-0 flex-1 items-center gap-2 px-1.5 text-left hover:bg-white/[0.05]";
  open.title = "Chrome";
  open.addEventListener("click", () => window.open(CHROME_SHORTCUT.url, "_blank", "noopener,noreferrer"));

  const icon = document.createElement("img");
  icon.src = CHROME_SHORTCUT.icon;
  icon.alt = "";
  icon.className = "h-5 w-5 shrink-0 object-contain";
  icon.draggable = false;

  const label = document.createElement("span");
  label.className = "rc-right-app-title min-w-0 flex-1 truncate text-[10px] font-semibold leading-none";
  label.textContent = "Chrome";

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "rc-right-remove mr-0.5 grid h-6 w-6 shrink-0 place-items-center bg-transparent text-white/55 hover:text-white/90";
  remove.title = "메뉴에서 빼기";
  remove.textContent = "×";
  remove.addEventListener("click", () => {
    writeDesktopShortcuts(readDesktopShortcuts().filter((item) => item.id !== "chrome"));
    row.remove();
  });

  open.append(icon, label);
  row.append(open, remove);
  menu.prepend(row);
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

      if (chrome) addChromeShortcut();
      if (kakao) addKakaoTalkFromCatalog();
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
