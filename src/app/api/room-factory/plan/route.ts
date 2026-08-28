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
    && Boolean(candidate.execution?.singleWriteAuthority);
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Room Factory planning requires the configured RCA database." }, { status: 503 });
    }

    const input = requestSchema.parse(await request.json());
    const available = new Set(getAvailableProviderIds());
    const selectedConnected = input.providers.filter((provider) => available.has(provider)) as AIProviderId[];

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("room_factory_manifests")
      .select("room_id, manifest, factory_version, template_id, country_code, language_tag")
      .eq("room_id", input.roomId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Factory Manifest not found or Room access denied." }, { status: 404 });
    }
    if (!isBlueprint(data.manifest)) {
      return NextResponse.json({ error: "Stored Factory Manifest is invalid." }, { status: 409 });
    }

    const controlPlan = buildRoomFactoryRcaControlPlan(data.manifest, selectedConnected);

    return NextResponse.json({
      manifest: {
        roomId: data.room_id,
        factoryVersion: data.factory_version,
        templateId: data.template_id,
        countryCode: data.country_code,
        languageTag: data.language_tag,
      },
      requestedProviders: input.providers,
      selectedConnectedProviders: selectedConnected,
      unavailableRequestedProviders: input.providers.filter((provider) => !available.has(provider)),
      controlPlan,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Room Factory planning failed." }, { status: 500 });
  }
}
