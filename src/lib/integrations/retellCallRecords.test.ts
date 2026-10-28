import { describe, expect, it } from "vitest";
import { configuredIncomingRoom, mergeCallRecords } from "./retellCallRecords";
describe("incoming call records", () => {
  const room = "89fe50fc-12bf-4fa0-8da8-aff065bae960";
  const env = { RETELL_INBOUND_ROOM_ID: room, RETELL_OWNER_REPORT_INBOUND_AGENT_ID: "agent-test", RETELL_OWNER_REPORT_FROM: "+61200000000" };
  const call = { direction: "inbound", call_type: "phone_call", agent_id: "agent-test", to_number: "+61200000000" };
  it("binds only the configured incoming agent and number, without enabling outbound calls", () => {
    expect(configuredIncomingRoom(call, env)).toBe(room);
    for (const patch of [{ direction: "outbound" }, { agent_id: "other" }, { to_number: "+61299999999" }, { call_type: "web_call" }]) expect(configuredIncomingRoom({ ...call, ...patch }, env)).toBeNull();
    expect(configuredIncomingRoom(call, {})).toBeNull();
  });
  it("preserves newer analysis and recording when an older ended event contains nulls", () => {
    const rows = [
      { id: "new", created_at: "2026-09-16", payload: { call_id: "call1", summary: "Customer request", recording_url: "https://example.com/audio.wav" } },
      { id: "old", created_at: "2026-09-15", payload: { call_id: "call1", summary: null, recording_url: null, transcript: "Customer: hello\nAgent: hello" } },
    ];
    const result = mergeCallRecords(rows);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "new", summary: "Customer request", recording_url: "https://example.com/audio.wav", transcript: "Customer: hello\nAgent: hello" });
  });
  it("keeps different calls separate", () => {
    expect(mergeCallRecords([{ id: "1", created_at: "now", payload: { call_id: "a" } }, { id: "2", created_at: "before", payload: { call_id: "b" } }])).toHaveLength(2);
  });
});
