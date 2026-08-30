"use client";

import { useEffect, useState } from "react";
import { GLOBAL_FALLBACK_LOCALE, resolveGlobalLocale } from "@/lib/locale/globalLocaleCore";

const SELECTED_KEY = "royalcommand:selected-language";
const UI_LOCALE_KEY = "royalcommand:ui-locale";
const COUNTRY_KEY = "royalcommand:country-code";
const RESOLVED_ATTRIBUTE = "data-rc-resolved-locale";

function readLegacyRaw() {
  if (typeof window === "undefined") return "en";
  return window.localStorage.getItem(SELECTED_KEY) || document.documentElement.lang || "en";
}

function readResolvedLocale() {
  if (typeof window === "undefined") return GLOBAL_FALLBACK_LOCALE;
  return resolveGlobalLocale({
    explicitUiLocale: window.localStorage.getItem(UI_LOCALE_KEY),
    legacyLanguage: readLegacyRaw(),
    countryCode: window.localStorage.getItem(COUNTRY_KEY),
  }).locale;
}

export function useRoyalCommandLocale() {
  const [locale, setLocale] = useState<string>(GLOBAL_FALLBACK_LOCALE);

  useEffect(() => {
    const sync = () => {
      const resolved = readResolvedLocale();
      setLocale(resolved);
      document.documentElement.setAttribute(RESOLVED_ATTRIBUTE, resolved);
    };
    sync();

    const onStorage = (event: StorageEvent) => {
      if (!event.key || [SELECTED_KEY, UI_LOCALE_KEY, COUNTRY_KEY].includes(event.key)) sync();
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
      document.documentElement.removeAttribute(RESOLVED_ATTRIBUTE);
    };
  }, []);

  return locale;
}
