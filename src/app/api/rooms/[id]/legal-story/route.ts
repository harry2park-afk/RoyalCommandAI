import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

const createSchema = z.object({
  rawTranscript: z.string().trim().min(1).max(100_000),
  recordedAt: z.string().datetime().optional(),
  audioDocumentId: z.string().uuid().nullable().optional(),
});

const updateSchema = z.object({
  entryId: z.string().uuid(),
  rawTranscript: z.string().max(100_000).optional(),
  aiSummary: z.string().max(100_000).optional(),
}).refine((value) => value.rawTranscript !== undefined || value.aiSummary !== undefined, {
  message: "Nothing to update",
});

async function legalRoomContext(roomId: string, userId: string) {
  const supabase = await createClient();
  const { data: room } = await supabase
    .from("rooms")
    .select("id, room_owner_id")
    .eq("id", roomId)
    .eq("room_owner_id", userId)
    .maybeSingle();
  if (!room) return { supabase, enabled: false };

  const { data: manifest } = await supabase
    .from("room_factory_manifests")
    .select("template_id")
    .eq("room_id", roomId)
    .eq("owner_id", userId)
    .maybeSingle();

  return { supabase, enabled: manifest?.template_id === "legal" };
}

async function rebuildWorkspaceStory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  roomId: string,
  userId: string,
) {
  const [{ data: entries }, { data: workspace }] = await Promise.all([
    supabase
      .from("legal_story_entries")
      .select("raw_transcript, recorded_at")
      .eq("room_id", roomId)
      .eq("owner_id", userId)
      .order("recorded_at", { ascending: true }),
    supabase
      .from("legal_room_workspaces")
      .select("desired_outcome")
      .eq("room_id", roomId)
      .eq("owner_id", userId)
      .maybeSingle(),
  ]);

  const caseStory = (entries || [])
    .map((entry) => `[${entry.recorded_at}]\n${entry.raw_transcript}`)
    .join("\n\n")
    .slice(0, 100_000);

  await supabase
    .from("legal_room_workspaces")
    .upsert({
      room_id: roomId,
      owner_id: userId,
      case_story: caseStory,
      desired_outcome: workspace?.desired_outcome || "",
      updated_at: new Date().toISOString(),
    }, { onConflict: "room_id" });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ entries: [] });

  const { id } = await context.params;
  const { supabase, enabled } = await legalRoomContext(id, user.id);
  if (!enabled) return NextResponse.json({ error: "Not a legal Room" }, { status: 400 });

  const { data, error } = await supabase
    .from("legal_story_entries")
    .select("id, raw_transcript, ai_summary, audio_document_id, recorded_at, created_at, updated_at")
    .eq("room_id", id)
    .eq("owner_id", user.id)
    .order("recorded_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data || [] });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const { id } = await context.params;
  const input = createSchema.parse(await request.json());
  const { supabase, enabled } = await legalRoomContext(id, user.id);
  if (!enabled) return NextResponse.json({ error: "Not a legal Room" }, { status: 400 });

  if (input.audioDocumentId) {
    const { data: document } = await supabase
      .from("documents")
      .select("id")
      .eq("id", input.audioDocumentId)
      .eq("room_id", id)
      .eq("uploaded_by", user.id)
      .maybeSingle();
    if (!document) return NextResponse.json({ error: "Audio document not found" }, { status: 400 });
  }

  const recordedAt = input.recordedAt || new Date().toISOString();
  const { data, error } = await supabase
    .from("legal_story_entries")
    .insert({
      room_id: id,
      owner_id: user.id,
      raw_transcript: input.rawTranscript,
      ai_summary: "",
      audio_document_id: input.audioDocumentId || null,
      recorded_at: recordedAt,
      updated_at: new Date().toISOString(),
    })
    .select("id, raw_transcript, ai_summary, audio_document_id, recorded_at, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await rebuildWorkspaceStory(supabase, id, user.id);
  return NextResponse.json({ entry: data }, { status: 201 });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const { id } = await context.params;
  const input = updateSchema.parse(await request.json());
  const { supabase, enabled } = await legalRoomContext(id, user.id);
  if (!enabled) return NextResponse.json({ error: "Not a legal Room" }, { status: 400 });

  const update: { raw_transcript?: string; ai_summary?: string; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };
  if (input.rawTranscript !== undefined) update.raw_transcript = input.rawTranscript;
  if (input.aiSummary !== undefined) update.ai_summary = input.aiSummary;

  const { data, error } = await supabase
    .from("legal_story_entries")
    .update(update)
    .eq("id", input.entryId)
    .eq("room_id", id)
    .eq("owner_id", user.id)
    .select("id, raw_transcript, ai_summary, audio_document_id, recorded_at, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (input.rawTranscript !== undefined) await rebuildWorkspaceStory(supabase, id, user.id);
  return NextResponse.json({ entry: data });
}
