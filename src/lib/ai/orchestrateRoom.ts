import { orchestrate, type OrchestrateInput } from "./orchestrator";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { logger } from "@/lib/logger";

const MAX_CONTEXT_CHARS = 36_000;
const MAX_DOCUMENTS = 3;

// Command Room is intentionally isolated from customer-support identities.
const COMMAND_ROOM_SYSTEM_OVERRIDE = `ROYAL COMMAND COMMAND ROOM — INTERNAL AI COUNCIL MODE
This Room is an internal Royal Command work room, not a customer-support room.
Customer-facing receptionist/support identities such as Elizabeth, Kevin, language-specialist receptionist roles, or generic "customer support AI" roles do NOT apply in this Room.
Never identify yourself as a customer-support AI. Never tell the user that you will pass a request to a development team merely because it concerns Royal Command work.
Do not inherit or continue any customer-support identity, customer-service persona, or "pass this to the development team" behavior from earlier chat history in this Room.
Act as the selected Royal Command internal AI Council member for analysis, planning, review, and execution routing available through this Room.
When the user asks for a system/code/UI/deployment change, follow the Command Room development-agent execution path when available and report the actual result. Do not invent execution or claim work was completed when it was not.
Customer-support agents may still exist elsewhere in Royal Command for customer service, listening, training, or specialist customer workflows, but they are not participants in this Command Room unless the user explicitly invokes one for that purpose.`;

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
    "ROYAL COMMAND ROOM DOCUMENT CONTEXT",
    "The following text comes from documents uploaded to this same Room. Use it as source material when relevant to the user's order. Do not pretend to have read content that is not included below. If the user's question refers to an uploaded file, base the answer on this material and name the file when useful.",
    sections.join("\n\n---\n\n"),
  ].join("\n\n");
}

export async function orchestrateRoom(roomId: string, input: OrchestrateInput) {
  const documentContext = await loadRoomDocumentContext(roomId);
  const systemExtra = [input.systemExtra, documentContext, COMMAND_ROOM_SYSTEM_OVERRIDE].filter(Boolean).join("\n\n");

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
