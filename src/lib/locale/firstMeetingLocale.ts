export type FirstMeetingLocaleKey = "en" | "fr" | "ko" | "ja" | "zh" | "vi" | "id" | "th" | "hi";

function normalizedCountry(value?: string | null) {
  const raw = (value || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(raw) ? raw : null;
}

export function firstMeetingLocaleFrom(value: string, countryCode?: string | null): FirstMeetingLocaleKey {
  const v = value.trim().toLowerCase();
  const country = normalizedCountry(countryCode);
  if (v.startsWith("ko")) return "ko";
  if (v.startsWith("ja")) return "ja";
  if (v.startsWith("zh")) return "zh";
  if (v.startsWith("vi")) return "vi";
  if (v.startsWith("id")) return "id";
  if (v.startsWith("th")) return "th";
  if (v.startsWith("hi")) return "hi";
  if (country === "CA" && (v === "fr" || v.startsWith("fr-"))) return "fr";
  return "en";
}

export function firstMeetingSpeechLanguage(locale: FirstMeetingLocaleKey, countryCode?: string | null) {
  if (locale === "fr") return "fr-CA";
  if (locale === "ko") return "ko-KR";
  if (locale === "ja") return "ja-JP";
  if (locale === "zh") return "zh-CN";
  if (locale === "vi") return "vi-VN";
  if (locale === "id") return "id-ID";
  if (locale === "th") return "th-TH";
  if (locale === "hi") return "hi-IN";

  const country = normalizedCountry(countryCode);
  if (country === "AU") return "en-AU";
  if (country === "CA") return "en-CA";
  if (country === "GB") return "en-GB";
  if (country === "US") return "en-US";
  return "en-AU";
}
