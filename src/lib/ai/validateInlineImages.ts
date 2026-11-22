import { isImageMimeType, MAX_INLINE_IMAGE_BYTES, MAX_INLINE_IMAGES, type InlineImage, type ImageMimeType } from "./inlineImages";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
function matchesFormat(bytes: Buffer, mime: ImageMimeType): boolean {
  if (mime === "image/png") return bytes.length >= 24 && bytes.subarray(0, 8).equals(PNG_SIGNATURE) && bytes.toString("ascii", 12, 16) === "IHDR";
  return bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
}

export function validateInlineImages(value: unknown): { images: InlineImage[] } | { error: "IMAGE_INVALID" | "IMAGE_LIMIT"; status: 400 | 413 } {
  if (value === undefined) return { images: [] };
  if (!Array.isArray(value)) return { error: "IMAGE_INVALID", status: 400 };
  if (value.length > MAX_INLINE_IMAGES) return { error: "IMAGE_LIMIT", status: 413 };
  let bytesTotal = 0;
  const images: InlineImage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || !isImageMimeType(item.mime) || typeof item.base64 !== "string") return { error: "IMAGE_INVALID", status: 400 };
    const { mime, base64 } = item;
    if (base64.length > Math.ceil(MAX_INLINE_IMAGE_BYTES / 3) * 4) return { error: "IMAGE_LIMIT", status: 413 };
    if (!base64 || base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return { error: "IMAGE_INVALID", status: 400 };
    const bytes = Buffer.from(base64, "base64");
    bytesTotal += bytes.length;
    if (bytesTotal > MAX_INLINE_IMAGE_BYTES) return { error: "IMAGE_LIMIT", status: 413 };
    if (!matchesFormat(bytes, mime) || bytes.toString("base64") !== base64) return { error: "IMAGE_INVALID", status: 400 };
    images.push({ mime, base64 });
  }
  return { images };
}
