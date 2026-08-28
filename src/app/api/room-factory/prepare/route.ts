import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getAvailableProviderIds } from "@/lib/ai/connectors";
import { AI_PROVIDER_IDS, type AIProviderId } from "@/lib/ai/types";
import type { RoomFactoryBlueprint } from "@/lib/rooms/factory";
import { buildRoomFactoryRcaControlPlan } from "@/lib/rooms/factoryRcaPlan";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

const requestSchema = z.object({
  roomId: z.string().uuid(),
  providers: z.array(z.enum(AI_PROVIDER_IDS)).min(1).max(AI_PROVIDER_IDS.length),
});

function isBlueprint(value: unknown): value is RoomFactoryBlueprint {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RoomFactoryBlueprint>;
  return candidate.version === "room-factory-v1"
    && Boolean(candidate.room?.templateId)
    && Boolean(candidate.locale?.countryCode)
    && Array.isArray(candidate.lanes)
    && candidate.execution?.singleWriteAuthority === true
    && candidate.execution?.reviewerCanWrite === false
    && candidate.execution?.evidenceBeforeSuccess === true;
}

function makeWorkIdentity() {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const nonce = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return {
    workId: `RC-FACTORY-${stamp}-${nonce}`,
    requestKey: `room-factory:${stamp}:${nonce}`,
  };
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Room Factory preparation requires the configured RCA database." }, { status: 503 });
    }

    const input = requestSchema.parse(await request.json());
    const available = new Set(getAvailableProviderIds());
    const selectedConnected = input.providers.filter((provider) => available.has(provider)) as AIProviderId[];

    const supabase = await createClient();
    const { data: manifestRow, error: manifestError } = await supabase
      .from("room_factory_manifests")
      .select("room_id, manifest, factory_version, template_id, country_code, language_tag")
      .eq("room_id", input.roomId)
      .single();

    if (manifestError || !manifestRow) {
      return NextResponse.json({ error: "Factory Manifest not found or Room access denied." }, { status: 404 });
    }
    if (!isBlueprint(manifestRow.manifest)) {
      return NextResponse.json({ error: "Stored Factory Manifest is invalid." }, { status: 409 });
    }

    const controlPlan = buildRoomFactoryRcaControlPlan(manifestRow.manifest, selectedConnected);
    if (!controlPlan.readyForExecutionPreparation || !controlPlan.taskPlan || !controlPlan.writer) {
      return NextResponse.json({
        error: "Room Factory control plan is not ready for preparation.",
        requestedProviders: input.providers,
        selectedConnectedProviders: selectedConnected,
        unavailableRequestedProviders: input.providers.filter((provider) => !available.has(provider)),
        controlPlan,
      }, { status: 409 });
    }

    const identity = makeWorkIdentity();
    const lanes = controlPlan.taskPlan.lanes.map((lane) => ({
      id: lane.id,
      title: lane.title,
      writer: lane.writer,
      reviewers: lane.reviewers,
      resources: lane.resources,
      dependsOn: lane.dependsOn,
      parallelGroup: lane.parallelGroup || null,
      evidence: lane.evidence,
    }));

    const { data: preparationRows, error: preparationError } = await supabase.rpc(
      "prepare_room_factory_work_plan",
      {
        p_room_id: input.roomId,
        p_request_key: identity.requestKey,
        p_work_id: identity.workId,
        p_title: controlPlan.taskPlan.summary,
        p_writer: controlPlan.writer,
        p_lanes: lanes,
      },
    );

    if (preparationError) {
      return NextResponse.json({ error: preparationError.message }, { status: 500 });
    }

    const preparation = Array.isArray(preparationRows) ? preparationRows[0] : preparationRows;
    if (!preparation?.work_record_id || preparation?.lane_count !== lanes.length) {
      return NextResponse.json({ error: "Host preparation evidence is incomplete." }, { status: 500 });
    }

    return NextResponse.json({
      manifest: {
        roomId: manifestRow.room_id,
        factoryVersion: manifestRow.factory_version,
        templateId: manifestRow.template_id,
        countryCode: manifestRow.country_code,
        languageTag: manifestRow.language_tag,
      },
      requestedProviders: input.providers,
      selectedConnectedProviders: selectedConnected,
      unavailableRequestedProviders: input.providers.filter((provider) => !available.has(provider)),
      writer: controlPlan.writer,
      reviewers: controlPlan.reviewers,
      preparation,
      controlPlan,
      executionStarted: false,
      activeLocksAcquired: false,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Room Factory preparation failed." }, { status: 500 });
  }
}
