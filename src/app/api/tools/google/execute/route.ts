import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { auditToolGateway, evaluateToolPermission } from "@/lib/tool-gateway";
import { googleApi } from "@/lib/google-workspace";

const OWNER_EMAILS = new Set(["harry2park@gmail.com", "harry@royalcommand.ai"]);
const owner = (email: string) => OWNER_EMAILS.has(email.trim().toLowerCase());

function base64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function gmailRaw(to: string, subject: string, body: string, cc?: string) {
  const headers = [
    `To: ${to}`,
    cc ? `Cc: ${cc}` : "",
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
  ].filter(Boolean);
  return base64Url(`${headers.join("\r\n")}\r\n\r\n${body}`);
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const capability = String(body?.capability || "").trim();
    const action = String(body?.action || "").trim();
    const approved = body?.approved === true;
    const decision = evaluateToolPermission(capability, { owner: owner(user.email), approved });
    if (decision.decision !== "allow") {
      return NextResponse.json({ ok: false, ...decision }, { status: decision.decision === "approval_required" ? 409 : 403 });
    }

    let result: unknown;

    if (capability === "email.gmail.read" && action === "search") {
      const q = String(body?.query || "").trim();
      const maxResults = Math.min(Math.max(Number(body?.maxResults || 20), 1), 50);
      result = await googleApi(user.id, `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=${maxResults}`);
    } else if (capability === "email.gmail.read" && action === "message") {
      const id = String(body?.messageId || "").trim();
      if (!id) return NextResponse.json({ error: "messageId is required" }, { status: 400 });
      result = await googleApi(user.id, `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`);
    } else if (capability === "email.gmail.draft" && action === "create") {
      const to = String(body?.to || "").trim();
      const subject = String(body?.subject || "").trim();
      const message = String(body?.body || "");
      if (!to || !subject || !message) return NextResponse.json({ error: "to, subject and body are required" }, { status: 400 });
      result = await googleApi(user.id, "https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: { raw: gmailRaw(to, subject, message, String(body?.cc || "").trim() || undefined) } }),
      });
    } else if (capability === "email.gmail.send" && action === "send") {
      const to = String(body?.to || "").trim();
      const subject = String(body?.subject || "").trim();
      const message = String(body?.body || "");
      if (!to || !subject || !message) return NextResponse.json({ error: "to, subject and body are required" }, { status: 400 });
      result = await googleApi(user.id, "https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw: gmailRaw(to, subject, message, String(body?.cc || "").trim() || undefined) }),
      });
    } else if (capability === "calendar.google.read" && action === "list") {
      const timeMin = String(body?.timeMin || new Date().toISOString());
      const timeMax = String(body?.timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
      const maxResults = Math.min(Math.max(Number(body?.maxResults || 50), 1), 100);
      result = await googleApi(user.id, `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=${maxResults}`);
    } else if (capability === "calendar.google.write" && action === "create") {
      const event = body?.event;
      if (!event?.summary || !event?.start || !event?.end) return NextResponse.json({ error: "event.summary, event.start and event.end are required" }, { status: 400 });
      result = await googleApi(user.id, "https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(event),
      });
    } else if (capability === "calendar.google.write" && action === "update") {
      const eventId = String(body?.eventId || "").trim();
      if (!eventId || !body?.event) return NextResponse.json({ error: "eventId and event are required" }, { status: 400 });
      result = await googleApi(user.id, `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body.event),
      });
    } else if (capability === "files.drive.read" && action === "list") {
      const q = String(body?.query || "trashed=false").trim();
      const pageSize = Math.min(Math.max(Number(body?.pageSize || 50), 1), 100);
      result = await googleApi(user.id, `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&pageSize=${pageSize}&fields=files(id,name,mimeType,modifiedTime,size,webViewLink,parents),nextPageToken&orderBy=modifiedTime%20desc`);
    } else if (capability === "files.drive.read" && action === "metadata") {
      const fileId = String(body?.fileId || "").trim();
      if (!fileId) return NextResponse.json({ error: "fileId is required" }, { status: 400 });
      result = await googleApi(user.id, `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,modifiedTime,size,webViewLink,parents`);
    } else if (capability === "files.drive.write" && action === "create_text") {
      const name = String(body?.name || "").trim();
      const content = String(body?.content || "");
      if (!name || !content) return NextResponse.json({ error: "name and content are required" }, { status: 400 });
      const boundary = `rc_${Date.now().toString(36)}`;
      const metadata = JSON.stringify({ name, mimeType: String(body?.mimeType || "text/plain") });
      const multipart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${String(body?.mimeType || "text/plain")}\r\n\r\n${content}\r\n--${boundary}--`;
      result = await googleApi(user.id, "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink", {
        method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body: multipart,
      });
    } else {
      return NextResponse.json({ error: "Unsupported Google Workspace gateway action" }, { status: 400 });
    }

    auditToolGateway("google_execute", { userId: user.id, capability, action, approved, ok: true });
    return NextResponse.json({ ok: true, capability, action, result });
  } catch (error) {
    auditToolGateway("google_execute_failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Google Workspace gateway execution failed" }, { status: 500 });
  }
}
