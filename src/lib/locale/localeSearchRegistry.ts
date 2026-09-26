import { COUNTRY_ROOM_PRESETS } from "@/lib/rooms/countryPresets";

export type LocaleSearchEntry = {
  locale: string;
  label: string;
  searchText: string;
};

const LANGUAGE_NAMES: Record<string, [string, string]> = {
  en: ["English", "English"], ko: ["Korean", "한국어"], ja: ["Japanese", "日本語"], zh: ["Chinese", "中文"],
  es: ["Spanish", "Español"], fr: ["French", "Français"], de: ["German", "Deutsch"], it: ["Italian", "Italiano"],
  pt: ["Portuguese", "Português"], ar: ["Arabic", "العربية"], hi: ["Hindi", "हिन्दी"], id: ["Indonesian", "Bahasa Indonesia"],
  ms: ["Malay", "Bahasa Melayu"], th: ["Thai", "ไทย"], vi: ["Vietnamese", "Tiếng Việt"], tr: ["Turkish", "Türkçe"],
  ru: ["Russian", "Русский"], pl: ["Polish", "Polski"], nl: ["Dutch", "Nederlands"], sv: ["Swedish", "Svenska"],
  nb: ["Norwegian", "Norsk"], da: ["Danish", "Dansk"], fi: ["Finnish", "Suomi"], el: ["Greek", "Ελληνικά"],
  he: ["Hebrew", "עברית"], fa: ["Persian", "فارسی"], ur: ["Urdu", "اردو"], bn: ["Bengali", "বাংলা"],
  ta: ["Tamil", "தமிழ்"], fil: ["Filipino", "Filipino"], cs: ["Czech", "Čeština"], uk: ["Ukrainian", "Українська"],
  ro: ["Romanian", "Română"], hu: ["Hungarian", "Magyar"], sw: ["Swahili", "Kiswahili"],
};

const FEATURED_LOCALES = [
  "en-AU", "ko-KR", "ja-JP", "zh-CN", "es-ES", "fr-FR", "de-DE", "it-IT", "pt-BR", "ar-AE",
  "hi-IN", "id-ID", "ms-MY", "th-TH", "vi-VN", "tr-TR", "ru-RU", "pl-PL", "nl-NL", "sv-SE",
  "nb-NO", "da-DK", "fi-FI", "el-GR", "he-IL", "fa-IR", "ur-PK", "bn-BD", "ta-IN", "fil-PH",
] as const;

const SPECIAL_ALIASES: Record<string, string> = {
  AU: "Australian", KR: "Korea Korean", JP: "Japan Japanese", BR: "Brazil Brazilian",
  GB: "Britain British UK", US: "America American USA", CN: "China Chinese", TW: "Taiwan Taiwanese",
};

function languageLabel(locale: string, country?: string) {
  const code = locale.split("-")[0].toLowerCase();
  const [english, native] = LANGUAGE_NAMES[code] || [code.toUpperCase(), code.toUpperCase()];
  return country ? `${native} · ${english} (${country})` : native === english ? english : `${native} · ${english}`;
}

const countryEntries = COUNTRY_ROOM_PRESETS.map((country) => {
  const languageCode = country.languageTag.split("-")[0].toLowerCase();
  const names = LANGUAGE_NAMES[languageCode] || [languageCode, languageCode];
  return {
    locale: country.languageTag,
    label: languageLabel(country.languageTag, country.label),
    searchText: `${country.languageTag} ${languageCode} ${country.id} ${country.label} ${SPECIAL_ALIASES[country.id] || ""} ${names.join(" ")}`.toLowerCase(),
  };
});

const countryByLocale = new Map(countryEntries.map((entry) => [entry.locale, entry]));

export const FEATURED_LANGUAGE_ENTRIES: readonly LocaleSearchEntry[] = FEATURED_LOCALES.map((locale) => countryByLocale.get(locale) || {
  locale,
  label: languageLabel(locale),
  searchText: `${locale} ${LANGUAGE_NAMES[locale.split("-")[0].toLowerCase()]?.join(" ") || ""}`.toLowerCase(),
});

export const LOCALE_SEARCH_REGISTRY: readonly LocaleSearchEntry[] = Array.from(
  new Map([...FEATURED_LANGUAGE_ENTRIES, ...countryEntries].map((entry) => [entry.locale, entry])).values(),
);
