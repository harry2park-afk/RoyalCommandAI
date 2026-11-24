import type { AIRequest } from "./types";

export const IMAGE_MIME_TYPES = ["image/png", "image/jpeg"] as const;
export type ImageMimeType = typeof IMAGE_MIME_TYPES[number];
export type InlineImage = { mime: ImageMimeType; base64: string };
export const MAX_INLINE_IMAGES = 4;
export const MAX_INLINE_IMAGE_BYTES = 2 * 1024 * 1024;

export function isImageMimeType(value: unknown): value is ImageMimeType {
  return IMAGE_MIME_TYPES.some((mime) => value === mime);
}

export function imageDataUrl(image: InlineImage): string {
  return `data:${image.mime};base64,${image.base64}`;
}

// These mappings are used only for the final user turn; old history stays text.
export function chatMessages(request: AIRequest) {
  return request.messages.map((message, index) =>
    request.images?.length && message.role === "user" && index === request.messages.length - 1
      ? { role: message.role, content: [
        { type: "text", text: message.content },
        ...request.images.map((image) => ({ type: "image_url", image_url: { url: imageDataUrl(image) } })),
      ] }
      : message);
}

export function responsesMessages(request: AIRequest) {
  return request.messages.map((message, index) =>
    request.images?.length && message.role === "user" && index === request.messages.length - 1
      ? { role: message.role, content: [
        { type: "input_text", text: message.content },
        ...request.images.map((image) => ({ type: "input_image", image_url: imageDataUrl(image), detail: "auto" })),
      ] }
      : message);
}
