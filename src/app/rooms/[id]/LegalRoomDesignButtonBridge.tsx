"use client";

import { useEffect } from "react";

const BRIDGE_ID = "rc-legal-room-design-button";

function findLegalRoomSection() {
  return Array.from(document.querySelectorAll("section")).find((section) => {
    const text = section.textContent || "";
    return text.includes("My Legal Room") || text.includes("내 법률방");
  }) as HTMLElement | undefined;
}

function findDesignerSourceButton() {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('button[data-rc-customer-room-designer-ui="true"]')).find(
    (button) => (button.textContent || "").trim() === "Design My Room",
  );
}

export default function LegalRoomDesignButtonBridge() {
  useEffect(() => {
    let source: HTMLButtonElement | undefined;

    const sync = () => {
      const legalSection = findLegalRoomSection();
      source = findDesignerSourceButton();
      const existing = document.getElementById(BRIDGE_ID) as HTMLButtonElement | null;

      if (!legalSection || !source) {
        existing?.remove();
        if (source) source.style.removeProperty("display");
        return;
      }

      const headerRow = legalSection.firstElementChild;
      if (!(headerRow instanceof HTMLElement)) return;

      source.style.setProperty("display", "none", "important");
      if (existing) return;

      const button = document.createElement("button");
      button.id = BRIDGE_ID;
      button.type = "button";
      button.textContent = "Design My Room";
      button.setAttribute("data-rc-customer-room-designer-ui", "true");
      button.className = "ml-auto mr-2 rounded-lg border border-amber-300/60 bg-[#07101d]/95 px-3 py-2 text-xs font-semibold text-amber-100 shadow-xl hover:bg-[#111827]";
      button.addEventListener("click", () => source?.click());

      const closeButton = Array.from(headerRow.querySelectorAll("button")).find((candidate) => candidate !== button) || null;
      if (closeButton) headerRow.insertBefore(button, closeButton);
      else headerRow.appendChild(button);
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("resize", sync);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
      document.getElementById(BRIDGE_ID)?.remove();
      source?.style.removeProperty("display");
    };
  }, []);

  return null;
}
