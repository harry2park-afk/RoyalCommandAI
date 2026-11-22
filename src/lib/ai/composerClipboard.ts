import { isImageMimeType, MAX_INLINE_IMAGE_BYTES, MAX_INLINE_IMAGES, type InlineImage } from "./inlineImages";

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
  if (next.length > MAX_INLINE_IMAGES || next.reduce((bytes, file) => bytes + file.size, 0) > MAX_INLINE_IMAGE_BYTES) {
    return { error: "IMAGE_LIMIT" } as const;
  }
  return { files: next };
}

export async function encodeComposerImages(files: readonly File[]): Promise<InlineImage[]> {
  return Promise.all(files.map((file) => new Promise<InlineImage>((resolve, reject) => {
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
