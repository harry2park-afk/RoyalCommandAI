import { NextResponse } from "next/server";
import { LOCALE_SEARCH_REGISTRY } from "@/lib/locale/localeSearchRegistry";

function countryCode(locale: string) {
  return locale.split("-").findLast((part) => /^[A-Z]{2}$/i.test(part))?.toUpperCase() || "";
}

function countryName(label: string, code: string) {
  const labelled = label.match(/\(([^)]+)\)\s*$/)?.[1];
  if (labelled) return labelled;
  try { return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code; } catch { return code; }
}

export async function GET() {
  return NextResponse.json({
    locales: LOCALE_SEARCH_REGISTRY.map((entry) => {
      const code = countryCode(entry.locale);
      return { locale: entry.locale, countryCode: code, countryName: countryName(entry.label, code), searchText: entry.searchText };
    }),
  }, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
}
