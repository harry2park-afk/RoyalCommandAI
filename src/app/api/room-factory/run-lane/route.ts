import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

const BUILD_LANES = ["core", "domain", "country", "integrations"] as const;

const requestSchema = z.object({
  roomId: z.string().uuid(),
  workRecordId: z.string().uuid(),
  laneId: z.enum(BUILD_LANES),
  goal: z.string().min(3).max(12000),
  leaseSeconds: z.number().int().min(60).max(3600).default(1800),
});

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function manifestExcerpt(manifest: unknown, laneId: (typeof BUILD_LANES)[number]) {
  const root = asRecord(manifest);
  const room = asRecord(root.room);
  const execution = asRecord(root.execution);
  const locale = asRecord(root.locale);
  const capabilities = asRecord(root.capabilities);
  const lanes = Array.isArray(root.lanes) ? root.lanes.map(asRecord) : [];
  const lane = lanes.find((item) => String(item.id || "") === laneId) || {};

  if (laneId === "core") {
    return {
      room: { name: room.name, templateId: room.templateId, templateName: room.templateName, purpose: room.purpose },
      execution,
      clonePolicy: root.clonePolicy,
      lane,
    };
  }
  if (laneId === "domain") {
    return {
      room,
      capabilities,
      lane,
    };
  }
  if (laneId === "country") {
    return {
      locale,
      readiness: root.readiness,
      lane,
      complianceRule: "Country preset registration is locale-default coverage only. Never infer legal/regulatory approval from it.",
    };
  }
  return {
    room: { suggestedAgents: room.suggestedAgents, templateId: room.templateId, purpose: room.purpose },
    capabilities,
    execution: {
      secretsStayHostOwned: execution.secretsStayHostOwned,
      tenantIsolation: execution.tenantIsolation,
      productionWriteDefault: execution.productionWriteDefault,
    },
    lane,
  };
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Room Factory build requires the configured RCA database." }, { status: 503 });
    }

    const input = requestSchema.parse(await request.json());
    const supabase = await createClient();
    const { data: manifestRow, error: manifestError } = await supabase
      .from("room_factory_manifests")
      .select("room_id, manifest, factory_version, template_id, country_code, language_tag")
      .eq("room_id", input.roomId)
      .single();
    if (manifestError || !manifestRow) {
      return NextResponse.json({ error: "Factory Manifest not found or Room access denied." }, { status: 404 });
    }

    const context = manifestExcerpt(manifestRow.manifest, input.laneId);
    const instruction = [
      "ROYAL COMMAND ROOM FACTORY — HOST-STORED MANIFEST BUILD CONTEXT",
      `Current Work Lane: ${input.laneId}`,
      `Factory Version: ${manifestRow.factory_version}`,
      `Template ID: ${manifestRow.template_id}`,
      `Country: ${manifestRow.country_code}`,
      `Language: ${manifestRow.language_tag}`,
      "The JSON excerpt below comes from the Host-stored Factory Manifest and is authoritative for this lane.",
      "Work only on the current lane. Preserve already-passed prior lanes and all existing working features.",
      "Do not create test markers, placeholder code, fake evidence, unrelated documentation, or speculative extra features.",
      "Do not expose or copy secrets. Customer data, memory, credentials and secrets remain isolated and must never be cloned from a template.",
      "Do not merge or deploy generated Work to Production.",
      "",
      "USER / FACTORY GOAL:",
      input.goal,
      "",
      "HOST MANIFEST EXCERPT:",
      JSON.stringify(context),
    ].join("\n");

    const cookie = request.headers.get("cookie") || "";
    const response = await fetch(new URL("/api/room-factory/execute-lane", request.url), {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({
        roomId: input.roomId,
        workRecordId: input.workRecordId,
        laneId: input.laneId,
        instruction,
        leaseSeconds: input.leaseSeconds,
      }),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));

    return NextResponse.json({
      hostContextApplied: true,
      laneId: input.laneId,
      manifest: {
        factoryVersion: manifestRow.factory_version,
        templateId: manifestRow.template_id,
        countryCode: manifestRow.country_code,
        languageTag: manifestRow.language_tag,
      },
      execution: payload,
    }, { status: response.status });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Room Factory lane build failed." }, { status: 500 });
  }
}
