import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const maxDuration = 240;

/**
 * Legacy compatibility endpoint.
 * Gemini development execution is owned by /api/dev/agent together with
 * ChatGPT, Claude, and Grok. Keeping only this thin adapter prevents Gemini
 * from drifting onto a separate GitHub/master-write implementation.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cookie = request.headers.get("cookie") || "";
  const response = await fetch(new URL("/api/dev/agent", request.url), {
    method: "GET",
    headers: { cookie },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  return NextResponse.json({ ...payload, compatibilityEndpoint: "gemini", provider: "google" }, { status: response.status });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await request.text();
  let body: Record<string, unknown> = {};
  try {
    body = raw ? JSON.parse(raw) as Record<string, unknown> : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const cookie = request.headers.get("cookie") || "";
  const response = await fetch(new URL("/api/dev/agent", request.url), {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ ...body, provider: "google" }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  return NextResponse.json({ ...payload, compatibilityEndpoint: "gemini" }, { status: response.status });
}
