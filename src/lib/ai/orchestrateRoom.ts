import { randomUUID } from "node:crypto";
import { orchestrate, type OrchestrateInput, type OrchestrateResult } from "./orchestrator";
import { boundClientHistory, normalizeRoomHistory, MAX_ROOM_HISTORY_MESSAGES } from "./roomConversationMemory";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { logger } from "@/lib/logger";

const MAX_CONTEXT_CHARS = 36_000;
const MAX_DOCUMENTS = 3;
const WORK_CACHE_TTL_MS = 120_000;
const ROOM_CONTEXT_CACHE_TTL_MS = 2_000;

export interface RoomWorkRecord {
  workId: string;
  revision: number;
  roomId: string;
  createdAt: string;
  title?: string;
  parentRevision?: number;
}

export type OrchestrateRoomResult = OrchestrateResult & {
  workId?: string;
  revision?: number;
  workRecord?: RoomWorkRecord;
  comparison: OrchestrateResult["comparison"] & {
    work?: RoomWorkRecord;
  };
};

type CachedWork = {
  work: RoomWorkRecord;
  expiresAt: number;
};

type RoomContext = {
  documentContext: string;
  history: NonNullable<OrchestrateInput["history"]>;
};

type CachedRoomContext = {
  context: Promise<RoomContext>;
  expiresAt: number;
};

const workCache = new Map<string, CachedWork>();
const roomContextCache = new Map<string, CachedRoomContext>();

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function workCacheKey(roomId: string, prompt: string) {
  return `${roomId}\n${prompt}`;
}

function roomContextCacheKey(roomId: string, input: OrchestrateInput) {
  return `${roomId}\n${input.prompt}\n${JSON.stringify(boundClientHistory(input.history))}`;
}

function titleFromPrompt(prompt: string) {
  const cleaned = prompt
    .replace(/^\s*\d+-Time\s+\d{2}\.\d{2}\.\d{4}\s*\/\s*\d{6}\s*\/[^\n]*\n*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 120) || "Royal Command work";
}

function latestWorkFromHistory(history: OrchestrateInput["history"]): { workId: string; revision: number } | null {
  if (!history?.length) return null;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const content = history[index]?.content || "";
    const match = content.match(/\*\*Work ID:\*\*\s*(RC-[A-Z0-9-]+)\s*\|\s*\*\*Revision:\*\*\s*(\d+)/i)
      || content.match(/Work ID:\s*(RC-[A-Z0-9-]+)[\s\S]{0,80}?Revision:\s*(\d+)/i);
    if (match) return { workId: match[1].toUpperCase(), revision: Math.max(1, Number(match[2] || 1)) };
  }
  return null;
}

function explicitWorkFromPrompt(prompt: string): { workId: string; revision?: number } | null {
  const work = prompt.match(/\b(RC-\d{8}(?:-[A-Z0-9]+)+)\b/i);
  if (!work) return null;
  const revision = prompt.match(/\b(?:REV(?:ISION)?\s*[-:#]?\s*)(\d+)\b/i);
  return { workId: work[1].toUpperCase(), revision: revision ? Math.max(1, Number(revision[1])) : undefined };
}

function isContinuationPrompt(prompt: string) {
  return /((이|그|위|방금|이전|같은)\s*(작업|오더|수정|내용|건)|이어(?:서|가기|서서)?|계속|다음\s*ai|다음\s*에이아이|검토|점검|리뷰|review|revision|rev\b|수정한\s*것|고친\s*것)/i.test(prompt);
}

function createWorkMetadata(roomId: string, prompt: string, history: OrchestrateInput["history"]): RoomWorkRecord {
  const cacheKey = workCacheKey(roomId, prompt);
  const now = Date.now();
  const cached = workCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.work;
  if (cached) workCache.delete(cacheKey);

  const createdAt = new Date(now).toISOString();
  const stampedOrder = prompt.match(/^\s*\d+-Time\s+(\d{2})\.(\d{2})\.(\d{4})\s*\/\s*(\d{6})\s*\//i);
  const explicitWork = explicitWorkFromPrompt(prompt);
  const previousWork = latestWorkFromHistory(history);
  const continuing = Boolean(explicitWork || (previousWork && isContinuationPrompt(prompt)));

  let workId: string;
  let revision = 1;
  let parentRevision: number | undefined;

  if (explicitWork) {
    workId = explicitWork.workId;
    const previousRevision = previousWork?.workId === workId ? previousWork.revision : (explicitWork.revision || 1);
    parentRevision = previousRevision;
    revision = previousRevision + 1;
  } else if (continuing && previousWork) {
    workId = previousWork.workId;
    parentRevision = previousWork.revision;
    revision = previousWork.revision + 1;
  } else if (stampedOrder) {
    const [, day, month, year, time] = stampedOrder;
    const roomPart = roomId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase() || "ROOM";
    workId = `RC-${year}${month}${day}-${time}-${roomPart}`;
  } else {
    const datePart = createdAt.slice(0, 10).replace(/-/g, "");
    workId = `RC-${datePart}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  const work: RoomWorkRecord = {
    workId,
    revision,
    roomId,
    createdAt,
    title: titleFromPrompt(prompt),
    ...(parentRevision ? { parentRevision } : {}),
  };

  workCache.set(cacheKey, { work, expiresAt: now + WORK_CACHE_TTL_MS });
  return work;
}

function workSystemContext(work: RoomWorkRecord) {
  return [
    "ROYAL COMMAND CURRENT ORDER WORK METADATA — HOST VERIFIED — AUTHORITATIVE",
    `Work ID: ${work.workId}`,
    `Revision: ${work.revision}`,
    work.parentRevision ? `Parent Revision: ${work.parentRevision}` : "Parent Revision: none",
    `Title: ${work.title || "Royal Command work"}`,
    `Room ID: ${work.roomId}`,
    `Created At: ${work.createdAt}`,
    "This one metadata record is shared by every AI handling the same current order.",
    "For this current order, ignore every older Work ID, Revision, Created At, or work-record value that appears in conversation history or prior assistant messages unless it is the parent revision explicitly referenced above.",
    "If the user asks for Work ID, Revision, creation time, Room ID, or work-record information, report exactly the host-verified values above. Do not invent, reuse, infer, or substitute another Work ID.",
  ].join("\n");
}

async function loadRoomDocumentContext(roomId: string) {
  if (!isSupabaseConfigured()) return "";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("filename, mime_type, metadata, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(MAX_DOCUMENTS);

  if (error) {
    logger.warn("ai.room_documents.load_failed", { roomId, error: error.message });
    return "";
  }

  let remaining = MAX_CONTEXT_CHARS;
  const sections: string[] = [];

  for (const doc of data || []) {
    const metadata = (doc.metadata && typeof doc.metadata === "object")
      ? doc.metadata as Record<string, unknown>
      : {};
    const extracted = cleanText(metadata.extracted_text);
    if (!extracted || remaining <= 0) continue;

    const text = extracted.slice(0, remaining);
    remaining -= text.length;
    sections.push(`DOCUMENT: ${doc.filename}\nMIME: ${doc.mime_type || "unknown"}\nCONTENT:\n${text}`);
  }

  if (!sections.length) return "";

  return [
    "ROOM DOCUMENT CONTEXT",
    "The following text comes from documents uploaded to this same Room. Use it as source material when relevant to the user's order. Do not pretend to have read content that is not included below.",
    sections.join("\n\n---\n\n"),
  ].join("\n\n");
}

async function loadRoomConversationHistory(roomId: string, fallbackHistory: OrchestrateInput["history"]) {
  if (!isSupabaseConfigured()) return boundClientHistory(fallbackHistory);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("author_type, content, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(MAX_ROOM_HISTORY_MESSAGES);

  if (error) {
    logger.warn("ai.room_memory.load_failed", { roomId, error: error.message });
    return boundClientHistory(fallbackHistory);
  }

  const history = normalizeRoomHistory(data || []);
  return history.length ? history : boundClientHistory(fallbackHistory);
}

async function loadRoomContext(roomId: string, input: OrchestrateInput): Promise<RoomContext> {
  const key = roomContextCacheKey(roomId, input);
  const now = Date.now();
  const cached = roomContextCache.get(key);
  if (cached && cached.expiresAt > now) return cached.context;
  if (cached) roomContextCache.delete(key);

  if (roomContextCache.size > 100) {
    for (const [entryKey, entry] of roomContextCache) {
      if (entry.expiresAt <= now) roomContextCache.delete(entryKey);
    }
  }

  const context = Promise.all([
    loadRoomDocumentContext(roomId),
    loadRoomConversationHistory(roomId, input.history),
  ])
    .then(([documentContext, history]) => ({ documentContext, history }))
    .catch((error) => {
      roomContextCache.delete(key);
      throw error;
    });

  roomContextCache.set(key, {
    context,
    expiresAt: now + ROOM_CONTEXT_CACHE_TTL_MS,
  });

  return context;
}

export async function orchestrateRoom(roomId: string, input: OrchestrateInput): Promise<OrchestrateRoomResult> {
  const { documentContext, history } = await loadRoomContext(roomId, input);
  const work = createWorkMetadata(roomId, input.prompt, history);
  const systemExtra = [workSystemContext(work), input.systemExtra, documentContext]
    .filter(Boolean)
    .join("\n\n");

  logger.info("ai.room_context.loaded", {
    roomId,
    workId: work.workId,
    revision: work.revision,
    parentRevision: work.parentRevision,
    documentIncluded: Boolean(documentContext),
    documentChars: documentContext.length,
    historyMessages: history.length,
  });

  const result = await orchestrate({
    ...input,
    history,
    systemExtra: systemExtra || undefined,
  });

  const workHeader = `**Work ID:** ${work.workId} | **Revision:** ${work.revision}`;

  logger.info("ai.room_work.completed", {
    ...work,
    providers: result.providers,
    blocked: result.blocked,
    latencyMs: result.latencyMs,
  });

  return {
    ...result,
    workId: work.workId,
    revision: work.revision,
    workRecord: work,
    finalAnswer: `${workHeader}\n\n${result.finalAnswer}`,
    comparison: {
      ...result.comparison,
      work,
      notes: [
        ...result.comparison.notes,
        `Royal Command work record: ${work.workId}, Revision ${work.revision}${work.parentRevision ? `, Parent Revision ${work.parentRevision}` : ""}.`,
      ],
    },
  };
}
