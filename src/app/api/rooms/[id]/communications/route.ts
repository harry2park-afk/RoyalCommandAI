import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

const channelSchema = z.enum([
  "rc_chat",
  "rc_voice",
  "rc_video",
  "phone",
  "whatsapp",
  "kakao",
  "messenger",
  "other",
]);

const createSchema = z.object({
  caseId: z.string().uuid(),
  channel: channelSchema,
  direction: z.enum(["internal", "inbound", "outbound"]).default("internal"),
  counterpartyName: z.string().trim().max(200).nullable().optional(),
  counterpartyAddress: z.string().trim().max(500).nullable().optional(),
});

async function roomContext(roomId: string, userId: string) {
  const supabase = await createClient();
  const { data: room } = await supabase
    .from("rooms")
    .select("id, room_owner_id")
    .eq("id", roomId)
    .eq("room_owner_id", userId)
    .maybeSingle();
  return { supabase, room };
}

async function caseBelongsToRoom(
  supabase: Awaited<ReturnType<typeof createClient>>,
  roomId: string,
  userId: string,
  caseId: string,
) {
  const { data } = await supabase
    .from("legal_cases")
    .select("id, case_number, title")
    .eq("id", caseId)
    .eq("room_id", roomId)
    .eq("owner_id", userId)
    .maybeSingle();
  return data || null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ sessions: [] });

  const { id: roomId } = await context.params;
  const { supabase, room } = await roomContext(roomId, user.id);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const caseId = new URL(request.url).searchParams.get("caseId");
  let query = supabase
    .from("communication_sessions")
    .select("id, room_id, case_id, channel, direction, counterparty_name, counterparty_address, status, recording_policy, recording_status, started_at, ended_at, created_at, updated_at")
    .eq("room_id", roomId)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (caseId) {
    const legalCase = await caseBelongsToRoom(supabase, roomId, user.id, caseId);
    if (!legalCase) return NextResponse.json({ error: "Case not found" }, { status: 404 });
    query = query.eq("case_id", caseId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data || [] });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const { id: roomId } = await context.params;
  const input = createSchema.parse(await request.json());
  const { supabase, room } = await roomContext(roomId, user.id);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const legalCase = await caseBelongsToRoom(supabase, roomId, user.id, input.caseId);
  if (!legalCase) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("communication_sessions")
    .insert({
      room_id: roomId,
      case_id: input.caseId,
      owner_id: user.id,
      channel: input.channel,
      direction: input.direction,
      counterparty_name: input.counterpartyName || null,
      counterparty_address: input.counterpartyAddress || null,
      status: "created",
      recording_policy: "unknown",
      recording_status: "not_started",
      updated_at: new Date().toISOString(),
    })
    .select("id, room_id, case_id, channel, direction, counterparty_name, counterparty_address, status, recording_policy, recording_status, started_at, ended_at, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("legal_cases")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", input.caseId)
    .eq("room_id", roomId)
    .eq("owner_id", user.id);

  return NextResponse.json({ session: data, case: legalCase }, { status: 201 });
}
