"use client";

import { useEffect } from "react";

const MARKER = "data-rc-legal-wide";
const EXIT_ID = "rc-legal-exit-to-room";

function findLegalSection() {
  const byMarker = document.querySelector<HTMLElement>(`section[${MARKER}="1"]`);
  if (byMarker) return byMarker;

  const byText = Array.from(document.querySelectorAll<HTMLElement>("section")).find((section) => {
    const text = (section.textContent || "").replace(/\s+/g, " ");
    return text.includes("내 법률방") || text.includes("My Legal Room");
  });
  if (byText) return byText;

  return document.querySelector<HTMLElement>('section.fixed[class*="left-[245px]"][class*="right-[185px]"]');
}

function forceStyle(element: HTMLElement, property: string, value: string) {
  element.style.setProperty(property, value, "important");
}

function isVisible(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden";
}

function findLegalToolsButton() {
  return Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((button) => {
    const text = (button.textContent || "").replace(/\s+/g, " ").trim();
    return text.includes("법률 도구") && text.includes("Legal tools");
  }) || null;
}

function hideRedundantLegalToolsButton() {
  const button = findLegalToolsButton();
  if (button) forceStyle(button, "display", "none");
}

function minimizeLegalSection(section: HTMLElement) {
  const closeButton = Array.from(section.querySelectorAll<HTMLButtonElement>("button")).find((button) => {
    const title = (button.title || "").toLowerCase();
    return title.includes("줄이기") || title.includes("minimize");
  });
  if (closeButton) {
    closeButton.click();
    return true;
  }
  return false;
}

function applyWideLayout() {
  const section = findLegalSection();
  if (!section) return false;

  section.setAttribute(MARKER, "1");
  forceStyle(section, "left", "8px");
  forceStyle(section, "right", "185px");
  forceStyle(section, "width", "auto");
  forceStyle(section, "max-width", "none");
  forceStyle(section, "margin-left", "0");
  forceStyle(section, "margin-right", "0");
  forceStyle(section, "top", "104px");
  forceStyle(section, "max-height", "calc(100dvh - 118px)");

  let exit = document.getElementById(EXIT_ID) as HTMLButtonElement | null;
  if (!exit) {
    exit = document.createElement("button");
    exit.id = EXIT_ID;
    exit.type = "button";
    exit.textContent = "RCA 채팅룸으로 나가기 / Exit to RCA Room";
    Object.assign(exit.style, {
      position: "fixed",
      right: "205px",
      top: "112px",
      zIndex: "510",
      border: "1px solid #d7b64d",
      borderRadius: "10px",
      background: "#7A0C2E",
      color: "#ffe18a",
      padding: "8px 14px",
      fontSize: "13px",
      fontWeight: "700",
      cursor: "pointer",
    });
    exit.onclick = () => {
      const current = findLegalSection();
      if (!current) return;
      if (!minimizeLegalSection(current)) forceStyle(current, "display", "none");
      hideRedundantLegalToolsButton();
    };
    document.body.appendChild(exit);
  }
  exit.style.display = "block";
  return true;
}

export default function LegalRoomLayoutBridge() {
  useEffect(() => {
    let interval = 0;
    let frame = 0;
    let initialRefreshCloseDone = false;

    const onTopLegalButtonClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const control = target.closest<HTMLElement>("button, [role='button'], a");
      if (!control) return;

      const text = (control.textContent || "").replace(/\s+/g, " ").trim();
      const isHarryLegalRoomButton = text.includes("Harry") && text.includes("법률");
      if (!isHarryLegalRoomButton) return;

      const legalToolsButton = findLegalToolsButton();
      if (!legalToolsButton) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      legalToolsButton.click();
    };

    const sync = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        hideRedundantLegalToolsButton();
        const section = findLegalSection();
        const exit = document.getElementById(EXIT_ID) as HTMLElement | null;

        if (!initialRefreshCloseDone && section && isVisible(section)) {
          initialRefreshCloseDone = true;
          if (minimizeLegalSection(section)) {
            hideRedundantLegalToolsButton();
            if (exit) exit.style.display = "none";
            return;
          }
        }

        if (section && isVisible(section)) {
          applyWideLayout();
        } else if (exit) {
          exit.style.display = "none";
        }
      });
    };

    document.addEventListener("click", onTopLegalButtonClick, true);
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });
    interval = window.setInterval(sync, 250);

    return () => {
      document.removeEventListener("click", onTopLegalButtonClick, true);
      observer.disconnect();
      window.clearInterval(interval);
      window.cancelAnimationFrame(frame);
      document.getElementById(EXIT_ID)?.remove();
    };
  }, []);

  return null;
}
