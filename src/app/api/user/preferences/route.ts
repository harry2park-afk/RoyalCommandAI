import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

type ImportantConversation = {
  id: string;
  roomId: string;
  title: string;
  content: string;
  createdAt: string;
};

type UiPreferences = {
  selectedAi?: string[];
  aiSlots?: string[];
  compactAiDock?: string[];
  rightPanelApps?: string[];
  hiddenRoomIds?: string[];
  language?: string;
  chatSidebarWidth?: number;
  chatSidebarCollapsed?: boolean;
  chatHistoryTitles?: Record<string, string>;
  importantConversations?: ImportantConversation[];
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

function sanitiseImportantConversations(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const result: ImportantConversation[] = [];
  for (const raw of value.slice(0, 100)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const item = raw as Record<string, unknown>;
    if (typeof item.id !== "string" || !item.id || item.id.length > 160) continue;
    if (typeof item.roomId !== "string" || !item.roomId || item.roomId.length > 200) continue;
    if (typeof item.title !== "string" || typeof item.content !== "string") continue;
    const title = item.title.trim().slice(0, 120);
    const content = item.content.trim().slice(0, 20000);
    if (!title || !content) continue;
    result.push({
      id: item.id,
      roomId: item.roomId,
      title,
      content,
      createdAt: typeof item.createdAt === "string" && item.createdAt.length <= 64
        ? item.createdAt
        : new Date().toISOString(),
    });
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
  const compactAiDock = sanitiseStringArray(input.compactAiDock, 25);
  if (compactAiDock) result.compactAiDock = compactAiDock;
  const rightPanelApps = sanitiseStringArray(input.rightPanelApps, 100);
  if (rightPanelApps) result.rightPanelApps = rightPanelApps;
  const hiddenRoomIds = sanitiseStringArray(input.hiddenRoomIds, 100);
  if (hiddenRoomIds) result.hiddenRoomIds = hiddenRoomIds;

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

  const importantConversations = sanitiseImportantConversations(input.importantConversations);
  if (importantConversations) result.importantConversations = importantConversations;

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
