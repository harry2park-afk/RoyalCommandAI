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

// Retained as the fail-safe when no selected UI locale is available.
export const GLOBAL_UI_CHROME_LOCALE = "en-US" as const;

const LOCALISED_SYSTEM_ROLES = new Set<LocaleUiTextRole>([
  "action",
  "navigation",
  "feature_title",
  "dialog_title",
  "description",
  "help",
  "status_detail",
  "ai_response",
]);

export function uiTextLocale(role: LocaleUiTextRole, selectedUiLocale: string) {
  if (LOCALISED_SYSTEM_ROLES.has(role)) {
    return selectedUiLocale.trim() || GLOBAL_UI_CHROME_LOCALE;
  }
  // Customer-authored content is preserved in its original language and is not auto-rewritten.
  return null;
}

export function shouldTranslateStoredContent(role: LocaleUiTextRole) {
  return role !== "customer_content";
}
