import type { session } from "./access";
export function canonicalLanguage(value: unknown): string | null {
  if (typeof value !== "string" || !value || value.length > 35) return null;
  try { return Intl.getCanonicalLocales(value)[0] || null; } catch { return null; }
}
export function resolveAnswerLanguage(profile: {default_language?: unknown; ui_preferences?: unknown} | null, signup: string) {
  const prefs = profile?.ui_preferences && typeof profile.ui_preferences === "object" ? profile.ui_preferences as Record<string,unknown> : {};
  const selected = canonicalLanguage(prefs.language) || canonicalLanguage(profile?.default_language) || canonicalLanguage(signup) || "en";
  const regional = canonicalLanguage(prefs.uiLocale);
  // Display defaults from an old country setting must not override the chosen language.
  return regional?.split("-")[0] === selected.split("-")[0] ? regional : selected;
}
export async function accountAnswerLanguage(a: Awaited<ReturnType<typeof session>>) {
  const result = await a.db.from("profiles").select("default_language,ui_preferences").eq("id",a.user.id).maybeSingle();
  if (result.error) throw new Error("RCV3_LANGUAGE");
  return resolveAnswerLanguage(result.data,a.user.defaultLanguage);
}
export function answerLanguageInstruction(language: string) {
  return `Write the answer in ${language}, the customer's selected response language. Do not infer the answer language from the prompt or previous messages. Keep names, code, URLs and quoted source terms when necessary. If the user explicitly requests a translation into a different language, provide that requested translation.`;
}
