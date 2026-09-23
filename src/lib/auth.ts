import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/utils";
import { localDb } from "@/lib/local-store";
import { createClient } from "@/lib/supabase/server";

export function getTrustedCountryCode(user: {
  app_metadata?: Record<string, unknown> | null;
}) {
  const countryCode = user.app_metadata?.country_code;
  return typeof countryCode === "string" ? countryCode : "";
}

export async function getCurrentUser() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    return {
      id: user.id,
      email: user.email || "",
      fullName:
        (user.user_metadata?.full_name as string) ||
        user.email?.split("@")[0] ||
        "User",
      defaultLanguage:
        (user.user_metadata?.default_language as string) || "en",
      // Country controls legal/compliance, commercial terms and payment routing.
      // Supabase user_metadata is user-editable, so it must never grant country
      // authority. Only server-controlled app_metadata is accepted here.
      countryCode: getTrustedCountryCode(user),
      mode: "supabase" as const,
    };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("rc_session")?.value;
  const user = localDb.userFromToken(token);
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    defaultLanguage: user.defaultLanguage,
    countryCode: "",
    mode: "local" as const,
  };
}
