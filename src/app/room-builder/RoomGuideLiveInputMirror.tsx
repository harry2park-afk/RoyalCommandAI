"use client";

import { useEffect } from "react";

export default function RoomGuideLiveInputMirror() {
  useEffect(() => {
    const sync = () => {
      const textarea = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Room Guide message"]');
      const aside = textarea?.closest("aside");
      if (!textarea || !aside) return;

      const youLabel = Array.from(aside.querySelectorAll<HTMLElement>("div")).find(
        (el) => el.textContent?.trim() === "You" && el.className.includes("font-semibold"),
      );
      const row = youLabel?.parentElement;
      if (!youLabel || !row) return;

      let mirror = row.querySelector<HTMLElement>('[data-room-guide-live-mirror="true"]');
      if (!mirror) {
        mirror = document.createElement("div");
        mirror.dataset.roomGuideLiveMirror = "true";
        mirror.className = "min-w-0 whitespace-pre-wrap text-[13px] leading-5 text-white/68";
        row.appendChild(mirror);
      }

      const live = textarea.value;
      mirror.textContent = live;
      mirror.style.display = live ? "block" : "none";

      for (const child of Array.from(row.children)) {
        if (child === youLabel || child === mirror) continue;
        if (child instanceof HTMLElement) child.style.display = live ? "none" : "";
      }

      textarea.style.color = "transparent";
      textarea.style.caretColor = "white";
    };

    sync();
    const timer = window.setInterval(sync, 50);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}
