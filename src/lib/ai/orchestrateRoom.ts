import { orchestrate, type OrchestrateInput } from "./orchestrator";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { logger } from "@/lib/logger";

const MAX_CONTEXT_CHARS = 36_000;
const MAX_DOCUMENTS = 3;

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

export async function orchestrateRoom(roomId: string, input: OrchestrateInput) {
  const documentContext = await loadRoomDocumentContext(roomId);
  const systemExtra = [input.systemExtra, documentContext].filter(Boolean).join("\n\n");

  logger.info("ai.room_documents.context", {
    roomId,
    included: Boolean(documentContext),
    chars: documentContext.length,
  });

  return orchestrate({
    ...input,
    systemExtra: systemExtra || undefined,
  });
}
