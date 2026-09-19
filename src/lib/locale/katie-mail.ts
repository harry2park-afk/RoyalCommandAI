const messages = {
  enable: { en: "Use my Gmail in this room", ko: "이 방에 내 Gmail 연결" },
  GMAIL_ROOM_NOT_ENABLED: { en: "This new room has no Gmail connection. Choose to connect your own account.", ko: "새 방에는 Gmail이 연결되지 않았습니다. 본인 계정을 연결할 수 있습니다." },
  all: { en: "All received mail", ko: "받은 메일 전체" },
  refresh: { en: "Refresh all mail", ko: "전체 메일 새로고침" },
  review: { en: "Review all mail", ko: "전체 메일 검토" },
  reconnect: { en: "Reconnect Gmail", ko: "Gmail 다시 연결" },
  GMAIL_RECONNECT_REQUIRED: { en: "Gmail access has expired or is unavailable. Reconnect Gmail to read mail.", ko: "Gmail 인증이 만료되었거나 사용할 수 없습니다. 다시 연결해야 메일을 읽을 수 있습니다." },
  GMAIL_READ_FAILED: { en: "Mail could not be read. The review is incomplete. Retry after checking the connection.", ko: "메일을 읽지 못해 검토가 완료되지 않았습니다. 연결 상태를 확인한 뒤 다시 시도하세요." },
  GMAIL_PAGINATION_FAILED: { en: "Mail retrieval stopped before completion. Retry to retrieve the remaining mail.", ko: "전체 조회가 끝나기 전에 중단됐습니다. 다시 시도해야 나머지 메일을 확인할 수 있습니다." },
  loading: { en: "Loading received mail. The count is partial until completed.", ko: "받은 메일을 불러오는 중입니다. 완료 전 숫자는 일부 조회 건수입니다." },
  complete: { en: "All matching received messages loaded.", ko: "조회 대상인 받은 메일을 모두 불러왔습니다." },
  scope: { en: "Includes archived received mail. Excludes Sent, Drafts, Spam and Trash. Message bodies are reviewed on request; attachments are not automatically reviewed.", ko: "보관된 받은 메일도 포함합니다. 보낸편지·임시보관·스팸·휴지통은 제외합니다. 요청하면 메일 본문을 검토하며 첨부파일은 자동 검토하지 않습니다." },
  active: { en: "Mail loads when Katie opens. Keep this page open until retrieval finishes.", ko: "Katie를 열면 메일을 불러옵니다. 조회가 끝날 때까지 이 화면을 열어 두세요." },
  cancelled: { en: "Review cancelled. Results are incomplete.", ko: "검토가 중단됐습니다. 아래 결과는 일부입니다." },
  partial: { en: "Review in progress. Results below are partial.", ko: "검토 중입니다. 아래 결과는 아직 일부입니다." },
} as const;
export type KatieMailKey = keyof typeof messages;
export function katieMailText(key: KatieMailKey, locale: string) {
  const text = messages[key];
  return locale.toLowerCase().split(/[-_]/)[0] === "ko" ? `${text.en} ${text.ko}` : text.en;
}
export function katieMailError(code: string, locale: string) {
  return katieMailText(code === "GMAIL_RECONNECT_REQUIRED" || code === "GMAIL_PAGINATION_FAILED" || code === "GMAIL_ROOM_NOT_ENABLED" ? code : "GMAIL_READ_FAILED", locale);
}
