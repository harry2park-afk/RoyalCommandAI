export const creationMessages = {
  setupRequired: {en:"Choose your country and at least one AI before continuing.",ko:"계속하려면 국가와 AI를 하나 이상 선택하세요."},
  setupConnection: {en:"A selected connection needs attention. Return to AI & Tools and connect your own account or choose an available service. No payment has been taken.",ko:"선택한 연결을 확인해야 합니다. AI & Tools에서 본인 계정을 연결하거나 사용 가능한 서비스를 선택하세요. 결제되지 않았습니다."},
  countryUnavailable: {en:"Pricing and services are not ready for your country yet. Your form is saved; no payment has been taken.",ko:"선택한 국가의 요금과 서비스가 아직 준비되지 않았습니다. 폼은 저장되며 결제되지 않았습니다."},
  serviceNotReady: { en: "One of the selected services is not ready for activation. Your selections remain saved in this draft.", ko: "선택한 서비스 중 아직 활성화할 수 없는 항목이 있습니다. 선택 사항은 초안에 보관됩니다." },
  paymentFlow: { en: "Complete the form, review the monthly price and terms, then pay. Your room is created only after the server confirms payment.", ko: "폼 작성 후 월 요금과 약관을 확인하고 결제하세요. 서버가 결제를 확인한 뒤 방이 생성됩니다." },
  sandbox: { en: "Preview uses test payments only. No real subscription is purchased here.", ko: "현재 Preview는 시험 결제 전용입니다. 실제 유료 구독을 구매하지 않습니다." },
  monthlyTotal: { en: "Monthly total", ko: "매월 결제 금액" },
  taxIncluded: { en: "Tax included. Charges repeat monthly under the terms below.", ko: "세금 포함 금액이며 아래 약관에 따라 매월 결제됩니다." },
  termsTitle: { en: "RCA subscription terms", ko: "RCA 가입 및 구독 약관" },
  recurringConsent: { en: "I accept these terms and agree to the monthly recurring total shown above.", ko: "위 약관에 동의하며 표시된 총액의 매월 정기결제에 동의합니다." },
  signature: { en: "Your full name", ko: "동의하는 본인의 성명" },
  checkoutError: { en: "Payment could not be confirmed. Your draft is saved. Retry the payment check before starting again.", ko: "결제를 확인하지 못했습니다. 초안은 저장되어 있습니다. 새 결제 전에 결제 확인을 다시 시도해 주세요." },
  paymentPending: { en: "Payment confirmation is pending. You can check again without paying again.", ko: "결제 확인을 기다리고 있습니다. 다시 결제하지 않고 확인을 재시도할 수 있습니다." },
  roomReady: { en: "Payment verified. Your room is ready.", ko: "결제가 확인되어 방이 준비되었습니다." },
  orderLocked: { en: "This draft already has a checkout order. Return to its payment check. For a different room, create a new draft.", ko: "이 초안에는 이미 결제 주문이 있습니다. 기존 결제를 확인하세요. 다른 방은 새 초안으로 작성해 주세요." },
  secretaryEmail: { en: "Email account for your secretary", ko: "비서가 사용할 본인 이메일 계정" },
  secretaryPhone: { en: "Phone number for incoming calls", ko: "비서가 전화를 받을 번호" },
  secretarySetup: { en: "Enter your own email and phone number, including the country code. After room activation, connect the email account and verify the phone service. Entering these details does not connect them yet.", ko: "본인 이메일과 국가번호를 포함한 전화번호를 입력하세요. 방 활성화 후 이메일 계정 연결과 전화 서비스 확인이 필요합니다. 입력만으로 연결되지는 않습니다." },
  secretaryRequired: { en: "Enter a valid email. If you add a contact phone, include its country code starting with +.", ko: "올바른 이메일을 입력하세요. 연락처를 입력하는 경우 +로 시작하는 국가번호를 포함하세요." },
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
export type CreationMessage = keyof typeof creationMessages;
export function creationText(key: CreationMessage, locale: string) {
  const text = creationMessages[key];
  const lang = locale.toLowerCase().split(/[-_]/)[0];
  return lang === "ko" ? `${text.en} ${text.ko}` : text.en;
}
