"use client";

import { useEffect, useState } from "react";
import { resolveGlobalLocale } from "@/lib/locale/globalLocaleCore";

const SELECTED_KEY = "royalcommand:selected-language";
const UI_LOCALE_KEY = "royalcommand:ui-locale";
const COUNTRY_KEY = "royalcommand:country-code";
const SHADOW_ATTRIBUTE = "data-rc-locale-shadow";

function normalizeLocale(value?: string | null) {
  const raw = (value || "").trim();
  if (!raw) return "en-AU";
  if (raw === "ko") return "ko-KR";
  if (raw === "en") return "en-AU";
  return raw;
}

function readLegacyRaw() {
  if (typeof window === "undefined") return "en-AU";
  return window.localStorage.getItem(SELECTED_KEY) || document.documentElement.lang || "en-AU";
}

function readLocale() {
  return normalizeLocale(readLegacyRaw());
}

function compareShadow(legacyLocale: string) {
  const result = resolveGlobalLocale({
    explicitUiLocale: window.localStorage.getItem(UI_LOCALE_KEY),
    legacyLanguage: readLegacyRaw(),
    countryCode: window.localStorage.getItem(COUNTRY_KEY),
  });
  const status = result.locale === legacyLocale ? "match" : "mismatch";
  document.documentElement.setAttribute(SHADOW_ATTRIBUTE, status);

  if (status === "mismatch") {
    const detail = {
      legacyLocale,
      resolvedLocale: result.locale,
      source: result.source,
      countryCode: result.countryCode,
    };
    console.error("[RC Global Locale Shadow] MISMATCH - migration must stop", detail);
    window.dispatchEvent(new CustomEvent("royalcommand:locale-shadow-mismatch", { detail }));
  }
}

export function useRoyalCommandLocale() {
  const [locale, setLocale] = useState("en-AU");

  useEffect(() => {
    const sync = () => {
      const legacyLocale = readLocale();
      setLocale(legacyLocale); // Shadow mode: never change current UI behaviour.
      compareShadow(legacyLocale);
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
    };
  }, []);

  return locale;
}
