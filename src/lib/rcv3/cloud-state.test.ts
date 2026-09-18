import { describe, it, expect } from "vitest";
import { evolveState, stateSchema, type CloudState } from "./cloud-state";
const id = "11111111-1111-4111-8111-111111111111";
const original: CloudState = { release: "rcv3-1", name: "RCV3", revision: 1, design: { backgroundAssetId: null, buttons: [{ id, capability: "chat", label: "대화", x: 5, y: 5, width: 20, height: 10, opacity: 1 }] }, appearances: {}, bindings: { [id]: "chat" } };
describe("RCV3 immutable cloud design", () => {
  it("allows appearance changes without changing identity", () => {
    const next = structuredClone(original); next.revision = 2; next.design.buttons[0].label = "내 AI"; next.design.buttons[0].x = 30;
    expect(evolveState(original, next, 1).bindings[id]).toBe("chat");
  });
  it("retains lifetime binding after removal", () => {
    const removed = structuredClone(original); removed.revision = 2; removed.design.buttons = [];
    const saved = evolveState(original, removed, 1);
    const replacement = structuredClone(original); replacement.revision = 3; replacement.bindings[id] = "secretary"; replacement.design.buttons[0].capability = "secretary";
    expect(() => evolveState(saved, replacement, 2)).toThrow("RCV3_CAPABILITY_LOCKED");
    delete removed.bindings[id]; expect(() => evolveState(original, removed, 1)).toThrow("RCV3_CAPABILITY_LOCKED");
  });
  it("rejects stale writes and injected runtime configuration", () => {
    expect(() => evolveState(original, { ...original, revision: 2 }, 0)).toThrow("RCV3_CONFLICT");
    expect(stateSchema.safeParse({ ...original, endpoint: "https://attacker.invalid" }).success).toBe(false);
    expect(stateSchema.safeParse({ ...original, appearances: { [id]: { background: "url(javascript:alert(1))" } } }).success).toBe(false);
  });
});
