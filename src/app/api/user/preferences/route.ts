import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

type UiPreferences = {
  selectedAi?: string[];
  rightPanelApps?: string[];
  language?: string;
};

function sanitise(value: unknown): UiPreferences {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const result: UiPreferences = {};
  if (Array.isArray(input.selectedAi)) {
    result.selectedAi = input.selectedAi.filter((item): item is string => typeof item === "string").slice(0, 50);
  }
  if (Array.isArray(input.rightPanelApps)) {
    result.rightPanelApps = input.rightPanelApps.filter((item): item is string => typeof item === "string").slice(0, 100);
  }
  if (typeof input.language === "string" && input.language.length <= 32) {
    result.language = input.language;
  }
  return result;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ preferences: {} });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("ui_preferences, default_language")
    .eq("id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const preferences = sanitise(data?.ui_preferences);
  if (!preferences.language && typeof data?.default_language === "string") {
    preferences.language = data.default_language;
  }
  return NextResponse.json({ preferences });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, preferences: {} });

  let incoming: UiPreferences;
  try {
    incoming = sanitise(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("profiles")
    .select("ui_preferences")
    .eq("id", user.id)
    .single();
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });

  const existing = sanitise(current?.ui_preferences);
  const merged = { ...existing, ...incoming };
  const update: Record<string, unknown> = {
    ui_preferences: merged,
    updated_at: new Date().toISOString(),
  };
  if (incoming.language) update.default_language = incoming.language;

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, preferences: merged });
}
