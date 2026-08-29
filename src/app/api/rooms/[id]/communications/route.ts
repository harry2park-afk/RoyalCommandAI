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
  caseId: z.string().uuid().nullable().optional(),
  channel: channelSchema,
  direction: z.enum(["internal", "inbound", "outbound"]).default("internal"),
  counterpartyName: z.string().trim().max(200).nullable().optional(),
  counterpartyAddress: z.string().trim().max(500).nullable().optional(),
  regionCode: z.string().trim().max(32).nullable().optional(),
});

type SessionRecordingPolicy = "unknown" | "allowed" | "notice_required" | "consent_required" | "prohibited";
type SessionRecordingStatus = "not_started" | "blocked" | "awaiting_notice" | "awaiting_consent";

async function roomContext(roomId: string, userId: string) {
  const supabase = await createClient();
  const { data: room } = await supabase
    .from("rooms")
    .select("id, room_owner_id")
    .eq("id", roomId)
    .eq("room_owner_id", userId)
    .maybeSingle();

  const { data: manifest } = room
    ? await supabase
        .from("room_factory_manifests")
        .select("country_code")
        .eq("room_id", roomId)
        .eq("owner_id", userId)
        .maybeSingle()
    : { data: null };

  return { supabase, room, countryCode: manifest?.country_code || null };
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

function initialRecordingState(policy: SessionRecordingPolicy): SessionRecordingStatus {
  if (policy === "notice_required") return "awaiting_notice";
  if (policy === "consent_required") return "awaiting_consent";
  if (policy === "prohibited") return "blocked";
  return "not_started";
}

async function resolveRecordingPolicy(
  supabase: Awaited<ReturnType<typeof createClient>>,
  countryCode: string | null,
  regionCode: string | null,
): Promise<{
  policy: SessionRecordingPolicy;
  status: SessionRecordingStatus;
  reviewStatus: string;
  countryCode: string | null;
  regionCode: string | null;
}> {
  if (!countryCode) {
    return { policy: "prohibited", status: "blocked", reviewStatus: "missing_country", countryCode: null, regionCode };
  }

  const country = countryCode.toUpperCase();
  const region = regionCode?.toUpperCase() || null;
  let row: { review_status?: string; recording_policy?: string; country_code?: string; region_code?: string | null } | null = null;

  if (region) {
    const { data } = await supabase
      .from("communication_recording_policies")
      .select("country_code, region_code, review_status, recording_policy")
      .eq("country_code", country)
      .eq("region_code", region)
      .maybeSingle();
    row = data;
  }

  if (!row) {
    const { data } = await supabase
      .from("communication_recording_policies")
      .select("country_code, region_code, review_status, recording_policy")
      .eq("country_code", country)
      .is("region_code", null)
      .maybeSingle();
    row = data;
  }

  if (!row || row.review_status !== "approved") {
    return { policy: "prohibited", status: "blocked", reviewStatus: row?.review_status || "missing_policy", countryCode: country, regionCode: region };
  }

  const mapped: SessionRecordingPolicy = row.recording_policy === "allowed"
    ? "allowed"
    : row.recording_policy === "notice_required"
      ? "notice_required"
      : row.recording_policy === "consent_required"
        ? "consent_required"
        : "prohibited";

  return { policy: mapped, status: initialRecordingState(mapped), reviewStatus: row.review_status, countryCode: country, regionCode: region };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ sessions: [] });

  const { id: roomId } = await context.params;
  const { supabase, room } = await roomContext(roomId, user.id);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const caseId = new URL(request.url).searchParams.get("caseId");
  let query = supabase
    .from("communication_sessions")
    .select("id, room_id, case_id, channel, direction, counterparty_name, counterparty_address, status, recording_policy, recording_status, disposition, dispositioned_at, started_at, ended_at, created_at, updated_at")
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

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const { id: roomId } = await context.params;
  const input = createSchema.parse(await request.json());
  const { supabase, room, countryCode } = await roomContext(roomId, user.id);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  let legalCase: { id: string; case_number: number | null; title: string } | null = null;
  if (input.caseId) {
    legalCase = await caseBelongsToRoom(supabase, roomId, user.id, input.caseId);
    if (!legalCase) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const voiceChannel = input.channel === "rc_voice" || input.channel === "rc_video" || input.channel === "phone";
  const policy = voiceChannel
    ? await resolveRecordingPolicy(supabase, countryCode, input.regionCode || null)
    : { policy: "unknown" as SessionRecordingPolicy, status: "not_started" as SessionRecordingStatus, reviewStatus: "not_applicable", countryCode: countryCode?.toUpperCase() || null, regionCode: input.regionCode?.toUpperCase() || null };

  const { data, error } = await supabase
    .from("communication_sessions")
    .insert({
      room_id: roomId,
      case_id: input.caseId || null,
      owner_id: user.id,
      channel: input.channel,
      direction: input.direction,
      counterparty_name: input.counterpartyName || null,
      counterparty_address: input.counterpartyAddress || null,
      status: "created",
      recording_policy: policy.policy,
      recording_status: policy.status,
      disposition: input.caseId ? "case" : "pending",
      dispositioned_at: input.caseId ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .select("id, room_id, case_id, channel, direction, counterparty_name, counterparty_address, status, recording_policy, recording_status, disposition, dispositioned_at, started_at, ended_at, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (input.caseId) {
    await supabase.from("legal_cases").update({ updated_at: new Date().toISOString() })
      .eq("id", input.caseId).eq("room_id", roomId).eq("owner_id", user.id);
  }

  return NextResponse.json({
    session: data,
    case: legalCase,
    recordingDecision: {
      policy: policy.policy,
      status: policy.status,
      reviewStatus: policy.reviewStatus,
      countryCode: policy.countryCode,
      regionCode: policy.regionCode,
    },
  }, { status: 201 });
}
