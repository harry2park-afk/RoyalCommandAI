export function speakerNotice(state: string, locale: string) {
  const messages: Record<string, [string, string]> = {
    preparing: ["Preparing audio…", "음성을 준비하고 있습니다…"],
    reading: ["Reading…", "읽고 있습니다…"],
    error: ["Audio could not play. Select Retry audio.", "음성을 재생하지 못했습니다. Retry audio를 눌러 주세요."],
  };
  const message = messages[state];
  if (!message) return "";
  return locale.split("-")[0] === "ko" ? `${message[0]} · ${message[1]}` : message[0];
}
