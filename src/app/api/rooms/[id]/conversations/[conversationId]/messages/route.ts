import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { resolveRoomRouteId } from "@/lib/rooms/resolve-room-id";
import { AI_PROVIDER_IDS, type AIProviderId } from "@/lib/ai/types";

const MAX_CONTENT_CHARS = 40_000;

function isProvider(value: unknown): value is AIProviderId {
  return typeof value === "string" && AI_PROVIDER_IDS.includes(value as AIProviderId);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; conversationId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Server conversation persistence requires Supabase" }, { status: 503 });

  const { id, conversationId } = await context.params;
  const roomId = resolveRoomRouteId(id);
  const body = await request.json().catch(() => ({}));
  const provider = body?.provider;
  const role = body?.role;
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!isProvider(provider) || (role !== "user" && role !== "assistant") || !content) {
    return NextResponse.json({ error: "Invalid independent-room message" }, { status: 400 });
  }
  if (content.length > MAX_CONTENT_CHARS) return NextResponse.json({ error: "Message is too long" }, { status: 413 });

  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("room_id", roomId)
    .eq("created_by", user.id)
    .single();
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const metadata = {
    source: "rca-independent",
    provider,
    clientItemId: typeof body?.clientItemId === "string" ? body.clientItemId.slice(0, 160) : undefined,
    title: typeof body?.title === "string" ? body.title.trim().slice(0, 120) : undefined,
    titleEdited: body?.titleEdited === true,
  };
  const { data, error } = await supabase.from("messages").insert({
    room_id: roomId,
    conversation_id: conversationId,
    author_id: role === "user" ? user.id : null,
    author_type: role === "user" ? "user" : "ai",
    content,
    metadata,
  }).select("id, created_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("conversations").update({
    updated_at: new Date().toISOString(),
    last_message_at: new Date().toISOString(),
  }).eq("id", conversationId).eq("created_by", user.id);

  return NextResponse.json({ message: data }, { status: 201 });
}
