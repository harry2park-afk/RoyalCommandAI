export type RoomTextDirection = "auto" | "ltr" | "rtl";

export type GlobalRoomSettings = {
  countryCode: string;
  languageTag: string;
  timeZone: string;
  currencyCode: string;
  dateFormat: "locale" | "iso";
  textDirection: RoomTextDirection;
  encoding: "UTF-8";
  clonePolicy: "structure-only";
  cloneCustomerData: false;
  cloneMemory: false;
  cloneCredentials: false;
  cloneSecrets: false;
};

export const DEFAULT_GLOBAL_ROOM_SETTINGS: GlobalRoomSettings = {
  countryCode: "GLOBAL",
  languageTag: "en",
  timeZone: "UTC",
  currencyCode: "USD",
  dateFormat: "locale",
  textDirection: "auto",
  encoding: "UTF-8",
  clonePolicy: "structure-only",
  cloneCustomerData: false,
  cloneMemory: false,
  cloneCredentials: false,
  cloneSecrets: false,
};

export const GLOBAL_ROOM_PRESETS = [
  { id: "GLOBAL", label: "Global / International", languageTag: "en", timeZone: "UTC", currencyCode: "USD" },
  { id: "AU", label: "Australia", languageTag: "en-AU", timeZone: "Australia/Sydney", currencyCode: "AUD" },
  { id: "KR", label: "Korea", languageTag: "ko-KR", timeZone: "Asia/Seoul", currencyCode: "KRW" },
  { id: "US", label: "United States", languageTag: "en-US", timeZone: "America/New_York", currencyCode: "USD" },
  { id: "GB", label: "United Kingdom", languageTag: "en-GB", timeZone: "Europe/London", currencyCode: "GBP" },
  { id: "JP", label: "Japan", languageTag: "ja-JP", timeZone: "Asia/Tokyo", currencyCode: "JPY" },
  { id: "SG", label: "Singapore", languageTag: "en-SG", timeZone: "Asia/Singapore", currencyCode: "SGD" },
  { id: "NZ", label: "New Zealand", languageTag: "en-NZ", timeZone: "Pacific/Auckland", currencyCode: "NZD" },
  { id: "CA", label: "Canada", languageTag: "en-CA", timeZone: "America/Toronto", currencyCode: "CAD" },
  { id: "IN", label: "India", languageTag: "en-IN", timeZone: "Asia/Kolkata", currencyCode: "INR" },
  { id: "AE", label: "United Arab Emirates", languageTag: "ar-AE", timeZone: "Asia/Dubai", currencyCode: "AED" },
] as const;

export function applyGlobalPreset(current: GlobalRoomSettings, presetId: string): GlobalRoomSettings {
  const preset = GLOBAL_ROOM_PRESETS.find((item) => item.id === presetId);
  if (!preset) return { ...current, countryCode: presetId.trim().toUpperCase().slice(0, 8) || "GLOBAL" };
  return {
    ...current,
    countryCode: preset.id,
    languageTag: preset.languageTag,
    timeZone: preset.timeZone,
    currencyCode: preset.currencyCode,
  };
}

export function serializeGlobalRoomSettings(settings: GlobalRoomSettings) {
  return [
    `Country/region: ${settings.countryCode}`,
    `Language tag: ${settings.languageTag}`,
    `Time zone: ${settings.timeZone}`,
    `Currency: ${settings.currencyCode}`,
    `Date format: ${settings.dateFormat}`,
    `Text direction: ${settings.textDirection}`,
    `Encoding: ${settings.encoding}`,
    `Clone policy: ${settings.clonePolicy}`,
    "Clone customer data: No",
    "Clone memory: No",
    "Clone credentials/API keys: No",
    "Clone secrets: No",
  ];
}
