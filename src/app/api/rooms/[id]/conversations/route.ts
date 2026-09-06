import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { resolveRoomRouteId } from "@/lib/rooms/resolve-room-id";

function normaliseTitle(value: unknown) {
  if (typeof value !== "string") return "New Chat";
  const title = value.replace(/\s+/g, " ").trim().slice(0, 120);
  return title || "New Chat";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ conversations: [] });
  }

  const { id } = await context.params;
  const roomId = resolveRoomRouteId(id);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("id, room_id, title, status, created_at, updated_at, last_message_at")
    .eq("room_id", roomId)
    .eq("created_by", user.id)
    .order("last_message_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ conversations: data || [] });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Server conversation persistence requires Supabase" },
      { status: 503 },
    );
  }

  const { id } = await context.params;
  const roomId = resolveRoomRouteId(id);
  const body = await request.json().catch(() => ({}));
  const title = normaliseTitle(body?.title);
  const now = new Date().toISOString();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      room_id: roomId,
      created_by: user.id,
      title,
      status: "active",
      updated_at: now,
      last_message_at: now,
    })
    .select("id, room_id, title, status, created_at, updated_at, last_message_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ conversation: data }, { status: 201 });
}
