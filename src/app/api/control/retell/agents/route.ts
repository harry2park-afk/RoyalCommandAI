import { NextResponse } from "next/server";
import { listRetellVoiceAgents } from "@/lib/integrations/retellClient";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const agents = await listRetellVoiceAgents();

    return NextResponse.json({
      ok: true,
      provider: "RETELL",
      readOnly: true,
      count: agents.length,
      agents: agents.map((agent) => ({
        agentId: agent.agent_id,
        name: agent.agent_name ?? null,
        language: agent.language ?? null,
        voiceId: agent.voice_id ?? null,
        version: agent.version,
        published: agent.is_published ?? null,
        lastModified: agent.last_modification_timestamp ?? null,
      })),
    });
  } catch (error) {
    console.error("Retell inventory read failed", error);
    return NextResponse.json(
      { ok: false, provider: "RETELL", error: "RETELL_INVENTORY_READ_FAILED" },
      { status: 502 },
    );
  }
}
