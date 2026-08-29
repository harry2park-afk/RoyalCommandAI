export type ConnectorTextKey =
  | "connectButton" | "dialogTitle" | "searchPlaceholder" | "all" | "ai" | "tools" | "services"
  | "sendSelected" | "selectedCount" | "connected" | "notConnected" | "notAvailable" | "loading"
  | "included" | "pendingPayment" | "planned" | "connect" | "disconnect" | "payment" | "cancel"
  | "agreementTitle" | "agreementBody" | "agreeAndSend" | "paymentTitle" | "paymentUnavailable" | "ok"
  | "loadError" | "connectError" | "disconnectError" | "nothingSelected";

type Dict = Record<ConnectorTextKey, string>;

const EN: Dict = {
  connectButton: "Connect", dialogTitle: "Connect to this Room", searchPlaceholder: "Search AI, apps, tools or services…",
  all: "All", ai: "AI", tools: "Apps & Tools", services: "Services", sendSelected: "Send to this Room",
  selectedCount: "selected", connected: "Connected", notConnected: "Not connected", notAvailable: "Not available", loading: "Loading…",
  included: "Included", pendingPayment: "Pending payment", planned: "Coming soon", connect: "Connect", disconnect: "Disconnect",
  payment: "Payment", cancel: "Cancel", agreementTitle: "Connection agreement",
  agreementBody: "I agree to connect the selected items to this Room and accept any displayed charges and applicable Royal Command service terms.",
  agreeAndSend: "Agree & Send", paymentTitle: "Payment", paymentUnavailable: "Payment is not yet available. Paid connections remain inactive until payment is confirmed by the server.",
  ok: "OK", loadError: "Unable to load connections", connectError: "Connection request failed", disconnectError: "Disconnect failed",
  nothingSelected: "Select at least one item first.",
};

const KO: Dict = {
  connectButton: "연결", dialogTitle: "이 Room에 연결", searchPlaceholder: "AI, 앱, 도구 또는 서비스를 검색하세요…",
  all: "전체", ai: "AI", tools: "앱 및 도구", services: "서비스", sendSelected: "이 Room으로 보내기",
  selectedCount: "개 선택", connected: "연결됨", notConnected: "연결 안 됨", notAvailable: "사용 불가", loading: "불러오는 중…",
  included: "기본 포함", pendingPayment: "결제 대기", planned: "준비 중", connect: "연결", disconnect: "연결 해제",
  payment: "결제", cancel: "취소", agreementTitle: "연결 동의",
  agreementBody: "선택한 항목을 이 Room에 연결하고 표시된 요금 및 해당 Royal Command 서비스 약관에 동의합니다.",
  agreeAndSend: "동의하고 보내기", paymentTitle: "결제", paymentUnavailable: "현재 결제 기능은 아직 연결되지 않았습니다. 서버에서 결제가 확인되기 전에는 유료 연결이 활성화되지 않습니다.",
  ok: "확인", loadError: "연결 항목을 불러올 수 없습니다", connectError: "연결 요청에 실패했습니다", disconnectError: "연결 해제에 실패했습니다",
  nothingSelected: "먼저 하나 이상 선택하세요.",
};

const ZH_CN: Dict = {
  connectButton: "连接", dialogTitle: "连接到此房间", searchPlaceholder: "搜索 AI、应用、工具或服务…",
  all: "全部", ai: "AI", tools: "应用与工具", services: "服务", sendSelected: "发送到此房间",
  selectedCount: "项已选择", connected: "已连接", notConnected: "未连接", notAvailable: "不可用", loading: "加载中…",
  included: "已包含", pendingPayment: "等待付款", planned: "即将推出", connect: "连接", disconnect: "断开连接",
  payment: "付款", cancel: "取消", agreementTitle: "连接协议",
  agreementBody: "我同意将所选项目连接到此房间，并接受显示的费用及适用的 Royal Command 服务条款。",
  agreeAndSend: "同意并发送", paymentTitle: "付款", paymentUnavailable: "付款功能尚未启用。在服务器确认付款之前，付费连接不会激活。",
  ok: "确定", loadError: "无法加载连接", connectError: "连接请求失败", disconnectError: "断开连接失败",
  nothingSelected: "请先选择至少一项。",
};

const ZH_TW: Dict = {
  connectButton: "連接", dialogTitle: "連接到此房間", searchPlaceholder: "搜尋 AI、應用程式、工具或服務…",
  all: "全部", ai: "AI", tools: "應用程式與工具", services: "服務", sendSelected: "傳送到此房間",
  selectedCount: "項已選擇", connected: "已連接", notConnected: "未連接", notAvailable: "不可用", loading: "載入中…",
  included: "已包含", pendingPayment: "等待付款", planned: "即將推出", connect: "連接", disconnect: "中斷連接",
  payment: "付款", cancel: "取消", agreementTitle: "連接協議",
  agreementBody: "我同意將所選項目連接到此房間，並接受顯示的費用及適用的 Royal Command 服務條款。",
  agreeAndSend: "同意並傳送", paymentTitle: "付款", paymentUnavailable: "付款功能尚未啟用。在伺服器確認付款之前，付費連接不會啟用。",
  ok: "確定", loadError: "無法載入連接", connectError: "連接請求失敗", disconnectError: "中斷連接失敗",
  nothingSelected: "請先選擇至少一項。",
};

const AR: Dict = {
  connectButton: "اتصال", dialogTitle: "الاتصال بهذه الغرفة", searchPlaceholder: "ابحث عن الذكاء الاصطناعي أو التطبيقات أو الأدوات أو الخدمات…",
  all: "الكل", ai: "الذكاء الاصطناعي", tools: "التطبيقات والأدوات", services: "الخدمات", sendSelected: "إرسال إلى هذه الغرفة",
  selectedCount: "محدد", connected: "متصل", notConnected: "غير متصل", notAvailable: "غير متاح", loading: "جارٍ التحميل…",
  included: "مضمّن", pendingPayment: "بانتظار الدفع", planned: "قريبًا", connect: "اتصال", disconnect: "قطع الاتصال",
  payment: "الدفع", cancel: "إلغاء", agreementTitle: "اتفاقية الاتصال",
  agreementBody: "أوافق على توصيل العناصر المحددة بهذه الغرفة وقبول الرسوم المعروضة وشروط خدمة Royal Command المعمول بها.",
  agreeAndSend: "موافقة وإرسال", paymentTitle: "الدفع", paymentUnavailable: "الدفع غير متاح بعد. تظل الاتصالات المدفوعة غير نشطة حتى يؤكد الخادم الدفع.",
  ok: "حسنًا", loadError: "تعذر تحميل الاتصالات", connectError: "فشل طلب الاتصال", disconnectError: "فشل قطع الاتصال",
  nothingSelected: "اختر عنصرًا واحدًا على الأقل أولاً.",
};

export function connectorDict(locale: string): Dict {
  const normalized = locale.toLowerCase();
  if (normalized.startsWith("ko")) return KO;
  if (normalized.startsWith("zh-tw") || normalized.startsWith("zh-hk")) return ZH_TW;
  if (normalized.startsWith("zh")) return ZH_CN;
  if (normalized.startsWith("ar")) return AR;
  return EN;
}

export function isRtlLocale(locale: string) {
  return /^(ar|he|fa|ur)(-|$)/i.test(locale);
}
