import { describe, expect, it } from "vitest";
import {
  MAX_ROOM_HISTORY_CHARS,
  MAX_ROOM_HISTORY_MESSAGES,
  boundClientHistory,
  normalizeRoomHistory,
} from "./roomConversationMemory";

describe("roomConversationMemory", () => {
  it("converts newest-first persisted Room messages to chronological provider history", () => {
    const history = normalizeRoomHistory([
      { author_type: "ai", content: "Hello Harry" },
      { author_type: "user", content: "My name is Harry" },
    ]);

    expect(history).toEqual([
      { role: "user", content: "My name is Harry" },
      { role: "assistant", content: "Hello Harry" },
    ]);
  });

  it("ignores unsupported or empty persisted messages", () => {
    const history = normalizeRoomHistory([
      { author_type: "unknown", content: "ignore" },
      { author_type: "user", content: "   " },
      { author_type: "system", content: "Room rule" },
    ]);

    expect(history).toEqual([{ role: "system", content: "Room rule" }]);
  });

  it("bounds client fallback history by message count and characters", () => {
    const history = Array.from({ length: MAX_ROOM_HISTORY_MESSAGES + 5 }, (_, index) => ({
      role: index % 2 === 0 ? "user" as const : "assistant" as const,
      content: `${index}-`.padEnd(Math.ceil(MAX_ROOM_HISTORY_CHARS / MAX_ROOM_HISTORY_MESSAGES), "x"),
    }));

    const bounded = boundClientHistory(history);
    expect(bounded.length).toBeLessThanOrEqual(MAX_ROOM_HISTORY_MESSAGES);
    expect(bounded.reduce((total, item) => total + item.content.length, 0)).toBeLessThanOrEqual(MAX_ROOM_HISTORY_CHARS);
    expect(bounded.at(-1)?.content.startsWith(`${history.length - 1}-`)).toBe(true);
  });
});
