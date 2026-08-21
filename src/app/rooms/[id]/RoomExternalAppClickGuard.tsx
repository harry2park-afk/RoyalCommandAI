"use client";

import { useEffect, useRef } from "react";

const APP_BUTTON_SELECTOR = ".rc-right-app-button";
const ROOM_PLACEHOLDER_SELECTOR = "#rc-room-switcher .rc-room-switcher-placeholder";
const TRUST_WINDOW_MS = 1200;

const ROOM_TEMPLATE_BY_NAME: Record<string, string> = {
  "법률룸": "legal",
  "취미룸": "custom",
  "학습룸": "education",
  "기술룸": "technology",
  "사업룸": "business",
  "부동산룸": "realestate",
  "여행룸": "hotel",
  "문서룸": "custom",
  "프로젝트룸": "business",
  "상담룸": "consultation",
  "건강룸": "medical",
  "가족룸": "custom",
  "쇼핑룸": "retail",
  "아이디어룸": "custom",
};

export default function RoomExternalAppClickGuard() {
  const lastPointerDown = useRef<{ element: Element | null; at: number }>({ element: null, at: 0 });

  useEffect(() => {
    function findAppButton(target: EventTarget | null) {
      return target instanceof Element ? target.closest(APP_BUTTON_SELECTOR) : null;
    }

    function findRoomPlaceholder(target: EventTarget | null) {
      return target instanceof Element ? target.closest(ROOM_PLACEHOLDER_SELECTOR) : null;
    }

    function currentRoomId() {
      return window.location.pathname.split("/").filter(Boolean).pop() || "";
    }

    function openRoomBuilder(button: Element) {
      const roomName = (button.textContent || "새 Room").trim() || "새 Room";
      const template = ROOM_TEMPLATE_BY_NAME[roomName] || "custom";
      const url = new URL("/room-builder", window.location.origin);
      url.searchParams.set("template", template);
      url.searchParams.set("name", roomName);
      const roomId = currentRoomId();
      if (roomId) url.searchParams.set("returnRoom", roomId);
      window.location.assign(url.toString());
    }

    function onPointerDown(event: PointerEvent) {
      if (!event.isTrusted) return;

      const roomButton = findRoomPlaceholder(event.target);
      if (roomButton) {
        event.stopPropagation();
        return;
      }

      const button = findAppButton(event.target);
      if (!button) return;
      lastPointerDown.current = { element: button, at: performance.now() };
    }

    function onClick(event: MouseEvent) {
      const roomButton = findRoomPlaceholder(event.target);
      if (roomButton && event.isTrusted) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        openRoomBuilder(roomButton);
        return;
      }

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
