import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

const outcomeSchema = z.object({
  sessionId: z.string().uuid(),
  recordingDocumentId: z.string().uuid().nullable().optional(),
  transcript: z.string().max(250_000).default(""),
  aiSummary: z.string().max(100_000).default(""),
  agreements: z.array(z.string().max(5_000)).max(100).default([]),
  actionItems: z.array(z.string().max(5_000)).max(100).default([]),
  processingStatus: z.enum(["pending", "processing", "ready", "failed"]).default("ready"),
});

async function ownedSession(
  roomId: string,
  userId: string,
  sessionId: string,
) {
  const supabase = await createClient();
  const { data: room } = await supabase
    .from("rooms")
    .select("id")
    .eq("id", roomId)
    .eq("room_owner_id", userId)
    .maybeSingle();
  if (!room) return { supabase, session: null };

  const { data: session } = await supabase
    .from("communication_sessions")
    .select("id, room_id, case_id, owner_id, channel, status, recording_policy, recording_status")
    .eq("id", sessionId)
    .eq("room_id", roomId)
    .eq("owner_id", userId)
    .maybeSingle();

  return { supabase, session };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const { id: roomId } = await context.params;
  const sessionId = new URL(request.url).searchParams.get("sessionId") || "";
  if (!sessionId) return NextResponse.json({ error: "sessionId is required" }, { status: 400 });

  const { supabase, session } = await ownedSession(roomId, user.id, sessionId);
  if (!session) return NextResponse.json({ error: "Communication session not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("communication_outcomes")
    .select("id, session_id, room_id, case_id, recording_document_id, transcript, ai_summary, agreements, action_items, processing_status, created_at, updated_at")
    .eq("session_id", sessionId)
    .eq("room_id", roomId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session, outcome: data || null });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const { id: roomId } = await context.params;
  const input = outcomeSchema.parse(await request.json());
  const { supabase, session } = await ownedSession(roomId, user.id, input.sessionId);
  if (!session) return NextResponse.json({ error: "Communication session not found" }, { status: 404 });

  if (input.recordingDocumentId) {
    if (session.recording_policy === "prohibited" || session.recording_status === "blocked") {
      return NextResponse.json({ error: "Recording is blocked for this session" }, { status: 400 });
    }

    const { data: document } = await supabase
      .from("documents")
      .select("id")
      .eq("id", input.recordingDocumentId)
      .eq("room_id", roomId)
      .eq("uploaded_by", user.id)
      .maybeSingle();
    if (!document) return NextResponse.json({ error: "Recording document not found" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("communication_outcomes")
    .upsert({
      session_id: input.sessionId,
      room_id: roomId,
      case_id: session.case_id,
      owner_id: user.id,
      recording_document_id: input.recordingDocumentId || null,
      transcript: input.transcript,
      ai_summary: input.aiSummary,
      agreements: input.agreements,
      action_items: input.actionItems,
      processing_status: input.processingStatus,
      updated_at: now,
    }, { onConflict: "session_id" })
    .select("id, session_id, room_id, case_id, recording_document_id, transcript, ai_summary, agreements, action_items, processing_status, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("communication_sessions")
    .update({
      status: "completed",
      ended_at: now,
      recording_status: input.recordingDocumentId ? "completed" : session.recording_status,
      updated_at: now,
    })
    .eq("id", input.sessionId)
    .eq("room_id", roomId)
    .eq("owner_id", user.id);

  return NextResponse.json({ outcome: data, sessionId: input.sessionId });
}
