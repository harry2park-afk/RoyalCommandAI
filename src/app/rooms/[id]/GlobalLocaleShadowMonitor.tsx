"use client";

import { useEffect } from "react";
import { normalizeLegacyLanguage, resolveGlobalLocale } from "@/lib/locale/globalLocaleCore";

const LEGACY_LANGUAGE_KEY = "royalcommand:selected-language";
const UI_LOCALE_KEY = "royalcommand:ui-locale";
const COUNTRY_KEY = "royalcommand:country-code";
const SHADOW_ATTRIBUTE = "data-rc-locale-shadow";

function currentLegacyLanguage() {
  const select = document.querySelector<HTMLSelectElement>('select[aria-label="Language"]');
  return select?.value || window.localStorage.getItem(LEGACY_LANGUAGE_KEY) || "";
}

function checkShadow() {
  const legacyLanguage = currentLegacyLanguage();
  if (!legacyLanguage) {
    document.documentElement.setAttribute(SHADOW_ATTRIBUTE, "unobserved");
    return;
  }

  const explicitUiLocale = window.localStorage.getItem(UI_LOCALE_KEY);
  const countryCode = window.localStorage.getItem(COUNTRY_KEY);
  const legacyEffective = normalizeLegacyLanguage(legacyLanguage, countryCode);
  const next = resolveGlobalLocale({ explicitUiLocale, legacyLanguage, countryCode });
  const status = legacyEffective === next.locale ? "match" : "mismatch";

  document.documentElement.setAttribute(SHADOW_ATTRIBUTE, status);
  if (status === "mismatch") {
    console.error("[RC Global Locale Shadow] MISMATCH - migration must stop", {
      legacyLanguage,
      legacyEffective,
      explicitUiLocale,
      countryCode,
      resolvedLocale: next.locale,
      source: next.source,
    });
    window.dispatchEvent(new CustomEvent("royalcommand:locale-shadow-mismatch", {
      detail: { legacyLanguage, legacyEffective, explicitUiLocale, countryCode, resolvedLocale: next.locale, source: next.source },
    }));
  }
}

export default function GlobalLocaleShadowMonitor() {
  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(checkShadow);
    };

    const onStorage = (event: StorageEvent) => {
      if (!event.key || [LEGACY_LANGUAGE_KEY, UI_LOCALE_KEY, COUNTRY_KEY].includes(event.key)) schedule();
    };
    const onChange = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLSelectElement && target.getAttribute("aria-label") === "Language") schedule();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("royalcommand:language-change", schedule);
    document.addEventListener("change", onChange, true);
    schedule();

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("royalcommand:language-change", schedule);
      document.removeEventListener("change", onChange, true);
      window.cancelAnimationFrame(frame);
      document.documentElement.removeAttribute(SHADOW_ATTRIBUTE);
    };
  }, []);

  return null;
}
