import { NextRequest, NextResponse } from "next/server";
import { getRetellLlm } from "@/lib/integrations/retellClient";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ llmId: string }> },
) {
  try {
    const { llmId } = await context.params;
    const llm = await getRetellLlm(llmId);

    return NextResponse.json({
      ok: true,
      provider: "RETELL",
      readOnly: true,
      llm,
    });
  } catch (error) {
    console.error("Retell LLM detail read failed", error);
    return NextResponse.json(
      { ok: false, provider: "RETELL", error: "RETELL_LLM_DETAIL_READ_FAILED" },
      { status: 502 },
    );
  }
}
