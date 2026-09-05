"use client";

import { useEffect } from "react";

const SELECTED_LANGUAGE_KEY = "royalcommand:selected-language";

function isKorean() {
  try {
    return (window.localStorage.getItem(SELECTED_LANGUAGE_KEY) || "").toLowerCase().startsWith("ko");
  } catch {
    return false;
  }
}

export default function RoomGuideLiveInputMirror() {
  useEffect(() => {
    const sync = () => {
      const textarea = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Room Guide message"]');
      const aside = textarea?.closest("aside");
      if (!textarea || !aside) return;

      // Keep typed or voice-transcribed text inside the actual editable input.
      // Older behavior made the textarea text transparent and mirrored it above,
      // which prevented users from seeing and correcting what they were editing.
      textarea.style.color = "white";
      textarea.style.caretColor = "white";
      textarea.style.background = "rgba(0, 0, 0, 0.28)";
      textarea.style.border = "1px solid rgba(215, 182, 77, 0.5)";
      textarea.style.borderRadius = "10px";
      textarea.style.padding = "4px 10px";
      textarea.style.boxSizing = "border-box";
      textarea.placeholder = isKorean()
        ? "여기에 글로 입력하거나 마이크로 말하세요"
        : "Type here or use the microphone";

      const mirror = aside.querySelector<HTMLElement>('[data-room-guide-live-mirror="true"]');
      if (mirror) mirror.remove();

      const youLabel = Array.from(aside.querySelectorAll<HTMLElement>("div")).find(
        (el) => el.textContent?.trim() === "You" && el.className.includes("font-semibold"),
      );
      const row = youLabel?.parentElement;
      if (row) {
        for (const child of Array.from(row.children)) {
          if (child instanceof HTMLElement) child.style.display = "";
        }
      }
    };

    sync();
    const timer = window.setInterval(sync, 250);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}
