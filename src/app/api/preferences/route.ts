import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

const DEFAULT_PREFS = {
  selectedAi: ["openai", "anthropic", "google", "xai"],
  rightPanelApps: ["chatgpt", "email", "instagram", "youtube", "drive", "calendar", "files", "netflix", "tasks", "approval", "claude", "gemini", "grok"],
  language: "ko",
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ preferences: DEFAULT_PREFS });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("ui_preferences, default_language")
    .eq("id", user.id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const stored = data?.ui_preferences && typeof data.ui_preferences === "object"
    ? data.ui_preferences as Record<string, unknown>
    : {};

  return NextResponse.json({
    preferences: {
      ...DEFAULT_PREFS,
      ...stored,
      language: typeof stored.language === "string" && stored.language
        ? stored.language
        : data?.default_language || DEFAULT_PREFS.language,
    },
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if (Array.isArray(body.selectedAi)) patch.selectedAi = body.selectedAi.filter((x) => typeof x === "string");
  if (Array.isArray(body.rightPanelApps)) patch.rightPanelApps = body.rightPanelApps.filter((x) => typeof x === "string");
  if (typeof body.language === "string" && body.language.trim()) patch.language = body.language.trim();

  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("ui_preferences")
    .eq("id", user.id)
    .single();
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });

  const current = existing?.ui_preferences && typeof existing.ui_preferences === "object"
    ? existing.ui_preferences as Record<string, unknown>
    : {};
  const next = { ...current, ...patch };
  const update: Record<string, unknown> = {
    ui_preferences: next,
    updated_at: new Date().toISOString(),
  };
  if (typeof patch.language === "string") update.default_language = patch.language;

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, preferences: next });
}
