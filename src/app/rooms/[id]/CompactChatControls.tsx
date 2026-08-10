"use client";

import { useEffect, useRef } from "react";

function textOf(el: Element) {
  return `${el.textContent || ""} ${(el as HTMLElement).getAttribute("title") || ""} ${(el as HTMLElement).getAttribute("aria-label") || ""}`.trim().toLowerCase();
}

export default function CompactChatControls() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const moved = new Set<HTMLElement>();

    const moveControls = () => {
      const buttons = Array.from(document.querySelectorAll("button")) as HTMLButtonElement[];
      const candidates = buttons.filter((button) => {
        if (host.contains(button)) return false;
        const t = textOf(button);
        return (
          t.includes("send to") ||
          t.includes("choose ai") ||
          t.includes("ai warehouse") ||
          t.includes("voice off") ||
          t.includes("voice on") ||
          t.includes("ai voice off") ||
          t.includes("ai voice on") ||
          t.includes("microphone") ||
          t === "mic"
        );
      });

      for (const button of candidates) {
        if (moved.has(button)) continue;
        button.classList.add("!px-2.5", "!py-1.5", "!text-xs", "!min-h-0");
        host.appendChild(button);
        moved.add(button);
      }
    };

    moveControls();
    const observer = new MutationObserver(moveControls);
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = window.setInterval(moveControls, 800);

    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-2 md:px-6">
      <div
        ref={hostRef}
        className="flex min-h-10 flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-2 py-1.5"
        aria-label="Quick chat controls"
      />
    </div>
  );
}
