import { NextRequest, NextResponse } from "next/server";
import { getRetellVoiceAgent } from "@/lib/integrations/retellClient";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ agentId: string }> },
) {
  try {
    const { agentId } = await context.params;
    const agent = await getRetellVoiceAgent(agentId);

    return NextResponse.json({
      ok: true,
      provider: "RETELL",
      readOnly: true,
      agent,
    });
  } catch (error) {
    console.error("Retell agent detail read failed", error);
    return NextResponse.json(
      { ok: false, provider: "RETELL", error: "RETELL_AGENT_DETAIL_READ_FAILED" },
      { status: 502 },
    );
  }
}
