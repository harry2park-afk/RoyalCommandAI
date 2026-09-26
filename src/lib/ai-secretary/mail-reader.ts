// Read-only traversal shared by Katie's list and chat. A page size is not a total limit.
export const RECEIVED_MAIL_QUERY = "-in:sent -in:drafts -in:spam -in:trash";
export type MailRow = {
  id: string; threadId: string; from: string; to: string; subject: string; date: string;
  snippet: string; original: string; labelIds: string[]; messageIdHeader: string; references: string;
  attachments: Array<{ filename: string; mimeType: string; size: number; attachmentId: string }>;
};
export class MailReadError extends Error {
  constructor(public code: string) { super(code); }
}
export async function mailJson(request: typeof fetch, url: string, body?: object) {
  const response = await request(url, {
    ...(body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
    cache: "no-store", signal: AbortSignal.timeout(120000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new MailReadError(data.code || "GMAIL_READ_FAILED");
  return data;
}
export async function scanReceivedMail(
  roomId: string, request: typeof fetch,
  onBatch: (rows: MailRow[], count: number) => void | Promise<void>,
  options: { unread?: boolean; signal?: AbortSignal; metadataOnly?: boolean } = {},
) {
  const endpoint = `/api/rooms/${encodeURIComponent(roomId)}/ai-secretary/gmail`;
  const json = (body?: object) => mailJson(request, endpoint, body);
  options.signal?.throwIfAborted();
  const connection = await json();
  if (!connection.connected) throw new MailReadError(connection.code || "GMAIL_RECONNECT_REQUIRED");
  const ids = new Set<string>();
  const tokens = new Set<string>();
  let pageToken: string | undefined;
  let loaded = 0;
  do {
    options.signal?.throwIfAborted();
    const { result: page } = await json({ action: "search", query: RECEIVED_MAIL_QUERY + (options.unread ? " is:unread" : ""), maxResults: 100, pageToken });
    if (!page || (page.messages !== undefined && !Array.isArray(page.messages))) throw new MailReadError("GMAIL_READ_FAILED");
    const pending = (page.messages || []).filter((item: { id?: string }) => {
      if (!item.id || ids.has(item.id)) return false;
      ids.add(item.id); return true;
    }) as Array<{ id: string }>;
    for (let offset = 0; offset < pending.length; offset += 4) {
      options.signal?.throwIfAborted();
      const rows = await Promise.all(pending.slice(offset, offset + 4).map(async ({ id }) => {
        const { result } = await json({ action: "message", messageId: id, metadataOnly: options.metadataOnly === true });
        if (!result || typeof result.subject !== "string") throw new MailReadError("GMAIL_READ_FAILED");
        return { ...result, id } as MailRow;
      }));
      options.signal?.throwIfAborted();
      loaded += rows.length;
      await onBatch(rows, loaded);
    }
    pageToken = typeof page.nextPageToken === "string" && page.nextPageToken ? page.nextPageToken : undefined;
    if (pageToken && tokens.has(pageToken)) throw new MailReadError("GMAIL_PAGINATION_FAILED");
    if (pageToken) tokens.add(pageToken);
  } while (pageToken);
  return ids.size;
}
export function gmailFailureCode(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return /invalid_grant|expired or revoked|not connected|invalid authentication credentials|insufficient authentication scopes/i.test(message)
    ? "GMAIL_RECONNECT_REQUIRED" : "GMAIL_READ_FAILED";
}
export function gmailSearchParams(body: { query?: unknown; maxResults?: unknown; pageToken?: unknown }) {
  const requested = Number(body.maxResults ?? 100);
  const maxResults = Number.isFinite(requested) ? Math.min(100, Math.max(1, Math.floor(requested))) : 100;
  const params = new URLSearchParams({ q: String(body.query || RECEIVED_MAIL_QUERY).slice(0, 500), maxResults: String(maxResults) });
  if (typeof body.pageToken === "string" && body.pageToken.length <= 4096 && body.pageToken) params.set("pageToken", body.pageToken);
  return params;
}
