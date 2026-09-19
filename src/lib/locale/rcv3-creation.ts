const messages = {
  secretaryEmail: { en: "Email account for your secretary", ko: "비서가 사용할 본인 이메일 계정" },
  secretaryPhone: { en: "Phone number for incoming calls", ko: "비서가 전화를 받을 번호" },
  secretarySetup: { en: "Enter your own email and phone number, including the country code. After room activation, connect the email account and verify the phone service. Entering these details does not connect them yet.", ko: "본인 이메일과 국가번호를 포함한 전화번호를 입력하세요. 방 활성화 후 이메일 계정 연결과 전화 서비스 확인이 필요합니다. 입력만으로 연결되지는 않습니다." },
  secretaryRequired: { en: "Enter a valid email and an international phone number starting with + before continuing.", ko: "다음 단계 전에 올바른 이메일과 +로 시작하는 국제 전화번호를 입력해 주세요." },
  secretaryPending: { en: "Secretary setup · connection verification pending", ko: "비서 설정 · 연결 확인 대기" },
  paymentSetup: { en: "Payments are not connected to this room yet. Your saved design is kept in My Drafts.", ko: "이 방의 결제 연결이 아직 준비되지 않았습니다. 저장한 설계는 My Drafts에 보관됩니다." },
  limit: { en: "Draft storage is full. Your changes remain on this screen.", ko: "초안 저장 공간이 가득 찼습니다. 변경 내용은 이 화면에 남아 있습니다." },
  draft: { en: "Your design is saved to your account. No payment has been taken.", ko: "설계가 계정에 저장되었습니다. 결제는 이루어지지 않았습니다." },
  payment: { en: "Paid activation is not available yet. Save your draft and return when pricing and payment are ready.", ko: "유료 활성화는 아직 준비되지 않았습니다. 초안을 저장하고 요금과 결제 준비 후 이어서 진행할 수 있습니다." },
  error: { en: "Could not save. Your changes remain on this screen. Retry before closing.", ko: "저장하지 못했습니다. 변경 내용은 이 화면에 남아 있습니다. 닫기 전에 다시 저장해 주세요." },
  conflict: { en: "A newer draft was saved elsewhere. Your changes are preserved here. Reload drafts or save these changes as a new draft.", ko: "다른 곳에서 새 초안이 저장되었습니다. 현재 변경 내용은 유지됩니다. 초안을 다시 불러오거나 새 초안으로 저장하세요." },
  requested: { en: "These are requested services, not connected or paid services.", ko: "선택한 서비스는 요청 사항이며, 연결 또는 결제 완료를 의미하지 않습니다." },
  free: { en: "Keep paid options in your draft. A free room must not activate paid AI or secretary services.", ko: "유료 옵션은 초안에 보관합니다. 무료방에서 유료 AI나 비서 서비스를 자동 활성화하지 않습니다." },
  required: { en: "Enter a room name and select your purpose before continuing.", ko: "다음 단계 전에 방 이름과 용도를 입력해 주세요." },
} as const;
export type CreationMessage = keyof typeof messages;
export function creationText(key: CreationMessage, locale: string) {
  const text = messages[key];
  const lang = locale.toLowerCase().split(/[-_]/)[0];
  return lang === "ko" ? `${text.en} ${text.ko}` : text.en;
}
