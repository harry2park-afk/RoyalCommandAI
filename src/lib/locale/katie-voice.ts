const messages = {
  recovery: { en: "Live voice could not connect. Tap the microphone to retry with recorded voice; text appears after you pause.", ko: "실시간 음성에 연결하지 못했습니다. 마이크를 다시 누르면 일반 음성 입력으로 재시도하며, 말을 멈춘 뒤 글자가 나타납니다." },
  rooms: { en: "Other secretary rooms", ko: "다른 비서방" },
  start: { en: "Start voice conversation", ko: "음성 대화 시작" },
  stop: { en: "Stop voice conversation", ko: "음성 대화 종료" },
} as const;
export function katieVoiceText(key: keyof typeof messages, locale: string) {
  const text = messages[key];
  return locale.toLowerCase().split(/[-_]/)[0] === "ko" ? `${text.en} ${text.ko}` : text.en;
}
