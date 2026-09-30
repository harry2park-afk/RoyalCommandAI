export function normaliseLanguageCountryOrder(order: unknown, validLocales: ReadonlySet<string>) {
  if (!Array.isArray(order)) return [];
  return order.filter((locale, index, values): locale is string =>
    typeof locale === "string" && validLocales.has(locale) && values.indexOf(locale) === index);
}

export function promoteLanguageCountryLocale(order: readonly string[], locale: string) {
  return [locale, ...order.filter((item) => item !== locale)];
}

export function moveLanguageCountryLocale(order: readonly string[], draggedLocale: string, targetLocale: string, placeAfter: boolean) {
  if (!draggedLocale || draggedLocale === targetLocale) return [...order];
  const current = [...order];
  if (!current.includes(targetLocale)) current.push(targetLocale);
  const next = current.filter((locale) => locale !== draggedLocale);
  const targetIndex = next.indexOf(targetLocale);
  if (targetIndex < 0) return [...order];
  next.splice(targetIndex + (placeAfter ? 1 : 0), 0, draggedLocale);
  return next;
}
