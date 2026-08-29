"use client";

import { useEffect, useState } from "react";

const SELECTED_KEY = "royalcommand:selected-language";

function normalizeLocale(value?: string | null) {
  const raw = (value || "").trim();
  if (!raw) return "en-AU";
  if (raw === "ko") return "ko-KR";
  if (raw === "en") return "en-AU";
  return raw;
}

function readLocale() {
  if (typeof window === "undefined") return "en-AU";
  return normalizeLocale(window.localStorage.getItem(SELECTED_KEY) || document.documentElement.lang || "en-AU");
}

export function useRoyalCommandLocale() {
  const [locale, setLocale] = useState("en-AU");

  useEffect(() => {
    const sync = () => setLocale(readLocale());
    sync();

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === SELECTED_KEY) sync();
    };
    const onChange = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLSelectElement && target.getAttribute("aria-label") === "Language") {
        window.requestAnimationFrame(sync);
      }
    };
    const onCustom = () => sync();

    window.addEventListener("storage", onStorage);
    document.addEventListener("change", onChange, true);
    window.addEventListener("royalcommand:language-change", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("change", onChange, true);
      window.removeEventListener("royalcommand:language-change", onCustom);
    };
  }, []);

  return locale;
}
