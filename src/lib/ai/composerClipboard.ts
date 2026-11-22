import { isImageMimeType, MAX_INLINE_IMAGE_BYTES, MAX_INLINE_IMAGES, type InlineImage } from "./inlineImages";

const MAX_SOURCE_BYTES = 32 * 1024 * 1024;
const MAX_DRAFT_BYTES = 64 * 1024 * 1024;

export function clipboardFiles(clipboard: Pick<DataTransfer, "items" | "files">) {
  // Chromium can expose the same file in both items and files. Prefer the decoded items.
  const items = Array.from(clipboard.items ?? [])
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);
  return items.length ? items : Array.from(clipboard.files ?? []);
}

export function mergeComposerImages(current: readonly File[], incoming: readonly File[]) {
  const next = [...current];
  for (const file of incoming) {
    if (!isImageMimeType(file.type) || !file.size) return { error: "IMAGE_INVALID" } as const;
    // Clipboard screenshots may share the same default name, size and timestamp.
    // Never discard a distinct file merely because those fields match.
    if (!next.includes(file)) next.push(file);
  }
  if (next.length > MAX_INLINE_IMAGES) return { error: "IMAGE_COUNT" } as const;
  if (next.some((file) => file.size > MAX_SOURCE_BYTES) || next.reduce((bytes, file) => bytes + file.size, 0) > MAX_DRAFT_BYTES) {
    return { error: "IMAGE_SOURCE_LIMIT" } as const;
  }
  return { files: next };
}

async function fitScreenshot(file: File, budget: number): Promise<File> {
  if (file.size <= budget) return file;
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  try {
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("IMAGE_READ_FAILED");
    let scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 6; attempt += 1, scale *= 0.75) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.9, 0.78, 0.64]) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
        if (!blob || blob.type !== "image/jpeg") throw new Error("IMAGE_READ_FAILED");
        if (blob.size <= budget) return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: blob.type });
      }
    }
    throw new Error("IMAGE_LIMIT");
  } finally {
    bitmap.close();
    canvas.width = canvas.height = 0;
  }
}

export async function encodeComposerImages(files: readonly File[]): Promise<InlineImage[]> {
  if (!files.length) return [];
  let remaining = MAX_INLINE_IMAGE_BYTES;
  const prepared = new Map<File, File>();
  // Decode one large screenshot at a time. Reserve enough bandwidth for the
  // other attachments and preserve small files without re-encoding them.
  for (const file of [...files].sort((left, right) => left.size - right.size)) {
    const fitted = await fitScreenshot(file, Math.floor(remaining / (files.length - prepared.size)));
    remaining -= fitted.size;
    prepared.set(file, fitted);
  }
  // Small-to-large processing only allocates the budget; preserve paste order.
  return Promise.all(files.map((source) => new Promise<InlineImage>((resolve, reject) => {
    const file = prepared.get(source) ?? source;
    const mime = file.type;
    if (!isImageMimeType(mime)) { reject(new Error("IMAGE_INVALID")); return; }
    const reader = new FileReader();
    reader.onerror = reader.onabort = () => reject(new Error("IMAGE_READ_FAILED"));
    reader.onload = () => {
      const prefix = `data:${mime};base64,`;
      if (typeof reader.result !== "string" || !reader.result.startsWith(prefix)) { reject(new Error("IMAGE_READ_FAILED")); return; }
      resolve({ mime, base64: reader.result.slice(prefix.length) });
    };
    reader.readAsDataURL(file);
  })));
}
