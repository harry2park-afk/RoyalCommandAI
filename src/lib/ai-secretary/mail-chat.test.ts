import { describe, expect, it, vi } from "vitest";
import { mailChatIntent, readMailForChat } from "./mail-chat";
function fixture(options: { connected?: boolean; failRead?: boolean; failAI?: boolean } = {}) {
  const actions: string[] = [];
  const request = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    if (!init?.body) return Response.json({ connected: options.connected !== false });
    const body = JSON.parse(String(init.body)); actions.push(body.action || "summary");
    if (body.action === "search") return Response.json({ result: { messages: [{ id: "m1" }] } });
    if (body.action === "message") return options.failRead ? Response.json({ error: "권한 오류" }, { status: 403 }) : Response.json({ result: { subject: "Invoice", from: "sender", original: "Please review invoice" } });
    if (options.failAI) return Response.json({ error: "unavailable" }, { status: 503 });
    expect(body.message.length).toBeLessThanOrEqual(12000);
    return Response.json({ answer: "청구서 확인 요청입니다." });
  });
  return { request: request as unknown as typeof fetch, actions };
}
describe("mail chat read integration", () => {
  it("routes mail summaries to reading and keeps write requests for review", () => {
    expect(mailChatIntent("지금까지 온메일을 정리해서 올려줘요")).toBe("read");
    expect(mailChatIntent("메일 보내주세요")).toBe("review");
    expect(mailChatIntent("메일 삭제해줘")).toBe("review");
    expect(mailChatIntent("안녕하세요")).toBeNull();
  });
  it("reads actual message content before summarizing, never writes mail", async () => {
    const f = fixture(); const result = await readMailForChat("owned-room", "메일 정리", f.request);
    expect(f.actions).toEqual(["search", "message", "summary"]);
    expect(result.count).toBe(1); expect(result.answer).toContain("청구서 확인");
  });
  it("bounds escaped content for twenty long messages within the helper limit", async () => {
    let prompt = "";
    const request = async (_url: unknown, init?: RequestInit) => {
      if (!init?.body) return Response.json({ connected: true });
      const body = JSON.parse(String(init.body));
      if (body.action === "search") return Response.json({ result: { messages: Array.from({ length: 20 }, (_, i) => ({ id: String(i) })) } });
      if (body.action === "message") return Response.json({ result: { subject: '\n"'.repeat(200), from: '\n"'.repeat(200), date: '\n"'.repeat(200), original: '\n"'.repeat(1000) } });
      prompt = body.message;
      return Response.json({ answer: "요약" });
    };
    const result = await readMailForChat("room", "메일".repeat(500), request as typeof fetch);
    expect(prompt.length).toBeLessThanOrEqual(12000);
    expect(result.count).toBe(20); expect(result.answer).toContain("요약");
  });
  it("does not search when disconnected", async () => {
    const f = fixture({ connected: false });
    await expect(readMailForChat("room", "메일", f.request)).rejects.toThrow("Gmail 연결이 필요");
    expect(f.actions).toEqual([]);
  });
  it("does not invent a report when Gmail rejects the read", async () => {
    const f = fixture({ failRead: true });
    await expect(readMailForChat("room", "메일", f.request)).rejects.toThrow("권한 오류");
    expect(f.actions).not.toContain("summary");
  });
  it("retains real subjects if AI summary fails", async () => {
    const f = fixture({ failAI: true }); const result = await readMailForChat("room", "메일", f.request);
    expect(result.answer).toContain("요약을 생성하지 못해");
    expect(result.answer).toContain("Invoice"); expect(result.count).toBe(1);
  });
});
