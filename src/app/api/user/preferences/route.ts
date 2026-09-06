import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/utils";
import { RoomHeaderLayoutConfig, sanitiseRoomHeaderLayoutConfig } from "@/lib/layout-editor";
import { LAYOUT_EDITOR_DEVICE_COOKIE, LAYOUT_EDITOR_SESSION_COOKIE, sha256Hex } from "@/lib/layout-editor-security";

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
  hiddenCountries?: string[];
  language?: string;
  uiLocale?: string;
  countryCode?: string;
  chatSidebarWidth?: number;
  chatSidebarCollapsed?: boolean;
  chatHistoryTitles?: Record<string, string>;
  importantConversations?: ImportantConversation[];
  layoutRoomHeaderV1?: RoomHeaderLayoutConfig;
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
  const hiddenCountries = sanitiseStringArray(input.hiddenCountries, 250)
    ?.map((code) => code.trim().toUpperCase())
    .filter((code, index, values) => /^[A-Z]{2}$/.test(code) && values.indexOf(code) === index);
  if (hiddenCountries) result.hiddenCountries = hiddenCountries;

  if (typeof input.language === "string" && input.language.length <= 32) result.language = input.language;
  if (typeof input.uiLocale === "string" && input.uiLocale.length <= 32) {
    try { result.uiLocale = Intl.getCanonicalLocales(input.uiLocale)[0]; } catch {}
  }
  if (typeof input.countryCode === "string" && /^[a-z]{2}$/i.test(input.countryCode.trim())) {
    result.countryCode = input.countryCode.trim().toUpperCase();
  }
  if (typeof input.chatSidebarWidth === "number" && Number.isFinite(input.chatSidebarWidth)) {
    result.chatSidebarWidth = Math.max(12, Math.min(420, Math.round(input.chatSidebarWidth)));
  }
  if (typeof input.chatSidebarCollapsed === "boolean") result.chatSidebarCollapsed = input.chatSidebarCollapsed;

  const chatHistoryTitles = sanitiseTitleMap(input.chatHistoryTitles);
  if (chatHistoryTitles) result.chatHistoryTitles = chatHistoryTitles;
  const importantConversations = sanitiseImportantConversations(input.importantConversations);
  if (importantConversations) result.importantConversations = importantConversations;
  const layoutRoomHeaderV1 = sanitiseRoomHeaderLayoutConfig(input.layoutRoomHeaderV1);
  if (layoutRoomHeaderV1) result.layoutRoomHeaderV1 = layoutRoomHeaderV1;

  return result;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      preferences: user.countryCode ? { countryCode: user.countryCode } : {},
      layoutEditorAllowed: false,
    });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("ui_preferences, default_language, role")
    .eq("id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const layoutEditorAllowed = data?.role === "admin";
  const preferences = sanitise(data?.ui_preferences);
  if (!layoutEditorAllowed) delete preferences.layoutRoomHeaderV1;
  if (!preferences.language && typeof data?.default_language === "string") preferences.language = data.default_language;
  if (!preferences.countryCode && user.countryCode) preferences.countryCode = user.countryCode.toUpperCase();
  return NextResponse.json({ preferences, layoutEditorAllowed });
}

async function hasUnlockedTrustedLayoutSession(userId: string) {
  try {
    const cookieStore = await cookies();
    const deviceToken = cookieStore.get(LAYOUT_EDITOR_DEVICE_COOKIE)?.value;
    const sessionToken = cookieStore.get(LAYOUT_EDITOR_SESSION_COOKIE)?.value;
    if (!deviceToken || !sessionToken) return false;
    const admin = createAdminClient();
    const { data: device } = await admin
      .from("layout_editor_trusted_devices")
      .select("id")
      .eq("user_id", userId)
      .eq("device_cookie_hash", sha256Hex(deviceToken))
      .is("revoked_at", null)
      .maybeSingle();
    if (!device?.id) return false;
    const { data: session } = await admin
      .from("layout_editor_sessions")
      .select("token_hash")
      .eq("token_hash", sha256Hex(sessionToken))
      .eq("user_id", userId)
      .eq("device_id", device.id)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    return Boolean(session);
  } catch {
    return false;
  }
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
    .select("ui_preferences, role")
    .eq("id", user.id)
    .single();
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  if (incoming.layoutRoomHeaderV1) {
    if (current?.role !== "admin") {
      return NextResponse.json({ error: "Layout Editor requires administrator access." }, { status: 403 });
    }
    if (!(await hasUnlockedTrustedLayoutSession(user.id))) {
      return NextResponse.json({ error: "Unlock Layout Editor with a trusted device passkey first." }, { status: 403 });
    }
  }

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
