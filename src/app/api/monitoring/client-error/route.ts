import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const MAX_MESSAGE = 2000;
const MAX_STACK = 12000;

function safeText(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  return value.slice(0, max);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const severity = body.severity === "P1" || body.severity === "P3" ? body.severity : "P2";
  const roomId = typeof body.roomId === "string" && /^[0-9a-f-]{36}$/i.test(body.roomId) ? body.roomId : null;
  const message = safeText(body.message, MAX_MESSAGE) || "Unknown client error";
  const eventType = safeText(body.eventType, 120) || "client_error";
  const requestId = safeText(body.requestId, 160);
  const url = safeText(body.url, 1200);
  const errorName = safeText(body.errorName, 240);
  const stack = safeText(body.stack, MAX_STACK);
  const userAgent = safeText(body.userAgent, 1200);

  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_URL || null;
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("incident_events")
    .insert({
      severity,
      source: "browser",
      event_type: eventType,
      room_id: roomId,
      request_id: requestId,
      url,
      message,
      error_name: errorName,
      stack,
      user_agent: userAgent,
      deployment_id: deploymentId,
      commit_sha: commitSha,
      metadata: {
        digest: safeText(body.digest, 500),
        visibilityState: safeText(body.visibilityState, 50),
      },
    })
    .select("id")
    .single();

  if (error) {
    console.error("[RC-INCIDENT-INGEST-FAILED]", { message: error.message, eventType, roomId });
    return NextResponse.json({ error: "Incident could not be recorded" }, { status: 500 });
  }

  const alertPayload = {
    incidentId: data.id,
    severity,
    eventType,
    roomId,
    requestId,
    message,
    deploymentId,
    commitSha,
  };

  if (severity === "P1") console.error("[RC-P1-ALERT]", alertPayload);
  else if (severity === "P2") console.warn("[RC-P2-ALERT]", alertPayload);
  else console.info("[RC-P3-INCIDENT]", alertPayload);

  return NextResponse.json({ ok: true, incidentId: data.id });
}
