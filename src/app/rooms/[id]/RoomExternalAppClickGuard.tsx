"use client";

import { useEffect, useRef } from "react";

const APP_BUTTON_SELECTOR = ".rc-right-app-button";
const TRUST_WINDOW_MS = 1200;

export default function RoomExternalAppClickGuard() {
  const lastPointerDown = useRef<{ element: Element | null; at: number }>({ element: null, at: 0 });

  useEffect(() => {
    function findAppButton(target: EventTarget | null) {
      return target instanceof Element ? target.closest(APP_BUTTON_SELECTOR) : null;
    }

    function onPointerDown(event: PointerEvent) {
      if (!event.isTrusted) return;
      const button = findAppButton(event.target);
      if (!button) return;
      lastPointerDown.current = { element: button, at: performance.now() };
    }

    function onClick(event: MouseEvent) {
      const button = findAppButton(event.target);
      if (!button) return;

      const title = (button.getAttribute("title") || "").trim().toLowerCase();
      const isExternalApp = title === "chatgpt" || title === "email" || title === "instagram" || title === "youtube" || title === "google drive" || title === "google calendar" || title === "netflix" || title === "claude" || title === "gemini" || title === "grok";
      if (!isExternalApp) return;

      const pointer = lastPointerDown.current;
      const directTrustedClick = event.isTrusted && pointer.element === button && performance.now() - pointer.at <= TRUST_WINDOW_MS;
      if (directTrustedClick) {
        lastPointerDown.current = { element: null, at: 0 };
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
