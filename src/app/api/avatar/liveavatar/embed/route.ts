import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.LIVEAVATAR_API_KEY?.trim();
  const avatarId = process.env.LIVEAVATAR_AVATAR_ID?.trim();
  const contextId = process.env.LIVEAVATAR_CONTEXT_ID?.trim();
  const isSandbox = (process.env.LIVEAVATAR_SANDBOX ?? "true").toLowerCase() !== "false";

  if (!apiKey || !avatarId || !contextId) {
    return NextResponse.json({
      configured: false,
      provider: "heygen-liveavatar",
      reason: "LiveAvatar environment variables are not configured yet.",
    });
  }

  try {
    const response = await fetch("https://api.liveavatar.com/v2/embeddings", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        avatar_id: avatarId,
        context_id: contextId,
        is_sandbox: isSandbox,
      }),
      cache: "no-store",
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.data?.url) {
      return NextResponse.json(
        {
          configured: true,
          provider: "heygen-liveavatar",
          error: payload?.message || payload?.error || "LiveAvatar embed session could not be created.",
        },
        { status: response.status || 502 },
      );
    }

    return NextResponse.json({
      configured: true,
      provider: "heygen-liveavatar",
      sandbox: isSandbox,
      url: String(payload.data.url),
    });
  } catch (error) {
    return NextResponse.json(
      {
        configured: true,
        provider: "heygen-liveavatar",
        error: error instanceof Error ? error.message : "LiveAvatar request failed.",
      },
      { status: 502 },
    );
  }
}
