import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { localDb } from "@/lib/local-store";
import { isSupabaseConfigured } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data: room, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", id)
      .order("created_at", { ascending: true });
    const { data: documents } = await supabase
      .from("documents")
      .select("*")
      .eq("room_id", id)
      .order("created_at", { ascending: false });
    return NextResponse.json({ room, messages: messages || [], documents: documents || [] });
  }

  const room = localDb.getRoom(id);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  return NextResponse.json({
    room,
    messages: localDb.listMessages(id),
    documents: localDb.listDocuments(id),
  });
}
