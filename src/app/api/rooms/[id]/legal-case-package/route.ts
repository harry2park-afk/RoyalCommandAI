import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

const STORAGE_BUCKET = "matter-documents";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

function caseLabel(caseNumber: number | string | null, title: string) {
  const number = String(caseNumber ?? "").padStart(6, "0");
  return `CASE-${number} · ${title}`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const { id: roomId } = await context.params;
  const url = new URL(request.url);
  const caseId = url.searchParams.get("caseId") || "";
  const includeEvidence = url.searchParams.get("includeEvidence") !== "false";
  if (!caseId) return NextResponse.json({ error: "caseId is required" }, { status: 400 });

  const supabase = await createClient();
  const { data: room } = await supabase
    .from("rooms")
    .select("id")
    .eq("id", roomId)
    .eq("room_owner_id", user.id)
    .maybeSingle();
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const { data: manifest } = await supabase
    .from("room_factory_manifests")
    .select("template_id")
    .eq("room_id", roomId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (manifest?.template_id !== "legal") {
    return NextResponse.json({ error: "Not a legal Room" }, { status: 400 });
  }

  const { data: legalCase, error: caseError } = await supabase
    .from("legal_cases")
    .select("id, case_number, title, status, created_at, updated_at")
    .eq("id", caseId)
    .eq("room_id", roomId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (caseError) return NextResponse.json({ error: caseError.message }, { status: 500 });
  if (!legalCase) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const { data: records, error: recordError } = await supabase
    .from("legal_story_entries")
    .select("id, case_id, raw_transcript, ai_summary, audio_document_id, recorded_at, created_at, updated_at")
    .eq("room_id", roomId)
    .eq("owner_id", user.id)
    .eq("case_id", caseId)
    .order("recorded_at", { ascending: true });
  if (recordError) return NextResponse.json({ error: recordError.message }, { status: 500 });

  let evidence: Array<{
    id: string;
    title: string;
    event_date: string | null;
    description: string;
    document_id: string | null;
    created_at: string;
    updated_at: string;
  }> = [];

  if (includeEvidence) {
    const { data, error } = await supabase
      .from("legal_evidence_items")
      .select("id, title, event_date, description, document_id, created_at, updated_at")
      .eq("room_id", roomId)
      .eq("owner_id", user.id)
      .eq("case_id", caseId)
      .order("created_at", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    evidence = data || [];
  }

  const documentIds = Array.from(new Set([
    ...(records || []).map((item) => item.audio_document_id).filter(Boolean),
    ...evidence.map((item) => item.document_id).filter(Boolean),
  ])) as string[];

  let documents: Array<{
    id: string;
    filename: string;
    mime_type: string;
    size_bytes: number;
    storage_path: string;
    created_at: string;
    signed_url: string | null;
    signed_url_expires_at: string | null;
  }> = [];

  if (documentIds.length) {
    const { data, error } = await supabase
      .from("documents")
      .select("id, filename, mime_type, size_bytes, storage_path, created_at")
      .eq("room_id", roomId)
      .eq("uploaded_by", user.id)
      .in("id", documentIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString();
    documents = await Promise.all((data || []).map(async (document) => {
      const { data: signed, error: signedError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(document.storage_path, SIGNED_URL_TTL_SECONDS);

      return {
        ...document,
        signed_url: signedError ? null : signed?.signedUrl || null,
        signed_url_expires_at: signedError ? null : expiresAt,
      };
    }));
  }

  return NextResponse.json({
    package: {
      case: {
        ...legalCase,
        label: caseLabel(legalCase.case_number, legalCase.title),
      },
      includeEvidence,
      records: records || [],
      evidence,
      documents,
      counts: {
        records: records?.length || 0,
        evidence: evidence.length,
        documents: documents.length,
      },
      preparedAt: new Date().toISOString(),
      linkExpiresInSeconds: SIGNED_URL_TTL_SECONDS,
    },
  });
}
