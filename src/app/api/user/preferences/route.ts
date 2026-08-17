import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

type UiPreferences = {
  selectedAi?: string[];
  aiSlots?: string[];
  rightPanelApps?: string[];
  language?: string;
  chatSidebarWidth?: number;
  chatSidebarCollapsed?: boolean;
  chatHistoryTitles?: Record<string, string>;
};

function sanitiseStringArray(value: unknown, maxItems: number) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length <= 120).slice(0, maxItems)
    : undefined;
}

function sanitiseTitleMap(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const result: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>).slice(0, 1000)) {
    if (typeof raw !== "string") continue;
    const title = raw.trim().slice(0, 120);
    if (key && key.length <= 200 && title) result[key] = title;
  }
  return result;
}

function sanitise(value: unknown): UiPreferences {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const result: UiPreferences = {};

  const selectedAi = sanitiseStringArray(input.selectedAi, 50);
  if (selectedAi) result.selectedAi = selectedAi;
  const aiSlots = sanitiseStringArray(input.aiSlots, 25);
  if (aiSlots) result.aiSlots = aiSlots;
  const rightPanelApps = sanitiseStringArray(input.rightPanelApps, 100);
  if (rightPanelApps) result.rightPanelApps = rightPanelApps;

  if (typeof input.language === "string" && input.language.length <= 32) {
    result.language = input.language;
  }
  if (typeof input.chatSidebarWidth === "number" && Number.isFinite(input.chatSidebarWidth)) {
    result.chatSidebarWidth = Math.max(12, Math.min(420, Math.round(input.chatSidebarWidth)));
  }
  if (typeof input.chatSidebarCollapsed === "boolean") {
    result.chatSidebarCollapsed = input.chatSidebarCollapsed;
  }

  const chatHistoryTitles = sanitiseTitleMap(input.chatHistoryTitles);
  if (chatHistoryTitles) result.chatHistoryTitles = chatHistoryTitles;
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
