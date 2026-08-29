"use client";

import { useEffect } from "react";

const MARKER = "data-rc-legal-wide";
const EXIT_ID = "rc-legal-exit-to-room";

function findLegalSection() {
  const sections = Array.from(document.querySelectorAll<HTMLElement>("section"));
  return sections.find((section) => {
    if (section.offsetParent === null) return false;
    const text = (section.textContent || "").replace(/\s+/g, " ");
    const hasTitle = text.includes("내 법률방") || text.includes("My Legal Room");
    const buttons = Array.from(section.querySelectorAll<HTMLButtonElement>("button"));
    const hasLegalActions = buttons.some((button) => {
      const label = (button.textContent || "").replace(/\s+/g, " ");
      return label.includes("내 사건 이야기하기") || label.includes("Tell my story");
    });
    return hasTitle && hasLegalActions;
  }) || null;
}

function setImportantStyle(element: HTMLElement, property: string, value: string) {
  element.style.setProperty(property, value, "important");
}

function applyWideLayout() {
  const section = findLegalSection();
  if (!section) return false;

  section.setAttribute(MARKER, "1");
  setImportantStyle(section, "left", "8px");
  setImportantStyle(section, "right", "185px");
  setImportantStyle(section, "width", "auto");
  setImportantStyle(section, "max-width", "none");
  setImportantStyle(section, "margin-left", "0");
  setImportantStyle(section, "margin-right", "0");
  setImportantStyle(section, "top", "104px");
  setImportantStyle(section, "max-height", "calc(100dvh - 118px)");
  setImportantStyle(section, "z-index", "460");

  let exit = document.getElementById(EXIT_ID) as HTMLButtonElement | null;
  if (!exit) {
    exit = document.createElement("button");
    exit.id = EXIT_ID;
    exit.type = "button";
    exit.textContent = "RCA 채팅룸으로 나가기 / Exit to RCA Room";
    exit.style.position = "fixed";
    exit.style.right = "205px";
    exit.style.top = "112px";
    exit.style.zIndex = "520";
    exit.style.border = "1px solid #d7b64d";
    exit.style.borderRadius = "10px";
    exit.style.background = "#7A0C2E";
    exit.style.color = "#ffe18a";
    exit.style.padding = "8px 14px";
    exit.style.fontSize = "13px";
    exit.style.fontWeight = "700";
    exit.style.cursor = "pointer";
    exit.onclick = () => {
      const current = findLegalSection();
      if (!current) return;
      const closeButton = Array.from(current.querySelectorAll<HTMLButtonElement>("button")).find((button) => {
        const title = (button.title || "").toLowerCase();
        return title.includes("줄이기") || title.includes("minimize");
      });
      if (closeButton) closeButton.click();
      else current.style.display = "none";
    };
    document.body.appendChild(exit);
  }
  exit.style.display = "block";
  return true;
}

export default function LegalRoomLayoutBridge() {
  useEffect(() => {
    let timer = 0;
    const sync = () => {
      const section = findLegalSection();
      const exit = document.getElementById(EXIT_ID) as HTMLElement | null;
      if (section) {
        applyWideLayout();
      } else if (exit) {
        exit.style.display = "none";
      }
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
    timer = window.setInterval(sync, 250);

    return () => {
      observer.disconnect();
      window.clearInterval(timer);
      document.getElementById(EXIT_ID)?.remove();
    };
  }, []);

  return null;
}
