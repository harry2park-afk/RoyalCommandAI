import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { compileRoomFactoryV2Blueprint } from "@/lib/rooms/factory";
import { defaultRoomName, resolveDomainProfile } from "@/lib/rooms/factory-v2";
import { DEFAULT_GLOBAL_ROOM_SETTINGS, GLOBAL_ROOM_PRESETS } from "@/lib/rooms/global";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

const factoryCreateSchema = z.object({
  roomName: z.string().min(1).max(120).optional(),
  templateId: z.string().min(1).max(80),
  countryCode: z.string().min(1).max(8).optional(),
  languageTag: z.string().min(1).max(35).optional(),
  languageTags: z.array(z.string().min(1).max(35)).max(10).optional(),
  timeZone: z.string().min(1).max(80).optional(),
  currencyCode: z.string().min(3).max(3).optional(),
  approvalMode: z.enum(["safe", "approval", "autonomous"]).default("approval"),
  websiteKit: z.boolean().default(false),
  selectedMaterials: z.array(z.string().min(1).max(100)).max(100).default([]),
  householdId: z.string().uuid().optional(),
  encounterSessionId: z.string().uuid().optional(),
});

function localeDefaults(countryCode: string) {
  const preset = GLOBAL_ROOM_PRESETS.find((item) => item.id === countryCode);
  return preset || DEFAULT_GLOBAL_ROOM_SETTINGS;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Room Factory persistence requires the configured RCA database." }, { status: 503 });
    }

    const supabase = await createClient();
    const { data: manifests, error: manifestError } = await supabase
      .from("room_factory_manifests")
      .select("id, room_id, factory_version, template_id, country_code, language_tag, country_profile_status, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (manifestError) return NextResponse.json({ error: manifestError.message }, { status: 500 });

    const roomIds = (manifests || []).map((manifest) => manifest.room_id);
    if (!roomIds.length) return NextResponse.json({ rooms: [] });

    const { data: rooms, error: roomError } = await supabase
      .from("rooms")
      .select("id, name, status, created_at")
      .in("id", roomIds);
    if (roomError) return NextResponse.json({ error: roomError.message }, { status: 500 });

    const roomById = new Map((rooms || []).map((room) => [room.id, room]));
    return NextResponse.json({
      rooms: (manifests || []).map((manifest) => ({
        roomId: manifest.room_id,
        manifestId: manifest.id,
        name: roomById.get(manifest.room_id)?.name || "Unnamed Factory Room",
        status: roomById.get(manifest.room_id)?.status || "unknown",
        factoryVersion: manifest.factory_version,
        templateId: manifest.template_id,
        countryCode: manifest.country_code,
        languageTag: manifest.language_tag,
        countryProfileStatus: manifest.country_profile_status,
        createdAt: manifest.created_at,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Room Factory room listing failed." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Room Factory persistence requires the configured RCA database." }, { status: 503 });
    }

    const rawInput = factoryCreateSchema.parse(await request.json());
    const resolved = resolveDomainProfile(rawInput.templateId);
    const countryCode = (rawInput.countryCode || user.countryCode || "GLOBAL").trim().toUpperCase().slice(0, 8) || "GLOBAL";
    const defaults = localeDefaults(countryCode);
    const languageTag = (rawInput.languageTag || user.defaultLanguage || defaults.languageTag || "en").trim().slice(0, 35) || "en";
    const roomName = (rawInput.roomName || defaultRoomName(user.fullName, resolved.profile)).trim().slice(0, 120);

    const input = {
      roomName,
      templateId: resolved.template.id,
      countryCode,
      languageTag,
      languageTags: rawInput.languageTags,
      timeZone: rawInput.timeZone || defaults.timeZone || DEFAULT_GLOBAL_ROOM_SETTINGS.timeZone,
      currencyCode: rawInput.currencyCode || defaults.currencyCode || DEFAULT_GLOBAL_ROOM_SETTINGS.currencyCode,
      approvalMode: rawInput.approvalMode,
      websiteKit: rawInput.websiteKit,
      selectedMaterials: rawInput.selectedMaterials,
    };

    const blueprint = compileRoomFactoryV2Blueprint(input);
    if (!blueprint.readiness.readyForSafeBuild) {
      return NextResponse.json({ error: "Room Factory V2 blueprint is blocked.", blueprint }, { status: 400 });
    }

    const supabase = await createClient();
    const storedManifest = rawInput.encounterSessionId
      ? { ...blueprint, encounterSessionId: rawInput.encounterSessionId }
      : blueprint;
    const roomDescription = `${blueprint.room.templateName} · ${blueprint.room.purpose}`.slice(0, 2000);

    // Both creation modes persist through the same privileged transaction.
    // Encounter-backed calls are idempotent; null-encounter calls intentionally
    // create a fresh Room. This keeps host-compiled manifests behind RLS rather
    // than granting direct authenticated INSERT access to the manifest table.
    const { data: atomicRows, error: atomicError } = await supabase.rpc("create_room_factory_room_atomic", {
      p_encounter_session_id: rawInput.encounterSessionId ?? null,
      p_household_id: rawInput.householdId ?? null,
      p_household_name: `${user.fullName}'s Household`,
      p_room_name: blueprint.room.name,
      p_room_description: roomDescription,
      p_language_pref: blueprint.locale.languageTag,
      p_factory_version: blueprint.version,
      p_template_id: blueprint.room.templateId,
      p_country_code: blueprint.locale.countryCode,
      p_language_tag: blueprint.locale.languageTag,
      p_country_profile_status: blueprint.locale.countryProfileStatus,
      p_manifest: storedManifest,
    });

    if (atomicError) return NextResponse.json({ error: atomicError.message }, { status: 500 });

    const atomicResult = Array.isArray(atomicRows) ? atomicRows[0] : atomicRows;
    if (!atomicResult?.room_data || !atomicResult?.manifest_data) {
      return NextResponse.json({ error: "Atomic Room Factory creation returned no persisted Room." }, { status: 500 });
    }

    const reused = Boolean(atomicResult.reused);
    if (!rawInput.encounterSessionId && reused) {
      return NextResponse.json({ error: "Non-encounter Room Factory creation unexpectedly reused an existing Room." }, { status: 500 });
    }

    return NextResponse.json(
      { room: atomicResult.room_data, manifest: atomicResult.manifest_data, blueprint, reused },
      { status: reused ? 200 : 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Room Factory creation failed." }, { status: 500 });
  }
}
