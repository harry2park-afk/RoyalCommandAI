"use client";

import { useEffect } from "react";

export default function RightMenuPasteFix() {
  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!target.closest(".rc-right-search")) return;

      const text = event.clipboardData?.getData("text/plain") || "";
      if (!text) return;

      event.preventDefault();
      event.stopPropagation();

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

    document.addEventListener("paste", onPaste, true);
    return () => document.removeEventListener("paste", onPaste, true);
  }, []);

  return null;
}
