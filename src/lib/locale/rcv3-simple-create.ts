// Customer-selected account language; never inferred from the room description.
const messages = {
 title: ["Create your room", "내 방 만들기"], back:["My rooms","내 방"],
 name:["1. Room name","1. 룸 이름"], purpose:["2. What will you use this room for?","2. 무엇을 할 방인가요?"],
 example:["For example: teach English or manage customer enquiries","예: 영어 공부를 하거나 고객 문의를 관리하고 싶어요"],
 design:["3. Choose your room design","3. 룸 디자인 선택"],
 options:["4. Your room features","4. 자동으로 준비한 기능 선택"], payment:["5. Review and pay","5. 금액 확인 및 결제"],
 recommended:["Suggested for your purpose. Change any selection below.","용도에 맞춰 준비했습니다. 필요한 항목을 선택하거나 해제하세요."],
 more:["More designs","다른 디자인 보기"], settings:["Change AI and connection settings","AI 및 연결 설정 변경"],
 category:["Room category","룸 종류"], save:["Save","Save"], saved:["Saved","저장됨"], saveRequired:["Press Save before payment.","결제 전에 Save를 눌러 주세요."], saving:["Saving…","저장 중…"], loading:["Loading…","불러오는 중…"], unsaved:["Unsaved changes","저장되지 않은 변경"],
 drafts:["Saved rooms in progress","작성 중인 방"], new:["Start a new room","새 방 작성"], retry:["Retry","다시 시도"], fork:["Save as a new room","새 방으로 저장"],
 country:["Country","국가"], required:["Enter your room name and purpose to continue.","룸 이름과 용도를 입력하면 다음 항목이 준비됩니다."],
 secretary:["AI secretary","AI 비서"], specialist:["Specialist AI","전문 AI"], email:["Secretary email","비서 이메일"], phone:["Contact phone (optional)","연락처 (선택)"],
 unavailableCredits:["Credit payments are not connected yet.","적립금 결제는 아직 연결되지 않았습니다."],
 price:["Check monthly total","월 총금액 확인"], wait:["Please wait…","잠시 기다려 주세요…"], approve:["Agree and continue to payment","동의하고 결제로 이동"],
 check:["Check existing payment","기존 결제 확인"], open:["Open room","방 열기"], return:["Back","돌아가기"],
 consent:["I agree to the terms and the monthly recurring total.","약관 및 표시된 금액의 매월 정기결제에 동의합니다."],
 signature:["Full name for agreement","동의하는 본인의 성명"], terms:["Subscription terms","구독 약관"], total:["Monthly total","매월 총금액"],
 card:["Card details are entered securely on the payment page.","카드 정보는 다음 결제 화면에서 안전하게 입력합니다."],
 cardChoice:["Pay by card","카드로 결제"], bankChoice:["Pay by bank transfer","은행 계좌로 송금"],
 balanceChoice:["Pay with RC balance","RC 잔액으로 결제"],
 balancePending:["RC balance payments will be available after your verified deposits and balance are connected. No balance will be deducted now.","확인된 입금액과 고객별 RC 잔액이 연결된 뒤 이용할 수 있습니다. 지금은 잔액이 차감되지 않습니다."],
 bankAccount:["Account name","계좌명"], bankReference:["Payment reference","입금 내용"],
 bankInstructions:["Enter your RC customer number as the payment reference when transferring. Your room remains a saved draft until the actual deposit and amount are verified. Bank transfer verification is not connected yet.","송금할 때 입금 내용에 본인의 RC 고객번호를 입력하세요. 실제 입금액과 번호가 확인될 때까지 방은 저장된 초안으로 남습니다. 은행 입금 자동 확인은 아직 연결되지 않았습니다."],
 bankNoQuote:["Do not transfer until the monthly amount is shown and confirmed.","월 결제 금액이 표시되고 확인되기 전에는 송금하지 마세요."],
 bankConsent:["I agree to the displayed RC terms and monthly amount. I understand bank transfers require verification and future months require another payment.","표시된 RC 규정과 월 금액에 동의합니다. 은행 송금은 입금 확인이 필요하며 다음 달에도 별도 결제가 필요함을 이해합니다."],
 bankSign:["Sign and show bank details","서명하고 송금 계좌 보기"],
 bankSigned:["Agreement saved. Bank deposit matching is not connected; do not transfer money yet. Your room stays a draft until RC verifies the actual deposit.","동의와 서명이 저장됐습니다. 은행 입금 대조가 아직 연결되지 않았으니 지금은 송금하지 마세요. 실제 입금이 확인될 때까지 방은 초안으로 남습니다."],
} as const;
export function simpleCreateText(key:keyof typeof messages, language:string) {
 return messages[key][language.toLowerCase().split(/[-_]/)[0] === "ko" ? 1 : 0];
}
const ko:Record<string,string> = {
 "Reception":"접수", "Booking":"예약", "Documents":"문서", "Research":"조사", "Legal Intake":"법률 상담 접수",
 "Accounting Intake":"회계 업무 접수", "Document Assistant":"문서 도우미", "Reminders":"알림", "Executive Assistant":"업무 비서", "Sales":"영업", "Operations":"운영",
 "AI Room Designer":"방 설계 도우미", "Research Assistant":"조사 도우미", "General Assistant":"일반 도우미",
 "AI Tutor":"AI 학습 지도", "Assessment":"학습 평가", "Tutor":"학습 지도", "Lesson Planner":"수업 계획", "Student Support":"학생 지원", "Learning Assistant":"학습 도우미",
 "Customer Support":"고객 지원", "Orders":"주문", "Returns":"반품", "Scheduling":"일정 관리", "Project Coordinator":"프로젝트 관리",
};
export function roomFeatureLabel(value:string, language:string) { return language.toLowerCase().startsWith("ko") ? ko[value] || value : value; }
