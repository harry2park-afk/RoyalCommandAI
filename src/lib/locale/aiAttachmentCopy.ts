const IMAGE_COPY = {
  IMAGE_INVALID: ["Use a PNG or JPG image.", "PNG 또는 JPG 사진을 넣어 주세요."],
  IMAGE_COUNT: ["You can attach up to 4 images. Remove one to add another.", "사진은 최대 4장까지 붙일 수 있습니다. 더 붙이려면 한 장을 지우세요."],
  IMAGE_SOURCE_LIMIT: ["The original image is too large. Capture a smaller area or remove another image.", "원본 용량이 너무 큽니다. 더 작은 영역을 캡처하거나 다른 사진을 지우세요."],
  IMAGE_LIMIT: ["The images are too large to send together. Send fewer at a time.", "한번에 보내기에는 사진 용량이 너무 큽니다. 나눠서 보내 주세요."],
  IMAGE_READ_FAILED: ["Could not read the image. Paste it again.", "사진을 읽지 못했습니다. 다시 붙여넣어 주세요."],
  IMAGE_UNSUPPORTED: ["This AI cannot receive images. Choose another AI.", "이 AI는 사진을 받을 수 없습니다. 다른 AI를 선택해 주세요."],
  IMAGE_PROVIDER_FAILED: ["The image could not be sent to this AI. You can retry.", "이 AI에 사진을 보낼 수 없었습니다. 다시 시도할 수 있습니다."],
  IMAGE_PARTIAL: ["Some AIs could not receive the image. Retry with those AIs only.", "일부 AI에 사진을 보낼 수 없었습니다. 실패한 AI만 선택해 다시 시도하세요."],
} as const;

export function attachmentText(code: string, language: string) {
  const copy = IMAGE_COPY[code as keyof typeof IMAGE_COPY] ?? IMAGE_COPY.IMAGE_PROVIDER_FAILED;
  return language === "ko" ? `${copy[0]} ${copy[1]}` : copy[0];
}
