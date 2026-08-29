import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { extractDocumentText } from "@/lib/documents/extractText";
import { localDb } from "@/lib/local-store";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

const STORAGE_BUCKET = "matter-documents";
const MAX_EXTRACTED_TEXT = 60_000;
const DESTINATIONS = new Set(["inbox", "personal", "case", "evidence", "lawyer_share"]);

function safeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-160) || "upload.bin";
}

function storageContentType(mimeType: string) {
  return mimeType.split(";")[0]?.trim() || "application/octet-stream";
}

function cleanOptional(value: FormDataEntryValue | null, max: number) {
  const text = String(value || "").trim();
  return text ? text.slice(0, max) : null;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await request.formData();
    const roomId = String(form.get("roomId") || "").trim();
    const file = form.get("file");
    const requestedDestination = String(form.get("destinationType") || "inbox");
    const destinationType = DESTINATIONS.has(requestedDestination) ? requestedDestination : "inbox";
    const caseId = cleanOptional(form.get("caseId"), 80);
    const projectKey = cleanOptional(form.get("projectKey"), 160);
    const folderName = cleanOptional(form.get("folderName"), 240);
    const displayTitle = cleanOptional(form.get("displayTitle"), 240);
    const purpose = cleanOptional(form.get("purpose"), 240);

    if (!roomId || !(file instanceof File)) {
      return NextResponse.json({ error: "roomId and file are required" }, { status: 400 });
    }

    const caseDestination = destinationType === "case" || destinationType === "evidence" || destinationType === "lawyer_share";
    if (caseDestination && !caseId) {
      return NextResponse.json({ error: "caseId is required for this destination" }, { status: 400 });
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 15MB in MVP)" }, { status: 400 });
    }

    const mimeType = file.type || "application/octet-stream";
    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = "";
    let extractionError = "";

    try {
      extractedText = extractDocumentText(buffer, file.name, mimeType).slice(0, MAX_EXTRACTED_TEXT);
    } catch (error) {
      extractionError = error instanceof Error ? error.message : "text extraction failed";
      logger.warn("documents.extract.failed", { roomId, filename: file.name, error: extractionError });
    }

    if (isSupabaseConfigured()) {
      const supabase = await createClient();

      const { data: room } = await supabase
        .from("rooms")
        .select("id")
        .eq("id", roomId)
        .eq("room_owner_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

      if (caseId) {
        const { data: legalCase } = await supabase
          .from("legal_cases")
          .select("id")
          .eq("id", caseId)
          .eq("room_id", roomId)
          .eq("owner_id", user.id)
          .maybeSingle();
        if (!legalCase) return NextResponse.json({ error: "Case file not found" }, { status: 400 });
      }

      const objectName = `${user.id}/${roomId}/${randomUUID()}-${safeFilename(file.name)}`;
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(objectName, buffer, {
          contentType: storageContentType(mimeType),
          upsert: false,
        });
      if (storageError) throw new Error(`Storage upload failed: ${storageError.message}`);

      const { data: doc, error: insertError } = await supabase
        .from("documents")
        .insert({
          room_id: roomId,
          uploaded_by: user.id,
          filename: file.name,
          mime_type: mimeType,
          size_bytes: file.size,
          storage_path: objectName,
          is_original: true,
          metadata: {
            extracted_text: extractedText,
            extracted_chars: extractedText.length,
            extraction_status: extractedText ? "ready" : extractionError ? "failed" : "unsupported",
            extraction_error: extractionError || undefined,
          },
        })
        .select("id, room_id, filename, mime_type, size_bytes, storage_path, metadata, created_at")
        .single();

      if (insertError) {
        await supabase.storage.from(STORAGE_BUCKET).remove([objectName]);
        throw new Error(`Document record failed: ${insertError.message}`);
      }

      const { error: destinationError } = await supabase
        .from("rc_file_destinations")
        .insert({
          document_id: doc.id,
          owner_id: user.id,
          room_id: roomId,
          destination_type: destinationType,
          case_id: caseDestination ? caseId : null,
          project_key: projectKey,
          folder_name: folderName,
          display_title: displayTitle || file.name,
          purpose,
          sort_order: 0,
          updated_at: new Date().toISOString(),
        });

      if (destinationError) {
        await supabase.from("documents").delete().eq("id", doc.id).eq("uploaded_by", user.id);
        await supabase.storage.from(STORAGE_BUCKET).remove([objectName]);
        throw new Error(`File destination failed: ${destinationError.message}`);
      }

      await supabase.from("messages").insert({
        room_id: roomId,
        author_type: "system",
        content: `Document uploaded: ${file.name} (${file.size} bytes).${extractedText ? " Text ready for AI context." : " Original preserved."}`,
        language: user.defaultLanguage,
      });

      logger.info("documents.upload", {
        roomId,
        filename: file.name,
        size: file.size,
        userId: user.id,
        persistent: true,
        extractedChars: extractedText.length,
        destinationType,
        caseId: caseDestination ? caseId : null,
        projectKey,
        folderName,
        purpose,
      });

      return NextResponse.json({
        document: {
          id: doc.id,
          roomId: doc.room_id,
          filename: doc.filename,
          mimeType: doc.mime_type,
          sizeBytes: doc.size_bytes,
          createdAt: doc.created_at,
          aiReadable: extractedText.length > 0,
          extractedChars: extractedText.length,
          destinationType,
          caseId: caseDestination ? caseId : null,
          projectKey,
          folderName,
          displayTitle: displayTitle || file.name,
          purpose,
        },
      });
    }

    const doc = localDb.addDocument({
      roomId,
      filename: file.name,
      mimeType,
      sizeBytes: file.size,
      contentBase64: buffer.toString("base64"),
    });

    localDb.addMessage({
      roomId,
      authorType: "system",
      content: `Document uploaded: ${file.name} (${file.size} bytes). Original preserved.`,
    });

    logger.info("documents.upload", {
      roomId,
      filename: file.name,
      size: file.size,
      userId: user.id,
      persistent: false,
      extractedChars: extractedText.length,
      destinationType,
      projectKey,
      folderName,
      purpose,
    });

    return NextResponse.json({
      document: {
        id: doc.id,
        roomId: doc.roomId,
        filename: doc.filename,
        mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes,
        createdAt: doc.createdAt,
        aiReadable: extractedText.length > 0,
        extractedChars: extractedText.length,
        destinationType,
        projectKey,
        folderName,
        displayTitle: displayTitle || file.name,
        purpose,
      },
    });
  } catch (error) {
    logger.error("documents.upload.failed", { error: error instanceof Error ? error.message : error });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 });
  }
}
