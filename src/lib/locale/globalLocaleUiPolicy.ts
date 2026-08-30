export type LocaleUiTextRole =
  | "action"
  | "navigation"
  | "feature_title"
  | "dialog_title"
  | "description"
  | "help"
  | "status_detail"
  | "ai_response"
  | "customer_content";

export const GLOBAL_UI_CHROME_LOCALE = "en-US" as const;

const ENGLISH_FIRST_ROLES = new Set<LocaleUiTextRole>([
  "action",
  "navigation",
  "feature_title",
  "dialog_title",
]);

const LOCALISED_ROLES = new Set<LocaleUiTextRole>([
  "description",
  "help",
  "status_detail",
  "ai_response",
]);

export function uiTextLocale(role: LocaleUiTextRole, selectedUiLocale: string) {
  if (ENGLISH_FIRST_ROLES.has(role)) return GLOBAL_UI_CHROME_LOCALE;
  if (LOCALISED_ROLES.has(role)) return selectedUiLocale;
  // Customer-authored content is preserved in its original language and is not auto-rewritten.
  return null;
}

export function shouldTranslateStoredContent(role: LocaleUiTextRole) {
  return role !== "customer_content";
}
