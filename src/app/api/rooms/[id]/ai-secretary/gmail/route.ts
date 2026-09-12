import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getGoogleConnection,
  googleApi,
  googleWorkspaceConfigured,
} from "@/lib/google-workspace";
import { evaluateToolPermission, auditToolGateway } from "@/lib/tool-gateway";
import {
  isHarryEmail,
  isKatieGmailAction,
} from "@/lib/ai-secretary/katie-gmail-policy";

export const dynamic = "force-dynamic";

function gmailRaw(to: string, subject: string, body: string) {
  const headers = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
  ];
  return Buffer.from(`${headers.join("\r\n")}\r\n\r\n${body}`, "utf8").toString(
    "base64url",
  );
}

async function authorize(roomId: string) {
  const user = await getCurrentUser();
  if (!user || !isHarryEmail(user.email))
    return { error: "Forbidden", status: 403 } as const;
  const db = await createClient();
  const { data: room } = await db
    .from("rooms")
    .select("id,room_owner_id")
    .eq("id", roomId)
    .maybeSingle();
  if (!room) return { error: "Room not found", status: 404 } as const;
  if (room.room_owner_id !== user.id)
    return { error: "Forbidden", status: 403 } as const;
  return { user } as const;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await authorize(id);
  if ("error" in auth)
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  const connection = await getGoogleConnection(auth.user.id);
  return NextResponse.json(
    {
      ok: true,
      oauthConfigured: googleWorkspaceConfigured(),
      connected: Boolean(connection),
      googleEmail: connection?.google_email || null,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await authorize(id);
  if ("error" in auth)
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await request.json().catch(() => ({}));
  if (!isKatieGmailAction(body?.action) || body.action === "status") {
    auditToolGateway("katie_gmail_blocked", {
      userId: auth.user.id,
      roomId: id,
      action: String(body?.action || ""),
    });
    return NextResponse.json(
      {
        error:
          "Katie Gmail permits reading and draft creation only. Harry approval is required for external actions.",
      },
      { status: 403 },
    );
  }

  const capability =
    body.action === "draft" ? "email.gmail.draft" : "email.gmail.read";
  const decision = evaluateToolPermission(capability, {
    owner: true,
    approved: false,
  });
  if (decision.decision !== "allow")
    return NextResponse.json({ error: decision.reason }, { status: 403 });

  let result: unknown;
  if (body.action === "search") {
    const query = String(
      body.query || "newer_than:14d (is:unread OR is:starred)",
    ).slice(0, 500);
    const maxResults = Math.min(Math.max(Number(body.maxResults || 12), 1), 20);
    result = await googleApi(
      auth.user.id,
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
    );
  } else if (body.action === "message") {
    const messageId = String(body.messageId || "").trim();
    if (!messageId)
      return NextResponse.json(
        { error: "messageId is required" },
        { status: 400 },
      );
    result = await googleApi(
      auth.user.id,
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
    );
  } else {
    const to = String(body.to || "").trim();
    const subject = String(body.subject || "").trim();
    const message = String(body.body || "").trim();
    if (!to || !subject || !message)
      return NextResponse.json(
        { error: "to, subject and body are required" },
        { status: 400 },
      );
    result = await googleApi(
      auth.user.id,
      "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: { raw: gmailRaw(to, subject, message) },
        }),
      },
    );
  }

  auditToolGateway("katie_gmail_execute", {
    userId: auth.user.id,
    roomId: id,
    action: body.action,
    ok: true,
  });
  return NextResponse.json(
    { ok: true, action: body.action, result },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
