import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getGoogleConnection, googleApi, googleWorkspaceConfigured } from "@/lib/google-workspace";
import { evaluateToolPermission, auditToolGateway } from "@/lib/tool-gateway";
import { isHarryEmail, isKatieGmailAction, katieGmailNeedsApproval } from "@/lib/ai-secretary/katie-gmail-policy";

export const dynamic = "force-dynamic";

type Part = { mimeType?: string; filename?: string; body?: { data?: string; attachmentId?: string; size?: number }; parts?: Part[] };
type Message = { id?: string; threadId?: string; labelIds?: string[]; snippet?: string; payload?: Part & { headers?: Array<{ name?: string; value?: string }> } };

const decode = (value = "") => value ? Buffer.from(value, "base64url").toString("utf8") : "";
function textFromHtml(value: string) {
  return value.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function collect(part: Part | undefined, out: { plain: string[]; html: string[]; attachments: Array<{ filename: string; mimeType: string; size: number; attachmentId: string }> }) {
  if (!part) return;
  const filename = String(part.filename || "").trim();
  const attachmentId = String(part.body?.attachmentId || "");
  if (filename && attachmentId) out.attachments.push({ filename, mimeType: String(part.mimeType || "application/octet-stream"), size: Number(part.body?.size || 0), attachmentId });
  else if (part.body?.data) {
    const value = decode(part.body.data);
    if (part.mimeType === "text/plain") out.plain.push(value);
    if (part.mimeType === "text/html") out.html.push(value);
  }
  for (const child of part.parts || []) collect(child, out);
}
function getHeader(headers: Array<{ name?: string; value?: string }> | undefined, name: string) {
  return headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value || "";
}
function normalize(value: unknown) {
  const message = value as Message;
  const out = { plain: [] as string[], html: [] as string[], attachments: [] as Array<{ filename: string; mimeType: string; size: number; attachmentId: string }> };
  collect(message.payload, out);
  const headers = message.payload?.headers;
  return {
    id: String(message.id || ""), threadId: String(message.threadId || ""), labelIds: message.labelIds || [],
    from: getHeader(headers, "From"), to: getHeader(headers, "To"), subject: getHeader(headers, "Subject") || "(제목 없음)", date: getHeader(headers, "Date"),
    messageIdHeader: getHeader(headers, "Message-ID"), references: getHeader(headers, "References"), snippet: String(message.snippet || ""),
    original: (out.plain.join("\n\n").trim() || textFromHtml(out.html.join("\n")) || String(message.snippet || "")).slice(0, 100_000), attachments: out.attachments,
  };
}
function gmailRaw(to: string, subject: string, body: string, reply?: { messageId?: string; references?: string }) {
  const references = [reply?.references, reply?.messageId].filter(Boolean).join(" ");
  const headers = [`To: ${to}`, `Subject: ${subject}`, reply?.messageId ? `In-Reply-To: ${reply.messageId}` : "", references ? `References: ${references}` : "", "MIME-Version: 1.0", 'Content-Type: text/plain; charset="UTF-8"', "Content-Transfer-Encoding: 8bit"].filter(Boolean);
  return Buffer.from(`${headers.join("\r\n")}\r\n\r\n${body}`, "utf8").toString("base64url");
}
async function authorize(roomId: string) {
  const user = await getCurrentUser();
  if (!user || !isHarryEmail(user.email)) return { error: "Forbidden", status: 403 } as const;
  const db = await createClient();
  const { data: room } = await db.from("rooms").select("id,room_owner_id").eq("id", roomId).maybeSingle();
  if (!room) return { error: "Room not found", status: 404 } as const;
  if (room.room_owner_id !== user.id) return { error: "Forbidden", status: 403 } as const;
  return { user } as const;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = await authorize(id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const connection = await getGoogleConnection(auth.user.id);
  return NextResponse.json({ ok: true, oauthConfigured: googleWorkspaceConfigured(), connected: Boolean(connection), googleEmail: connection?.google_email || null }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const auth = await authorize(id);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const body = await request.json().catch(() => ({}));
    if (!isKatieGmailAction(body?.action) || body.action === "status") {
      auditToolGateway("katie_gmail_blocked", { userId: auth.user.id, roomId: id, action: String(body?.action || "") });
      return NextResponse.json({ error: "Katie Gmail에서 삭제와 전달은 허용되지 않습니다." }, { status: 403 });
    }
    if (katieGmailNeedsApproval(body.action) && body.approved !== true) return NextResponse.json({ error: "Harry의 명시적 승인이 필요합니다." }, { status: 409 });
    const capability = body.action === "send" ? "email.gmail.send" : body.action === "draft" ? "email.gmail.draft" : "email.gmail.read";
    const decision = evaluateToolPermission(capability, { owner: true, approved: body.approved === true });
    if (decision.decision !== "allow") return NextResponse.json({ error: decision.reason }, { status: decision.decision === "approval_required" ? 409 : 403 });

    let result: unknown;
    if (body.action === "search") {
      const query = String(body.query || "newer_than:14d (is:unread OR is:starred)").slice(0, 500);
      const maxResults = Math.min(Math.max(Number(body.maxResults || 12), 1), 20);
      result = await googleApi(auth.user.id, `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`);
    } else if (body.action === "message") {
      const messageId = String(body.messageId || "").trim();
      if (!messageId) return NextResponse.json({ error: "messageId is required" }, { status: 400 });
      result = normalize(await googleApi(auth.user.id, `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?format=full`));
    } else if (body.action === "thread") {
      const threadId = String(body.threadId || "").trim();
      if (!threadId) return NextResponse.json({ error: "threadId is required" }, { status: 400 });
      const raw = await googleApi(auth.user.id, `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}?format=full`) as { messages?: unknown[] };
      result = { id: threadId, messages: (raw.messages || []).map(normalize) };
    } else if (body.action === "attachment") {
      const messageId = String(body.messageId || "").trim();
      const attachmentId = String(body.attachmentId || "").trim();
      if (!messageId || !attachmentId) return NextResponse.json({ error: "messageId and attachmentId are required" }, { status: 400 });
      const raw = await googleApi(auth.user.id, `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`) as { data?: string; size?: number };
      if (Number(raw.size || 0) > 10 * 1024 * 1024) return NextResponse.json({ error: "첨부파일은 10MB까지 열 수 있습니다." }, { status: 413 });
      result = { data: raw.data || "", size: Number(raw.size || 0) };
    } else {
      const to = String(body.to || "").trim(); const subject = String(body.subject || "").trim(); const message = String(body.body || "").trim();
      if (!to || !subject || !message) return NextResponse.json({ error: "to, subject and body are required" }, { status: 400 });
      const raw = gmailRaw(to, subject, message, { messageId: String(body.messageIdHeader || ""), references: String(body.references || "") });
      const messagePayload = { raw, ...(body.threadId ? { threadId: String(body.threadId) } : {}) };
      result = await googleApi(auth.user.id, body.action === "draft" ? "https://gmail.googleapis.com/gmail/v1/users/me/drafts" : "https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body.action === "draft" ? { message: messagePayload } : messagePayload) });
    }
    auditToolGateway("katie_gmail_execute", { userId: auth.user.id, roomId: id, action: body.action, approved: body.approved === true, ok: true });
    return NextResponse.json({ ok: true, action: body.action, result }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    auditToolGateway("katie_gmail_failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gmail 요청에 실패했습니다." }, { status: 500 });
  }
}
