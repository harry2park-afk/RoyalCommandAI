import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deriveFactoryResumeState } from "@/lib/rooms/factoryResume";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Room Factory status requires the configured RCA database." }, { status: 503 });
    }

    const roomId = new URL(request.url).searchParams.get("roomId")?.trim() || "";
    if (!/^[0-9a-f-]{36}$/i.test(roomId)) return NextResponse.json({ error: "Valid Room ID is required." }, { status: 400 });

    const supabase = await createClient();
    const { data: works, error: workError } = await supabase
      .from("room_work_records")
      .select("id, room_id, work_id, revision, title, status, created_at, updated_at")
      .eq("room_id", roomId)
      .like("work_id", "RC-FACTORY-%")
      .order("created_at", { ascending: false })
      .limit(10);
    if (workError) return NextResponse.json({ error: workError.message }, { status: 500 });
    if (!works?.length) return NextResponse.json({ roomId, latestWork: null, recentWorks: [], resume: { overallStatus: "NOT_STARTED", nextAction: "PREPARE_NEW_WORK", nextLaneId: "core" } });

    const latest = works[0];
    const { data: lanes, error: laneError } = await supabase
      .from("room_work_lanes")
      .select("id, lane_id, title, writer_provider, reviewer_providers, resources, depends_on, required_evidence, evidence, reviewer_verdict, rework_round, status, created_at, updated_at")
      .eq("room_id", roomId)
      .eq("work_record_id", latest.id)
      .order("created_at", { ascending: true });
    if (laneError) return NextResponse.json({ error: laneError.message }, { status: 500 });

    const { data: locks, error: lockError } = await supabase
      .from("room_resource_locks")
      .select("id, work_lane_id, resource_key, owner_provider, state, acquired_at, lease_expires_at, released_at, updated_at")
      .eq("room_id", roomId)
      .eq("work_record_id", latest.id)
      .order("created_at", { ascending: true });
    if (lockError) return NextResponse.json({ error: lockError.message }, { status: 500 });

    const snapshots = (lanes || []).map((lane) => ({
      laneId: String(lane.lane_id),
      status: String(lane.status),
      reworkRound: Number(lane.rework_round || 0),
      evidencePresent: Boolean(lane.evidence && typeof lane.evidence === "object" && Object.keys(lane.evidence as Record<string, unknown>).length),
    }));
    const resume = deriveFactoryResumeState(snapshots);
    const now = Date.now();
    const activeLocks = (locks || []).filter((lock) => lock.state === "acquired" && new Date(String(lock.lease_expires_at || 0)).getTime() > now);

    return NextResponse.json({
      roomId,
      latestWork: latest,
      recentWorks: works,
      lanes: lanes || [],
      locks: locks || [],
      activeLocks,
      resume,
      hostStatusAuthoritative: true,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Room Factory status failed." }, { status: 500 });
  }
}
