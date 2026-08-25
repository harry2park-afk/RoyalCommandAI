export type CreateRoomLocale = "en" | "ko" | "ja" | "zh" | "vi" | "id" | "th" | "hi";

export type CountryOption = {
  code: string;
  label: string;
  locale: CreateRoomLocale;
};

export const CREATE_ROOM_COUNTRIES: CountryOption[] = [
  { code: "AU", label: "Australia", locale: "en" },
  { code: "US", label: "United States", locale: "en" },
  { code: "GB", label: "United Kingdom", locale: "en" },
  { code: "SG", label: "Singapore", locale: "en" },
  { code: "HK", label: "Hong Kong", locale: "en" },
  { code: "KR", label: "대한민국 / Korea", locale: "ko" },
  { code: "JP", label: "日本 / Japan", locale: "ja" },
  { code: "CN", label: "中国 / China", locale: "zh" },
  { code: "TW", label: "台灣 / Taiwan", locale: "zh" },
  { code: "VN", label: "Việt Nam", locale: "vi" },
  { code: "ID", label: "Indonesia", locale: "id" },
  { code: "TH", label: "ประเทศไทย / Thailand", locale: "th" },
  { code: "IN", label: "India", locale: "hi" },
];

export const CREATE_ROOM_LANGUAGES: Array<{ locale: CreateRoomLocale; label: string }> = [
  { locale: "en", label: "English" },
  { locale: "ko", label: "한국어" },
  { locale: "ja", label: "日本語" },
  { locale: "zh", label: "中文" },
  { locale: "vi", label: "Tiếng Việt" },
  { locale: "id", label: "Bahasa Indonesia" },
  { locale: "th", label: "ภาษาไทย" },
  { locale: "hi", label: "हिन्दी" },
];

const EN = {
  title: "Create Your Room",
  subtitle: "Tell us what you need in one short sentence. Royal Command will recommend a simple starting configuration.",
  steps: ["Describe", "Recommend", "Customise", "Review", "Agreement"],
  step1Title: "What kind of Room should we create?",
  step1Help: "Example: Create an accountant office for three staff with client documents, phone calls, appointments and GST reminders.",
  placeholder: "Describe your Room in one or two sentences...",
  teamSize: "Team size",
  language: "Language",
  country: "Country",
  aiRecommend: "AI Recommend My Room",
  direct: "Choose myself",
  step2Title: "AI Recommendation",
  recommendedRoom: "Recommended Room",
  choosePackage: "Choose a starting package. Everything can be changed next.",
  good: "Good · Essential",
  better: "Better · Recommended",
  best: "Best · Full Office",
  goodDesc: "Core tools only.",
  betterDesc: "Balanced package based on your description.",
  bestDesc: "Broader office, communication and customer tools.",
  step3Title: "Customise only what you need",
  step3Help: "A clear green tick means selected. Tap it again to remove the service and update the total immediately.",
  back: "Back",
  review: "Review Selection",
  step4Title: "Final Review",
  step4Help: "Only selected services appear below. Tap a green-ticked item to remove it.",
  noAddons: "No add-on services selected. Basic RC Room only.",
  roomType: "Room type",
  team: "Team",
  trial: "Basic RC Room",
  trialText: "days FREE, then",
  training: "AI Training Benefit included",
  websiteBenefit: "Starter Website Benefit eligible at the current known monthly spend (A$80+).",
  edit: "Edit",
  agreementPayment: "Agreement & Payment",
  step5Title: "Agreement & Payment",
  step5Help: "Electronic signature and payment connections will be integrated and tested before public launch.",
  agreement: "I have reviewed the selected services, trial terms and recurring estimate.",
  pendingIntegration: "Electronic signature, payment, cancellation/renewal policy, GST treatment and final usage prices will be connected before public launch.",
  readyPreview: "Ready for Preview Integration",
  livePrice: "Live Price Summary",
  today: "Today",
  afterTrial: "After trial / month",
  oneTime: "One-time website work",
  promotion: "Promotion",
  save: "You save",
  total: "Monthly total",
  priceToConfirm: "Price to confirm",
  included: "Included",
  from: "From",
  selected: "Selected",
  version: "Universal Create Room",
  basicBenefit: "30-day AI Training · 5 exam attempts per cycle · 70% pass · extra 2-week study cycles until passed · electronic Certificate of Completion included.",
};

type Copy = typeof EN;

const COPY: Record<CreateRoomLocale, Copy> = {
  en: EN,
  ko: { ...EN,
    title: "나의 Room 만들기", subtitle: "원하는 Room을 한두 문장으로 말씀해 주세요. Royal Command가 가장 간단한 시작 구성을 추천합니다.",
    steps: ["설명", "AI 추천", "서비스 조정", "최종 확인", "동의·결제"], step1Title: "어떤 Room을 만들어 드릴까요?", step1Help: "예: 직원 3명이 쓰는 회계사 사무실. 고객 서류, 전화, 예약, GST 알림이 필요합니다.", placeholder: "원하는 Room을 한두 문장으로 적어 주세요...", teamSize: "팀 인원", language: "언어", country: "국가", aiRecommend: "AI가 Room 추천", direct: "직접 고르기", step2Title: "AI 추천", recommendedRoom: "추천 Room", choosePackage: "시작 패키지를 고르세요. 다음 단계에서 모두 바꿀 수 있습니다.", good: "Good · 기본", better: "Better · 추천", best: "Best · Full Office", goodDesc: "핵심 기능만 사용합니다.", betterDesc: "설명에 맞춘 균형 잡힌 추천 구성입니다.", bestDesc: "업무·통신·고객 기능을 넓게 포함합니다.", step3Title: "필요한 서비스만 조정하세요", step3Help: "선택한 항목은 선명한 초록색 ✓로 표시됩니다. 다시 누르면 즉시 해제되고 금액도 자동 공제됩니다.", back: "뒤로", review: "선택 내용 확인", step4Title: "최종 확인", step4Help: "선택한 서비스만 표시됩니다. 초록색 ✓ 항목을 다시 누르면 바로 제거됩니다.", noAddons: "추가 서비스를 선택하지 않았습니다. Basic RC Room만 사용합니다.", roomType: "Room 종류", team: "팀", trial: "Basic RC Room", trialText: "일 무료, 이후", training: "AI 교육 혜택 포함", websiteBenefit: "현재 월 사용액 기준 A$80+ Starter Website 무료 혜택 대상입니다.", edit: "수정", agreementPayment: "동의 및 결제", step5Title: "동의 및 결제", step5Help: "전자서명과 결제 시스템은 공개 전에 실제 시스템으로 연결하고 테스트합니다.", agreement: "선택 서비스, 무료 체험 조건 및 월 예상금액을 확인했습니다.", pendingIntegration: "전자서명·결제·해지/갱신 정책·GST·사용량 요금은 공개 전에 최종 연결합니다.", readyPreview: "Preview 연결 준비", livePrice: "실시간 가격", today: "오늘 결제", afterTrial: "무료기간 후 월", oneTime: "웹 제작 일회성", promotion: "프로모션 할인", save: "절약 금액", total: "최종 월 금액", priceToConfirm: "가격 추후 확정", included: "포함", from: "부터", selected: "선택됨", version: "Universal Create Room", basicBenefit: "30일 AI 교육 · 시험 5회씩 · 70점 합격 · 불합격 시 2주 무료 추가학습 반복 · 전자 수료증 무료." },
  ja: { ...EN, title: "Roomを作成", subtitle: "必要なRoomを1〜2文で説明してください。Royal Commandが最適な開始構成を提案します。", steps: ["説明", "AI提案", "調整", "確認", "同意・決済"], step1Title: "どのようなRoomを作りますか？", step1Help: "例：スタッフ3名の会計事務所。顧客書類、電話、予約、GST通知が必要です。", placeholder: "必要なRoomを1〜2文で入力してください...", teamSize: "人数", language: "言語", country: "国", aiRecommend: "AIにRoomを提案してもらう", direct: "自分で選ぶ", step2Title: "AI提案", recommendedRoom: "おすすめRoom", choosePackage: "開始パッケージを選択してください。次のステップで変更できます。", step3Title: "必要なサービスだけ調整", step3Help: "選択項目は緑の✓で表示されます。もう一度押すと解除され、料金も更新されます。", back: "戻る", review: "選択内容を確認", step4Title: "最終確認", step4Help: "選択したサービスだけ表示されます。", noAddons: "追加サービスは選択されていません。", edit: "編集", agreementPayment: "同意・決済", step5Title: "同意・決済", livePrice: "リアルタイム料金", today: "本日", afterTrial: "無料期間後/月", oneTime: "Web制作一回料金", promotion: "プロモーション", save: "節約額", total: "月額合計" },
  zh: { ...EN, title: "创建您的 Room", subtitle: "请用一两句话告诉我们您需要什么。Royal Command 会推荐合适的初始配置。", steps: ["说明", "AI推荐", "调整服务", "最终确认", "同意与付款"], step1Title: "您想创建什么样的 Room？", step1Help: "例如：为3名员工创建会计办公室，需要客户文件、电话、预约和GST提醒。", placeholder: "请用一两句话描述您的 Room...", teamSize: "团队人数", language: "语言", country: "国家/地区", aiRecommend: "让AI推荐Room", direct: "自行选择", step2Title: "AI推荐", recommendedRoom: "推荐Room", choosePackage: "请选择起始套餐，下一步仍可修改。", step3Title: "只调整您需要的服务", step3Help: "已选择项目显示绿色✓。再次点击即可取消并立即更新费用。", back: "返回", review: "查看选择", step4Title: "最终确认", step4Help: "这里只显示已选择的服务。", noAddons: "未选择附加服务。", edit: "修改", agreementPayment: "同意与付款", step5Title: "同意与付款", livePrice: "实时价格", today: "今天", afterTrial: "试用后/月", oneTime: "网站制作一次性费用", promotion: "促销优惠", save: "您节省", total: "每月总计" },
  vi: { ...EN, title: "Tạo Room của bạn", subtitle: "Hãy mô tả Room bạn cần trong một hoặc hai câu. Royal Command sẽ đề xuất cấu hình phù hợp.", steps: ["Mô tả", "AI đề xuất", "Tùy chỉnh", "Xem lại", "Đồng ý & thanh toán"], step1Title: "Bạn muốn tạo Room nào?", placeholder: "Mô tả Room trong một hoặc hai câu...", teamSize: "Quy mô nhóm", language: "Ngôn ngữ", country: "Quốc gia", aiRecommend: "AI đề xuất Room", direct: "Tự chọn", step2Title: "AI đề xuất", step3Title: "Chỉ chọn dịch vụ bạn cần", back: "Quay lại", review: "Xem lựa chọn", step4Title: "Xác nhận cuối", edit: "Chỉnh sửa", agreementPayment: "Đồng ý & thanh toán", step5Title: "Đồng ý & thanh toán", livePrice: "Giá trực tiếp", today: "Hôm nay", afterTrial: "Sau dùng thử/tháng", oneTime: "Chi phí web một lần", promotion: "Khuyến mãi", save: "Bạn tiết kiệm", total: "Tổng hàng tháng" },
  id: { ...EN, title: "Buat Room Anda", subtitle: "Jelaskan Room yang Anda butuhkan dalam satu atau dua kalimat. Royal Command akan merekomendasikan konfigurasi awal.", steps: ["Jelaskan", "Rekomendasi AI", "Sesuaikan", "Tinjau", "Persetujuan & pembayaran"], step1Title: "Room seperti apa yang ingin dibuat?", placeholder: "Jelaskan Room dalam satu atau dua kalimat...", teamSize: "Jumlah tim", language: "Bahasa", country: "Negara", aiRecommend: "AI rekomendasikan Room", direct: "Pilih sendiri", step2Title: "Rekomendasi AI", step3Title: "Sesuaikan hanya yang diperlukan", back: "Kembali", review: "Tinjau pilihan", step4Title: "Tinjauan akhir", edit: "Ubah", agreementPayment: "Persetujuan & pembayaran", step5Title: "Persetujuan & pembayaran", livePrice: "Ringkasan harga", today: "Hari ini", afterTrial: "Setelah uji coba/bulan", oneTime: "Biaya web satu kali", promotion: "Promosi", save: "Hemat", total: "Total bulanan" },
  th: { ...EN, title: "สร้าง Room ของคุณ", subtitle: "บอกเราสั้น ๆ ว่าต้องการ Room แบบใด Royal Command จะช่วยแนะนำการตั้งค่าเริ่มต้น", steps: ["อธิบาย", "AI แนะนำ", "ปรับแต่ง", "ตรวจสอบ", "ยอมรับและชำระเงิน"], step1Title: "ต้องการสร้าง Room แบบใด?", placeholder: "อธิบาย Room ในหนึ่งหรือสองประโยค...", teamSize: "จำนวนทีม", language: "ภาษา", country: "ประเทศ", aiRecommend: "ให้ AI แนะนำ Room", direct: "เลือกเอง", step2Title: "คำแนะนำจาก AI", step3Title: "เลือกเฉพาะบริการที่ต้องการ", back: "กลับ", review: "ตรวจสอบการเลือก", step4Title: "ตรวจสอบขั้นสุดท้าย", edit: "แก้ไข", agreementPayment: "ยอมรับและชำระเงิน", step5Title: "ยอมรับและชำระเงิน", livePrice: "สรุปราคา", today: "วันนี้", afterTrial: "หลังทดลองใช้ฟรี/เดือน", oneTime: "ค่าทำเว็บไซต์ครั้งเดียว", promotion: "โปรโมชั่น", save: "ประหยัด", total: "รวมรายเดือน" },
  hi: { ...EN, title: "अपना Room बनाएं", subtitle: "एक या दो वाक्यों में बताइए कि आपको किस प्रकार का Room चाहिए। Royal Command शुरुआती संरचना सुझाएगा।", steps: ["विवरण", "AI सुझाव", "अनुकूलित करें", "समीक्षा", "सहमति व भुगतान"], step1Title: "आप किस प्रकार का Room बनाना चाहते हैं?", placeholder: "Room का संक्षिप्त विवरण दें...", teamSize: "टीम का आकार", language: "भाषा", country: "देश", aiRecommend: "AI से Room सुझाव लें", direct: "खुद चुनें", step2Title: "AI सुझाव", step3Title: "केवल आवश्यक सेवाएं चुनें", back: "वापस", review: "चयन देखें", step4Title: "अंतिम समीक्षा", edit: "बदलें", agreementPayment: "सहमति व भुगतान", step5Title: "सहमति व भुगतान", livePrice: "लाइव कीमत", today: "आज", afterTrial: "ट्रायल के बाद/माह", oneTime: "वेबसाइट एकमुश्त", promotion: "प्रमोशन", save: "आपकी बचत", total: "मासिक कुल" },
};

export function createRoomCopy(locale: CreateRoomLocale): Copy {
  return COPY[locale] || EN;
}
