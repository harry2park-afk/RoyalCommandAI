import { describe, expect, it, vi } from "vitest";
import { mailChatIntent, mailReviewPrompts, readMailForChat } from "./mail-chat";
import { gmailSearchParams, scanReceivedMail, type MailRow } from "./mail-reader";
import { katieMailText } from "@/lib/locale/katie-mail";
function fixture(options: { disconnected?: boolean; failPage?: boolean; failRead?: boolean; failAI?: boolean; repeat?: boolean } = {}) {
  const actions: string[] = [];
  const readIds: string[] = [];
  const request = vi.fn(async (_url: unknown, init?: RequestInit) => {
    if (!init?.body) return Response.json({ connected: !options.disconnected, code: options.disconnected ? "GMAIL_RECONNECT_REQUIRED" : undefined });
    const body = JSON.parse(String(init.body)); actions.push(body.action || "summary");
    if (body.action === "search") {
      if (options.failPage && body.pageToken) return Response.json({ code: "GMAIL_READ_FAILED" }, { status: 502 });
      return Response.json({ result: {
        messages: body.pageToken ? [{ id: "m24" }, { id: "m25" }] : Array.from({ length: 25 }, (_, i) => ({ id: `m${i}` })),
        nextPageToken: !body.pageToken || options.repeat ? "next-page" : undefined,
      } });
    }
    if (body.action === "message") {
      readIds.push(body.messageId);
      return options.failRead ? Response.json({ code: "GMAIL_RECONNECT_REQUIRED" }, { status: 401 }) : Response.json({ result: { id: body.messageId, subject: "Invoice", from: "sender", date: "today", original: `Please review invoice ${body.messageId}` } });
    }
    if (options.failAI) return Response.json({ code: "GMAIL_READ_FAILED" }, { status: 503 });
    expect(body.message.length).toBeLessThanOrEqual(12000);
    return Response.json({ answer: "청구서 확인 요청입니다." });
  });
  return { request: request as unknown as typeof fetch, actions, readIds };
}
describe("Katie all received mail", () => {
  it("keeps outgoing actions behind existing review", () => {
    expect(mailChatIntent("모든 메일 검토")).toBe("read");
    expect(mailChatIntent("메일 보내주세요")).toBe("review");
    expect(mailChatIntent("메일 삭제해줘")).toBe("review");
  });
  it("reads beyond 20, follows page tokens, deduplicates and summarizes all bodies", async () => {
    const f = fixture(); const progress: number[] = [];
    const result = await readMailForChat("owned-room", "메일 정리", f.request, { onProgress: (count) => progress.push(count) });
    expect(result.complete).toBe(true); expect(result.count).toBe(26);
    expect(f.readIds.length).toBe(26); expect(new Set(f.readIds).size).toBe(26);
    expect(progress.at(-1)).toBe(26);
    expect(f.actions.every((action) => ["search", "message", "summary"].includes(action))).toBe(true);
  });
  it("includes the end of long escaped bodies within every helper request limit", () => {
    const original = '\u0000\n"'.repeat(10000) + "FINAL DEADLINE";
    const prompts = mailReviewPrompts([{ id: "m", from: "x", subject: "s", date: "d", original } as MailRow], "메일".repeat(1000));
    expect(prompts.every((prompt) => prompt.length <= 12000)).toBe(true);
    const sections = prompts.flatMap((prompt) => JSON.parse(prompt.split("\n\n").at(-1)!));
    expect(sections.map((part) => part.body).join("")).toBe(original);
  });
  it("does not query mail when credentials need reconnect", async () => {
    const f = fixture({ disconnected: true }); const result = await readMailForChat("room", "메일", f.request);
    expect(result.complete).toBe(false); expect(result.answer).toContain("다시 연결"); expect(f.actions).toEqual([]);
  });
  it("preserves prior summaries but never claims completion after a later page fails", async () => {
    const f = fixture({ failPage: true }); const result = await readMailForChat("room", "메일", f.request);
    expect(result.complete).toBe(false); expect(result.count).toBe(25); expect(result.answer).toContain("완료되지 않았");
  });
  it("does not count unread or unsummarized mail as reviewed", async () => {
    for (const option of [{ failRead: true }, { failAI: true }]) {
      const f = fixture(option); const result = await readMailForChat("room", "메일", f.request);
      expect(result.complete).toBe(false); expect(result.count).toBe(0);
    }
  });
  it("stops repeated continuation tokens", async () => {
    const f = fixture({ repeat: true });
    await expect(scanReceivedMail("room", f.request, () => {})).rejects.toThrow("GMAIL_PAGINATION_FAILED");
  });
  it("cancels before another batch can update the room", async () => {
    const controller = new AbortController(); const f = fixture(); let batches = 0;
    await expect(scanReceivedMail("room", f.request, () => { batches++; controller.abort(); }, { signal: controller.signal })).rejects.toThrow();
    expect(batches).toBe(1); expect(f.readIds.length).toBe(4);
  });
  it("encodes tokens and bounds per-page request sizes, not the total mailbox", () => {
    expect(gmailSearchParams({ maxResults: "bad", pageToken: "a&b" }).get("maxResults")).toBe("100");
    expect(gmailSearchParams({ maxResults: 5000 }).get("maxResults")).toBe("100");
    expect(gmailSearchParams({ pageToken: "a&b" }).get("pageToken")).toBe("a&b");
  });
  it("new UI text follows selected locale and English removes Korean", () => {
    expect(katieMailText("reconnect", "ko-KR")).toContain("다시 연결");
    expect(katieMailText("reconnect", "en-AU")).toBe("Reconnect Gmail");
    expect(katieMailText("reconnect", "fr")).toBe("Reconnect Gmail");
  });
});
