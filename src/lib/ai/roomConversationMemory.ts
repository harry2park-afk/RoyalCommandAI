import type { AIMessage } from "./types";

export const MAX_ROOM_HISTORY_MESSAGES = 12;
export const MAX_ROOM_HISTORY_CHARS = 12_000;

type PersistedRoomMessage = {
  author_type?: unknown;
  content?: unknown;
};

function toRole(authorType: unknown): AIMessage["role"] | null {
  if (authorType === "user") return "user";
  if (authorType === "ai" || authorType === "professional") return "assistant";
  if (authorType === "system") return "system";
  return null;
}

export function normalizeRoomHistory(rows: PersistedRoomMessage[]): AIMessage[] {
  let remaining = MAX_ROOM_HISTORY_CHARS;
  const boundedNewestFirst: AIMessage[] = [];

  for (const row of rows) {
    if (boundedNewestFirst.length >= MAX_ROOM_HISTORY_MESSAGES || remaining <= 0) break;
    const role = toRole(row.author_type);
    const content = typeof row.content === "string" ? row.content.trim() : "";
    if (!role || !content) continue;

    const clipped = content.length > remaining ? content.slice(content.length - remaining) : content;
    remaining -= clipped.length;
    boundedNewestFirst.push({ role, content: clipped });
  }

  return boundedNewestFirst.reverse();
}

export function boundClientHistory(history?: AIMessage[]): AIMessage[] {
  if (!history?.length) return [];

  let remaining = MAX_ROOM_HISTORY_CHARS;
  const boundedNewestFirst: AIMessage[] = [];

  for (let index = history.length - 1; index >= 0 && boundedNewestFirst.length < MAX_ROOM_HISTORY_MESSAGES; index -= 1) {
    const item = history[index];
    if (!item || !["user", "assistant", "system"].includes(item.role)) continue;
    const content = item.content.trim();
    if (!content || remaining <= 0) continue;

    const clipped = content.length > remaining ? content.slice(content.length - remaining) : content;
    remaining -= clipped.length;
    boundedNewestFirst.push({ role: item.role, content: clipped });
  }

  return boundedNewestFirst.reverse();
}
