import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { localDb } from "@/lib/local-store";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await request.formData();
    const roomId = String(form.get("roomId") || "");
    const file = form.get("file");

    if (!roomId || !(file instanceof File)) {
      return NextResponse.json(
        { error: "roomId and file are required" },
        { status: 400 },
      );
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 15MB in MVP)" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const doc = localDb.addDocument({
      roomId,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
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
    });

    return NextResponse.json({
      document: {
        id: doc.id,
        roomId: doc.roomId,
        filename: doc.filename,
        mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes,
        createdAt: doc.createdAt,
      },
    });
  } catch (error) {
    logger.error("documents.upload.failed", {
      error: error instanceof Error ? error.message : error,
    });
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
