import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

export const maxDuration = 240;

type StreamEvent = {
  type?: string;
  result?: unknown;
  error?: string;
};

/**
 * Compatibility JSON endpoint.
 * RC Room has exactly one routing/execution authority: /api/ai/chat/stream.
 * Keep this endpoint thin so intent parsing, provider selection, Work-ID,
 * GitHub execution evidence, retries, and persistence cannot drift apart.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rawBody = await request.text();
    const cookie = request.headers.get("cookie") || "";
    const response = await fetch(new URL("/api/ai/chat/stream", request.url), {
      method: "POST",
      headers: {
        "Content-Type": request.headers.get("content-type") || "application/json",
        cookie,
      },
      body: rawBody,
      cache: "no-store",
    });

    const text = await response.text();
    if (!response.ok) {
      try {
        return NextResponse.json(JSON.parse(text), { status: response.status });
      } catch {
        return NextResponse.json({ error: text || "AI execution failed" }, { status: response.status });
      }
    }

    let finalResult: unknown;
    let lastError = "";
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line) as StreamEvent;
        if (event.type === "final" && event.result !== undefined) finalResult = event.result;
        if (event.type === "error" && event.error) lastError = event.error;
      } catch {
        // The stream endpoint owns event validation; malformed lines are ignored here.
      }
    }

    if (finalResult !== undefined) return NextResponse.json(finalResult);
    return NextResponse.json({ error: lastError || "AI stream returned no final result" }, { status: 502 });
  } catch (error) {
    logger.error("chat.compat.failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "AI chat compatibility endpoint failed" }, { status: 500 });
  }
}
