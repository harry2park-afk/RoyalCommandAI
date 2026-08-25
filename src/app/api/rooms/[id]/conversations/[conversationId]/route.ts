import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

const MAX_CONVERSATION_MESSAGES = 250;

function normaliseTitle(value: unknown) {
  if (typeof value !== "string") return undefined;
  const title = value.replace(/\s+/g, " ").trim().slice(0, 120);
  return title || undefined;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; conversationId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Server conversation persistence requires Supabase" }, { status: 503 });
  }

  const { id: roomId, conversationId } = await context.params;
  const supabase = await createClient();

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, room_id, title, status, created_at, updated_at, last_message_at")
    .eq("id", conversationId)
    .eq("room_id", roomId)
    .eq("created_by", user.id)
    .single();

  if (conversationError) {
    return NextResponse.json({ error: conversationError.message }, { status: 404 });
  }

  const { data: messages, error: messageError } = await supabase
    .from("messages")
    .select("*")
    .eq("room_id", roomId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(MAX_CONVERSATION_MESSAGES);

  if (messageError) return NextResponse.json({ error: messageError.message }, { status: 500 });

  return NextResponse.json({ conversation, messages: (messages || []).reverse() });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; conversationId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Server conversation persistence requires Supabase" }, { status: 503 });
  }

  const { id: roomId, conversationId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  const title = normaliseTitle(body?.title);
  if (title) update.title = title;
  if (body?.status === "active" || body?.status === "archived") update.status = body.status;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .update(update)
    .eq("id", conversationId)
    .eq("room_id", roomId)
    .eq("created_by", user.id)
    .select("id, room_id, title, status, created_at, updated_at, last_message_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ conversation: data });
}
