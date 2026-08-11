import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Globe2, Search, Bell, ChevronDown, ChevronRight, Menu, X,
  Scale, Calculator, Mic, Truck, Building2, Users, ShieldCheck,
  Stethoscope, Landmark, Wrench, Boxes, Plane, HeartHandshake,
  MessageSquare, BarChart3, Settings, LayoutGrid, Radio, PhoneCall,
  FileText, Sparkles, Lock, Mail, Eye, EyeOff, ArrowUpRight, ArrowDownRight,
  UserCircle2, Phone, Play, Square, UploadCloud, Paperclip, Trash2,
  ChevronsUpDown, Check, Loader2,
} from "lucide-react";

/* ==================================================================
   ROYAL COMMAND — INTEGRATED FRAME (Stage 1)
   Login <-> Dashboard, sidebar-driven content switch, 3 embedded forms.

   Token system
   - bg     : slate-950 / slate-900   (#020617 / #0F172A)
   - glass  : white/5 + backdrop-blur, border white/10
   - cyan   : #00F0FF  (signal / active / data)
   - violet : #8B5CF6  (command / authority)
   - type   : display = Sora · body = Inter · data = JetBrains Mono
   Signature: "The Orbit" — 100-node ring, hero on login, pulse pip in-app.

   Backend wiring contract (for ChatGPT / Grok):
   - I18N            -> replace with GET /i18n/{locale}.json
   - MARKETS         -> replace with GET /api/markets  (100 countries)
   - SERVICES        -> replace with GET /api/services (20+ verticals)
   - VOICE_AGENTS    -> replace with GET /api/retell/agents
   - onLogin(payload)          -> POST /api/auth/login
   - onProfileSubmit(payload)  -> POST /api/users/profile   (Twilio phone verify)
   - onVoiceTestCall(payload)  -> POST /api/retell/test-call
   - onServiceSubmit(payload)  -> POST /api/requests
   ================================================================== */

const BRAND_CYAN = "#00F0FF";
const BRAND_VIOLET = "#8B5CF6";

/* ---------------------------- i18n layer ---------------------------- */
const I18N = {
  ko: {
    dir: "ltr",
    tagline1: "COMMAND YOUR DOMAIN",
    tagline2: "지구에서 우주까지",
    signIn: "로그인", email: "이메일", password: "비밀번호",
    remember: "로그인 상태 유지", forgot: "비밀번호를 잊으셨나요?",
    orContinue: "다른 방법으로 계속하기", noAccount: "계정이 없으신가요?",
    createAccount: "계정 생성", search: "서비스, 고객, 명령 검색…",
    welcome: "환영합니다", overview: "오늘의 운영 현황입니다.",
    liveReport: "실시간 AI 주문 · 상담 리포트", viewAll: "전체 보기",
    collapse: "메뉴 접기", signOut: "로그아웃",
    // profile form
    profileTitle: "회원가입 / 프로필", profileSub: "계정 기본 정보와 연락처를 관리합니다.",
    fullName: "이름", country: "국가 선택 (100개국)", phone: "전화번호",
    phoneHint: "Twilio 인증 연동 · 국가 코드가 자동 반영됩니다.",
    save: "저장", sendCode: "인증코드 발송", saved: "저장되었습니다",
    // voice form
    voiceTitle: "AI Voice / 전화 제어", voiceSub: "Retell AI 음성 에이전트를 선택하고 시나리오를 테스트합니다.",
    agent: "음성 에이전트 선택", scenario: "통화 시나리오 입력",
    scenarioPh: "예: 상담 인사 → 요청 확인 → 예약 일정 제안 → 마무리 안내",
    testCall: "실시간 통화 테스트", calling: "통화 연결 중…", callActive: "통화 진행 중", endCall: "통화 종료",
    callLog: "통화 로그",
    // service form
    serviceTitle: "서비스 신청", serviceSub: "20개 서비스 공통 신청 양식입니다.",
    reqTitle: "제목", category: "서비스 카테고리", details: "상세 내용",
    detailsPh: "요청 내용을 구체적으로 작성해 주세요.",
    attach: "파일 첨부", attachHint: "드래그하여 놓거나 클릭해서 업로드",
    submit: "신청서 제출", submitted: "신청이 제출되었습니다",
    selectPlaceholder: "선택하세요",
  },
  en: {
    dir: "ltr",
    tagline1: "COMMAND YOUR DOMAIN", tagline2: "From Earth to space",
    signIn: "Sign In", email: "Email", password: "Password",
    remember: "Keep me signed in", forgot: "Forgot password?",
    orContinue: "Or continue with", noAccount: "Don't have an account?",
    createAccount: "Create account", search: "Search services, customers, commands…",
    welcome: "Welcome back", overview: "Here's what's operating today.",
    liveReport: "Live AI Order & Consultation Report", viewAll: "View all",
    collapse: "Collapse menu", signOut: "Sign out",
    profileTitle: "Sign Up / Profile", profileSub: "Manage your account details and contact info.",
    fullName: "Full name", country: "Select country (100 markets)", phone: "Phone number",
    phoneHint: "Twilio verification · country code applied automatically.",
    save: "Save", sendCode: "Send code", saved: "Saved",
    voiceTitle: "AI Voice / Call Control", voiceSub: "Choose a Retell AI voice agent and test a call scenario.",
    agent: "Select voice agent", scenario: "Call scenario",
    scenarioPh: "e.g. Greeting → confirm request → propose booking slot → wrap up",
    testCall: "Live Test Call", calling: "Connecting call…", callActive: "Call in progress", endCall: "End call",
    callLog: "Call log",
    serviceTitle: "Service Request", serviceSub: "Common application form for all 20+ services.",
    reqTitle: "Title", category: "Service category", details: "Details",
    detailsPh: "Describe your request in detail.",
    attach: "Attachments", attachHint: "Drag and drop, or click to upload",
    submit: "Submit request", submitted: "Request submitted",
    selectPlaceholder: "Select",
  },
  es: {
    dir: "ltr",
    tagline1: "COMANDA TU DOMINIO", tagline2: "De la Tierra al espacio",
    signIn: "Iniciar sesión", email: "Correo electrónico", password: "Contraseña",
    remember: "Mantener sesión iniciada", forgot: "¿Olvidaste tu contraseña?",
    orContinue: "O continuar con", noAccount: "¿No tienes una cuenta?",
    createAccount: "Crear cuenta", search: "Buscar servicios, clientes, comandos…",
    welcome: "Bienvenido de nuevo", overview: "Esto es lo que opera hoy.",
    liveReport: "Informe en vivo de pedidos IA y consultas", viewAll: "Ver todo",
    collapse: "Contraer menú", signOut: "Cerrar sesión",
    profileTitle: "Registro / Perfil", profileSub: "Gestiona tus datos de cuenta y contacto.",
    fullName: "Nombre completo", country: "Seleccionar país (100 mercados)", phone: "Número de teléfono",
    phoneHint: "Verificación Twilio · código de país automático.",
    save: "Guardar", sendCode: "Enviar código", saved: "Guardado",
    voiceTitle: "AI Voice / Control de llamadas", voiceSub: "Elige un agente de voz Retell AI y prueba un escenario.",
    agent: "Seleccionar agente de voz", scenario: "Escenario de llamada",
    scenarioPh: "ej. Saludo → confirmar solicitud → proponer horario → cierre",
    testCall: "Llamada de prueba en vivo", calling: "Conectando llamada…", callActive: "Llamada en curso", endCall: "Finalizar llamada",
    callLog: "Registro de llamadas",
    serviceTitle: "Solicitud de servicio", serviceSub: "Formulario común para más de 20 servicios.",
    reqTitle: "Título", category: "Categoría de servicio", details: "Detalles",
    detailsPh: "Describe tu solicitud en detalle.",
    attach: "Archivos adjuntos", attachHint: "Arrastra y suelta, o haz clic para subir",
    submit: "Enviar solicitud", submitted: "Solicitud enviada",
    selectPlaceholder: "Seleccionar",
  },
  ar: {
    dir: "rtl",
    tagline1: "قُد نطاقك", tagline2: "من الأرض إلى الفضاء",
    signIn: "تسجيل الدخول", email: "البريد الإلكتروني", password: "كلمة المرور",
    remember: "إبقائي مسجّلاً للدخول", forgot: "هل نسيت كلمة المرور؟",
    orContinue: "أو المتابعة عبر", noAccount: "ليس لديك حساب؟",
    createAccount: "إنشاء حساب", search: "ابحث عن الخدمات والعملاء والأوامر…",
    welcome: "مرحبًا بعودتك", overview: "إليك ما يعمل اليوم.",
    liveReport: "تقرير مباشر لطلبات واستشارات الذكاء الاصطناعي", viewAll: "عرض الكل",
    collapse: "طيّ القائمة", signOut: "تسجيل الخروج",
    profileTitle: "التسجيل / الملف الشخصي", profileSub: "إدارة بيانات حسابك ومعلومات الاتصال.",
    fullName: "الاسم الكامل", country: "اختر الدولة (100 سوق)", phone: "رقم الهاتف",
    phoneHint: "تحقق عبر Twilio · يُطبَّق رمز الدولة تلقائيًا.",
    save: "حفظ", sendCode: "إرسال الرمز", saved: "تم الحفظ",
    voiceTitle: "AI Voice / التحكم بالمكالمات", voiceSub: "اختر وكيل صوت Retell AI واختبر سيناريو مكالمة.",
    agent: "اختر وكيل الصوت", scenario: "سيناريو المكالمة",
    scenarioPh: "مثال: ترحيب → تأكيد الطلب → اقتراح موعد → ختام",
    testCall: "مكالمة اختبار مباشرة", calling: "جارٍ الاتصال…", callActive: "المكالمة جارية", endCall: "إنهاء المكالمة",
    callLog: "سجل المكالمات",
    serviceTitle: "طلب خدمة", serviceSub: "نموذج طلب موحّد لأكثر من 20 خدمة.",
    reqTitle: "العنوان", category: "فئة الخدمة", details: "التفاصيل",
    detailsPh: "صف طلبك بالتفصيل.",
    attach: "المرفقات", attachHint: "اسحب وأفلت، أو انقر للرفع",
    submit: "إرسال الطلب", submitted: "تم إرسال الطلب",
    selectPlaceholder: "اختر",
  },
};

// Sample slice of the 100-country switcher — hydrate from /api/markets.
const MARKETS = [
  { code: "KR", label: "대한민국 · 한국어", locale: "ko", dial: "+82" },
  { code: "US", label: "United States · English", locale: "en", dial: "+1" },
  { code: "GB", label: "United Kingdom · English", locale: "en", dial: "+44" },
  { code: "ES", label: "España · Español", locale: "es", dial: "+34" },
  { code: "MX", label: "México · Español", locale: "es", dial: "+52" },
  { code: "AE", label: "الإمارات · العربية", locale: "ar", dial: "+971" },
  { code: "SA", label: "السعودية · العربية", locale: "ar", dial: "+966" },
  { code: "JP", label: "日本 · 日本語", locale: "en", dial: "+81" },
  { code: "AU", label: "Australia · English", locale: "en", dial: "+61" },
  { code: "DE", label: "Deutschland · Deutsch", locale: "en", dial: "+49" },
];

// 20+ service verticals — hydrate from /api/services.
const SERVICES = [
  { key: "overview", label: { ko: "대시보드", en: "Dashboard" }, icon: LayoutGrid, kind: "overview" },
  { key: "profile", label: { ko: "회원가입/프로필", en: "Sign Up / Profile" }, icon: UserCircle2, kind: "profile" },
  { key: "ai_voice", label: { ko: "AI 보이스", en: "AI Voice" }, icon: Mic, kind: "voice" },
  { key: "legal", label: { ko: "법률", en: "Legal" }, icon: Scale, kind: "request" },
  { key: "accounting", label: { ko: "회계", en: "Accounting" }, icon: Calculator, kind: "request" },
  { key: "delivery", label: { ko: "배송", en: "Delivery" }, icon: Truck, kind: "request" },
  { key: "real_estate", label: { ko: "부동산", en: "Real Estate" }, icon: Building2, kind: "request" },
  { key: "hr", label: { ko: "인사관리", en: "HR & Payroll" }, icon: Users, kind: "request" },
  { key: "compliance", label: { ko: "컴플라이언스", en: "Compliance" }, icon: ShieldCheck, kind: "request" },
  { key: "health", label: { ko: "헬스케어", en: "Healthcare" }, icon: Stethoscope, kind: "request" },
  { key: "finance", label: { ko: "금융", en: "Finance" }, icon: Landmark, kind: "request" },
  { key: "maintenance", label: { ko: "시설관리", en: "Maintenance" }, icon: Wrench, kind: "request" },
  { key: "inventory", label: { ko: "재고관리", en: "Inventory" }, icon: Boxes, kind: "request" },
  { key: "travel", label: { ko: "출장/여행", en: "Travel" }, icon: Plane, kind: "request" },
  { key: "concierge", label: { ko: "컨시어지", en: "Concierge" }, icon: HeartHandshake, kind: "request" },
  { key: "support", label: { ko: "고객상담", en: "Support" }, icon: MessageSquare, kind: "request" },
  { key: "analytics", label: { ko: "분석", en: "Analytics" }, icon: BarChart3, kind: "request" },
  { key: "dispatch", label: { ko: "AI 디스패치", en: "AI Dispatch" }, icon: Radio, kind: "request" },
  { key: "call_center", label: { ko: "콜센터", en: "Call Center" }, icon: PhoneCall, kind: "request" },
  { key: "contracts", label: { ko: "계약관리", en: "Contracts" }, icon: FileText, kind: "request" },
  { key: "automation", label: { ko: "자동화", en: "Automation" }, icon: Sparkles, kind: "request" },
  { key: "settings", label: { ko: "설정", en: "Settings" }, icon: Settings, kind: "request" },
];

// Retell AI voice agents — hydrate from /api/retell/agents.
const VOICE_AGENTS = [
  { id: "agt_elizabeth", name: "Elizabeth · Customer Comms", lang: "KO/EN", tone: { ko: "정중 · 고객응대", en: "Formal · Customer-facing" } },
  { id: "agt_kevin", name: "Kevin · Ops Dispatch", lang: "EN/ES", tone: { ko: "간결 · 운영/배차", en: "Concise · Operations" } },
  { id: "agt_katie", name: "Katie · Concierge", lang: "KO/EN/AR", tone: { ko: "따뜻함 · 컨시어지", en: "Warm · Concierge" } },
];

const KPI_DATA = [
  { key: "orders", label: { ko: "오늘 AI 주문", en: "AI Orders Today" }, value: "1,284", delta: "+12.4%", up: true },
  { key: "consults", label: { ko: "AI 상담 건수", en: "AI Consultations" }, value: "3,910", delta: "+6.1%", up: true },
  { key: "revenue", label: { ko: "실시간 매출", en: "Live Revenue" }, value: "$48,920", delta: "+3.8%", up: true },
  { key: "sla", label: { ko: "SLA 이탈", en: "SLA Breaches" }, value: "7", delta: "-2.2%", up: false },
];

const LIVE_ROWS = [
  { id: "RC-88213", service: { ko: "AI 보이스", en: "AI Voice" }, market: "KR", status: "resolved", time: "00:42" },
  { id: "RC-88214", service: { ko: "배송", en: "Delivery" }, market: "AU", status: "in_progress", time: "01:15" },
  { id: "RC-88215", service: { ko: "법률", en: "Legal" }, market: "US", status: "queued", time: "—" },
  { id: "RC-88216", service: { ko: "회계", en: "Accounting" }, market: "ES", status: "resolved", time: "00:58" },
  { id: "RC-88217", service: { ko: "컨시어지", en: "Concierge" }, market: "AE", status: "in_progress", time: "02:03" },
];

const STATUS_STYLE = {
  resolved: { dot: "#34D399", text: "text-emerald-300", label: { ko: "완료", en: "Resolved" } },
  in_progress: { dot: BRAND_CYAN, text: "text-cyan-300", label: { ko: "진행중", en: "In progress" } },
  queued: { dot: "#94A3B8", text: "text-slate-400", label: { ko: "대기", en: "Queued" } },
};

/* ---------------------------- The Orbit (signature) ---------------------------- */
function Orbit({ size = 340, nodeCount = 48, compact = false }) {
  const nodes = useMemo(() => Array.from({ length: nodeCount }, (_, i) => i), [nodeCount]);
  if (compact) {
    return (
      <span className="relative inline-flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: BRAND_CYAN }} />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: BRAND_CYAN }} />
      </span>
    );
  }
  return (
    <div className="pointer-events-none absolute inset-0 mx-auto flex items-center justify-center" style={{ width: size, height: size }} aria-hidden="true">
      <div className="absolute inset-0 rounded-full border border-white/10" />
      <div className="absolute inset-8 rounded-full border border-white/[0.08]" />
      <div className="absolute inset-16 rounded-full border border-white/[0.06]" />
      <div className="absolute inset-0 animate-[spin_36s_linear_infinite] rounded-full" style={{ width: size, height: size }}>
        {nodes.map((i) => {
          const angle = (i / nodeCount) * 2 * Math.PI;
          const r = size / 2;
          const x = r + r * Math.cos(angle);
          const y = r + r * Math.sin(angle);
          const isKey = i % 6 === 0;
          return (
            <span key={i} className="absolute rounded-full" style={{
              left: x, top: y, width: isKey ? 5 : 2.5, height: isKey ? 5 : 2.5,
              transform: "translate(-50%,-50%)",
              backgroundColor: isKey ? BRAND_CYAN : "rgba(148,163,184,0.5)",
              boxShadow: isKey ? `0 0 8px ${BRAND_CYAN}` : "none",
            }} />
          );
        })}
      </div>
      <div className="absolute h-24 w-24 animate-[spin_28s_linear_infinite_reverse] rounded-full blur-2xl opacity-30"
        style={{ background: `radial-gradient(circle, ${BRAND_VIOLET}, transparent 70%)` }} />
    </div>
  );
}

/* ---------------------------- Generic dropdown (custom select) ---------------------------- */
function Dropdown({ value, onChange, options, placeholder, renderOption, renderValue, icon: Icon }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2.5 text-start text-sm text-slate-200 transition hover:border-white/20"
      >
        <span className="flex min-w-0 items-center gap-2">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-500" />}
          <span className={`truncate ${selected ? "" : "text-slate-500"}`}>
            {selected ? (renderValue ? renderValue(selected) : selected.label) : placeholder}
          </span>
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
      </button>
      {open && (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/50">
          <div className="max-h-64 overflow-y-auto py-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className="flex w-full items-center justify-between px-4 py-2.5 text-start text-sm text-slate-300 transition hover:bg-white/5"
              >
                <span className="min-w-0 truncate">{renderOption ? renderOption(opt) : opt.label}</span>
                {opt.value === value && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: BRAND_CYAN }} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------- Language switcher ---------------------------- */
function LanguageSwitcher({ locale, onChange, markets = MARKETS }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = markets.find((m) => m.locale === locale) || markets[0];
  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/10">
        <Globe2 className="h-4 w-4" style={{ color: BRAND_CYAN }} />
        <span className="hidden sm:inline">{current.label}</span>
        <span className="sm:hidden">{current.code}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute end-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/50">
          <div className="max-h-72 overflow-y-auto py-1">
            {markets.map((m) => (
              <button key={m.code} onClick={() => { onChange(m); setOpen(false); }}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-start text-sm transition hover:bg-white/5 ${m.code === current.code ? "text-cyan-300" : "text-slate-300"}`}>
                <span>{m.label}</span>
                {m.code === current.code && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: BRAND_CYAN }} />}
              </button>
            ))}
          </div>
          <div className="border-t border-white/10 px-4 py-2 text-[11px] text-slate-500">100+ markets · synced from /api/markets</div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------- Header ---------------------------- */
function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `linear-gradient(135deg, ${BRAND_CYAN}, ${BRAND_VIOLET})` }}>
        <span className="text-sm font-bold text-slate-950" style={{ fontFamily: "'Sora', sans-serif" }}>R</span>
      </div>
      <span className={`text-lg font-semibold tracking-tight text-white ${compact ? "hidden sm:inline" : ""}`} style={{ fontFamily: "'Sora', sans-serif" }}>
        ROYAL COMMAND
      </span>
    </div>
  );
}

function Header({ t, locale, onLocaleChange, onToggleSidebar, userName = "Harry Park" }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-slate-950/70 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10 lg:hidden" aria-label={t.collapse}>
          <Menu className="h-4 w-4" />
        </button>
        <Logo compact />
      </div>
      <div className="hidden max-w-md flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 md:flex">
        <Search className="h-4 w-4 text-slate-500" />
        <input type="text" placeholder={t.search} className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none" />
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <LanguageSwitcher locale={locale} onChange={onLocaleChange} />
        <button className="relative rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10">
          <Bell className="h-4 w-4" />
          <span className="absolute -end-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-slate-950" style={{ backgroundColor: BRAND_CYAN }} />
        </button>
        <button className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 py-1.5 ps-1.5 pe-3 hover:bg-white/10">
          <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-slate-950" style={{ background: `linear-gradient(135deg, ${BRAND_CYAN}, ${BRAND_VIOLET})` }}>
            {userName.slice(0, 1)}
          </span>
          <span className="hidden text-sm text-slate-200 sm:inline">{userName}</span>
        </button>
      </div>
    </header>
  );
}

/* ---------------------------- Login screen ---------------------------- */
function LoginScreen({ t, locale, onLocaleChange, onSubmit }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ email, password });
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0" style={{
        background: "radial-gradient(60% 50% at 50% 0%, rgba(139,92,246,0.14), transparent 60%), radial-gradient(40% 40% at 85% 90%, rgba(0,240,255,0.08), transparent 60%)",
      }} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }} />
      <div className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
        <Logo />
        <LanguageSwitcher locale={locale} onChange={onLocaleChange} />
      </div>
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16">
        <div className="relative mb-6 flex h-40 w-full items-center justify-center sm:h-52">
          <Orbit size={280} nodeCount={48} />
          <p className="relative text-center text-xs font-medium tracking-[0.3em] text-slate-500">GLOBAL AI OPERATING PLATFORM</p>
        </div>
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl" style={{ fontFamily: "'Sora', sans-serif" }}>{t.tagline1}</h1>
          <p className="mt-1.5 text-base text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(90deg, ${BRAND_CYAN}, ${BRAND_VIOLET})` }}>{t.tagline2}</p>
        </div>
        <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-8">
          <label className="mb-1.5 block text-xs font-medium text-slate-400">{t.email}</label>
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2.5 focus-within:border-cyan-400/50">
            <Mail className="h-4 w-4 shrink-0 text-slate-500" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent text-sm text-slate-200 outline-none" placeholder="you@company.com" />
          </div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">{t.password}</label>
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2.5 focus-within:border-cyan-400/50">
            <Lock className="h-4 w-4 shrink-0 text-slate-500" />
            <input type={showPw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-transparent text-sm text-slate-200 outline-none" placeholder="••••••••" />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="shrink-0 text-slate-500 hover:text-slate-300">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="mb-6 flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-slate-400">
              <input type="checkbox" className="h-3.5 w-3.5 rounded border-white/20 bg-transparent accent-cyan-400" />
              {t.remember}
            </label>
            <button type="button" className="text-slate-400 hover:text-cyan-300">{t.forgot}</button>
          </div>
          <button type="submit" className="w-full rounded-lg py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110 active:brightness-95"
            style={{ background: `linear-gradient(90deg, ${BRAND_CYAN}, ${BRAND_VIOLET})` }}>
            {t.signIn}
          </button>
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] text-slate-500">{t.orContinue}</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["Google", "Microsoft", "Apple"].map((p) => (
              <button key={p} type="button" className="rounded-lg border border-white/10 bg-white/[0.03] py-2 text-[11px] text-slate-300 transition hover:bg-white/[0.08]">{p}</button>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">
            {t.noAccount} <button type="button" className="font-medium text-cyan-300 hover:underline">{t.createAccount}</button>
          </p>
        </form>
      </main>
    </div>
  );
}

/* ---------------------------- Sidebar ---------------------------- */
function Sidebar({ t, locale, active, onSelect, collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const content = (
    <nav className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-4">
        {!collapsed && <span className="text-xs font-semibold tracking-widest text-slate-500">SERVICES</span>}
        <button onClick={onToggleCollapse} className="hidden rounded-md border border-white/10 bg-white/5 p-1.5 text-slate-400 hover:bg-white/10 lg:flex" aria-label={t.collapse}>
          <ChevronRight className={`h-3.5 w-3.5 transition ${collapsed ? "" : "rotate-180"}`} />
        </button>
        <button onClick={onCloseMobile} className="rounded-md border border-white/10 bg-white/5 p-1.5 text-slate-400 lg:hidden">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
        {SERVICES.map((s) => {
          const Icon = s.icon;
          const isActive = s.key === active;
          const label = s.label[locale] || s.label.en;
          return (
            <button key={s.key} onClick={() => onSelect(s.key)} title={collapsed ? label : undefined}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${isActive ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}
              style={isActive ? { boxShadow: `inset 2px 0 0 0 ${BRAND_CYAN}` } : undefined}>
              <Icon className="h-4 w-4 shrink-0" style={{ color: isActive ? BRAND_CYAN : undefined }} />
              {!collapsed && <span className="truncate">{label}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
  return (
    <>
      <aside className={`hidden shrink-0 border-e border-white/10 bg-slate-950/60 backdrop-blur-xl transition-all duration-200 lg:block ${collapsed ? "w-[76px]" : "w-64"}`}>
        {content}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={onCloseMobile} />
          <aside className="absolute inset-y-0 start-0 w-72 border-e border-white/10 bg-slate-950/95 backdrop-blur-xl">{content}</aside>
        </div>
      )}
    </>
  );
}

/* ---------------------------- Shared panel wrapper ---------------------------- */
function Panel({ title, subtitle, children, icon: Icon }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
            <Icon className="h-4 w-4" style={{ color: BRAND_CYAN }} />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-xs font-medium text-slate-400">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

/* ---------------------------- Overview content ---------------------------- */
function OverviewContent({ t, locale, userName }) {
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white sm:text-2xl" style={{ fontFamily: "'Sora', sans-serif" }}>
            {t.welcome}, {userName.split(" ")[0]}
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">{t.overview}</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
          <Orbit compact />
          <span className="text-xs text-slate-400">100 {locale === "ko" ? "개국 실시간 연결" : "markets live"}</span>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPI_DATA.map((k) => (
          <div key={k.key} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
            <p className="text-xs text-slate-400">{k.label[locale] || k.label.en}</p>
            <div className="mt-2 flex items-end justify-between">
              <span className="text-2xl font-semibold text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{k.value}</span>
              <span className={`flex items-center gap-0.5 text-xs font-medium ${k.up ? "text-emerald-400" : "text-rose-400"}`}>
                {k.up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {k.delta}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Orbit compact />
            <h2 className="text-sm font-semibold text-slate-200">{t.liveReport}</h2>
          </div>
          <button className="text-xs font-medium text-cyan-300 hover:underline">{t.viewAll}</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                <th className="px-5 py-3 text-start font-medium">ID</th>
                <th className="px-5 py-3 text-start font-medium">{locale === "ko" ? "서비스" : "Service"}</th>
                <th className="px-5 py-3 text-start font-medium">{locale === "ko" ? "국가" : "Market"}</th>
                <th className="px-5 py-3 text-start font-medium">{locale === "ko" ? "상태" : "Status"}</th>
                <th className="px-5 py-3 text-start font-medium">{locale === "ko" ? "처리시간" : "Duration"}</th>
              </tr>
            </thead>
            <tbody>
              {LIVE_ROWS.map((row) => {
                const st = STATUS_STYLE[row.status];
                return (
                  <tr key={row.id} className="border-t border-white/5 text-slate-300">
                    <td className="px-5 py-3 font-mono text-xs text-slate-400">{row.id}</td>
                    <td className="px-5 py-3">{row.service[locale] || row.service.en}</td>
                    <td className="px-5 py-3 text-slate-400">{row.market}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs ${st.text}`}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: st.dot }} />
                        {st.label[locale] || st.label.en}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-400">{row.time}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ---------------------------- Form 1: Sign up / Profile ---------------------------- */
function ProfileForm({ t, locale, onSubmit }) {
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("KR");
  const [phone, setPhone] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  const countryOptions = MARKETS.map((m) => ({ value: m.code, label: m.label, dial: m.dial }));
  const country = MARKETS.find((m) => m.code === countryCode);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ name, country: countryCode, phone: `${country?.dial || ""} ${phone}`.trim() });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2200);
  }

  return (
    <Panel title={t.profileTitle} subtitle={t.profileSub} icon={UserCircle2}>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        <Field label={t.fullName}>
          <input
            type="text" required value={name} onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-400/50"
            placeholder={locale === "ko" ? "박해리" : "Harry Park"}
          />
        </Field>

        <Field label={t.country}>
          <Dropdown
            value={countryCode}
            onChange={setCountryCode}
            options={countryOptions}
            placeholder={t.selectPlaceholder}
            icon={Globe2}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label={t.phone} hint={t.phoneHint}>
            <div className="flex items-stretch gap-2">
              <span className="flex items-center rounded-lg border border-white/10 bg-slate-950/40 px-3 text-sm text-slate-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {country?.dial || "+--"}
              </span>
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2.5 focus-within:border-cyan-400/50">
                <Phone className="h-4 w-4 shrink-0 text-slate-500" />
                <input
                  type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-200 outline-none"
                  placeholder="10 2345 6789"
                />
              </div>
              <button type="button" className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-4 text-xs font-medium text-slate-300 hover:bg-white/10">
                {t.sendCode}
              </button>
            </div>
          </Field>
        </div>

        <div className="sm:col-span-2 mt-1 flex items-center gap-3">
          <button type="submit" className="rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110"
            style={{ background: `linear-gradient(90deg, ${BRAND_CYAN}, ${BRAND_VIOLET})` }}>
            {t.save}
          </button>
          {savedFlash && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-300">
              <Check className="h-3.5 w-3.5" /> {t.saved}
            </span>
          )}
        </div>
      </form>
    </Panel>
  );
}

/* ---------------------------- Form 2: AI Voice / Call control ---------------------------- */
function VoiceControlForm({ t, locale, onTestCall }) {
  const [agentId, setAgentId] = useState(VOICE_AGENTS[0].id);
  const [scenario, setScenario] = useState("");
  const [callState, setCallState] = useState("idle"); // idle | connecting | active
  const [log, setLog] = useState([]);

  const agentOptions = VOICE_AGENTS.map((a) => ({ value: a.id, label: a.name, agent: a }));

  function pushLog(entry) {
    setLog((prev) => [{ time: new Date().toLocaleTimeString(locale === "ko" ? "ko-KR" : "en-US", { hour12: false }), entry }, ...prev].slice(0, 6));
  }

  function handleTestCall() {
    if (callState === "active") {
      setCallState("idle");
      pushLog(locale === "ko" ? "통화 종료됨" : "Call ended");
      return;
    }
    setCallState("connecting");
    pushLog(`${locale === "ko" ? "통화 연결 시도" : "Placing call"} · ${VOICE_AGENTS.find((a) => a.id === agentId)?.name}`);
    onTestCall({ agentId, scenario });
    setTimeout(() => {
      setCallState("active");
      pushLog(locale === "ko" ? "통화 연결됨 — 시나리오 재생 중" : "Call connected — running scenario");
    }, 1400);
  }

  return (
    <Panel title={t.voiceTitle} subtitle={t.voiceSub} icon={Mic}>
      <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-2">
        <Field label={t.agent}>
          <Dropdown
            value={agentId}
            onChange={setAgentId}
            options={agentOptions}
            renderOption={(opt) => (
              <span className="flex flex-col">
                <span className="text-slate-200">{opt.agent.name}</span>
                <span className="text-[11px] text-slate-500">{opt.agent.lang} · {opt.agent.tone[locale] || opt.agent.tone.en}</span>
              </span>
            )}
            icon={Mic}
          />
        </Field>

        <Field label={locale === "ko" ? "언어 / 톤" : "Language / Tone"}>
          <div className="flex h-[42px] items-center gap-2 rounded-lg border border-white/10 bg-slate-950/40 px-3 text-xs text-slate-400">
            {(() => {
              const a = VOICE_AGENTS.find((x) => x.id === agentId);
              return a ? `${a.lang} · ${a.tone[locale] || a.tone.en}` : "—";
            })()}
          </div>
        </Field>

        <div className="lg:col-span-2">
          <Field label={t.scenario}>
            <textarea
              rows={4} value={scenario} onChange={(e) => setScenario(e.target.value)}
              className="w-full resize-none rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-400/50"
              placeholder={t.scenarioPh}
            />
          </Field>
        </div>

        <div className="lg:col-span-2 mb-5 flex flex-wrap items-center gap-3">
          <button
            type="button" onClick={handleTestCall}
            className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
              callState === "active" ? "bg-rose-500/90 text-white hover:brightness-110" : "text-slate-950 hover:brightness-110"
            }`}
            style={callState === "active" ? undefined : { background: `linear-gradient(90deg, ${BRAND_CYAN}, ${BRAND_VIOLET})` }}
          >
            {callState === "connecting" && <Loader2 className="h-4 w-4 animate-spin" />}
            {callState === "idle" && <Play className="h-4 w-4" />}
            {callState === "active" && <Square className="h-4 w-4" />}
            {callState === "connecting" ? t.calling : callState === "active" ? t.endCall : t.testCall}
          </button>
          {callState === "active" && (
            <span className="flex items-center gap-1.5 text-xs text-cyan-300">
              <Orbit compact /> {t.callActive}
            </span>
          )}
        </div>

        <div className="lg:col-span-2 rounded-lg border border-white/10 bg-slate-950/30 p-3">
          <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500">{t.callLog}</p>
          {log.length === 0 ? (
            <p className="text-xs text-slate-600">—</p>
          ) : (
            <ul className="space-y-1.5">
              {log.map((l, i) => (
                <li key={i} className="flex gap-3 text-xs text-slate-400">
                  <span className="shrink-0 font-mono text-slate-600">{l.time}</span>
                  <span>{l.entry}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  );
}

/* ---------------------------- Form 3: Common service request ---------------------------- */
function ServiceRequestForm({ t, locale, service, onSubmit }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(service?.key || SERVICES[2].key);
  const [details, setDetails] = useState("");
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [submittedFlash, setSubmittedFlash] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (service?.key) setCategory(service.key);
  }, [service?.key]);

  const categoryOptions = SERVICES.filter((s) => s.kind === "request").map((s) => ({ value: s.key, label: s.label[locale] || s.label.en, icon: s.icon }));

  function addFiles(fileList) {
    const arr = Array.from(fileList).map((f) => ({ name: f.name, size: f.size }));
    setFiles((prev) => [...prev, ...arr]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ title, category, details, files });
    setSubmittedFlash(true);
    setTimeout(() => setSubmittedFlash(false), 2200);
  }

  const currentLabel = SERVICES.find((s) => s.key === category)?.label;

  return (
    <Panel
      title={`${t.serviceTitle} — ${currentLabel ? (currentLabel[locale] || currentLabel.en) : ""}`}
      subtitle={t.serviceSub}
      icon={FileText}
    >
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label={t.reqTitle}>
            <input
              type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-400/50"
              placeholder={locale === "ko" ? "요청 제목을 입력하세요" : "Enter a request title"}
            />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label={t.category}>
            <Dropdown
              value={category}
              onChange={setCategory}
              options={categoryOptions}
              placeholder={t.selectPlaceholder}
              renderOption={(opt) => {
                const Icon = opt.icon;
                return (
                  <span className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-slate-500" /> {opt.label}
                  </span>
                );
              }}
              renderValue={(opt) => {
                const Icon = opt.icon;
                return (
                  <span className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" style={{ color: BRAND_CYAN }} /> {opt.label}
                  </span>
                );
              }}
            />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label={t.details}>
            <textarea
              rows={5} required value={details} onChange={(e) => setDetails(e.target.value)}
              className="w-full resize-none rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-400/50"
              placeholder={t.detailsPh}
            />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label={t.attach}>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition ${
                dragOver ? "border-cyan-400/60 bg-cyan-400/5" : "border-white/15 bg-slate-950/30 hover:bg-slate-950/50"
              }`}
            >
              <UploadCloud className="h-5 w-5 text-slate-500" />
              <p className="text-xs text-slate-400">{t.attachHint}</p>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
            </div>
            {files.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-xs text-slate-300">
                    <span className="flex min-w-0 items-center gap-2">
                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                      <span className="truncate">{f.name}</span>
                    </span>
                    <button type="button" onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} className="shrink-0 text-slate-500 hover:text-rose-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Field>
        </div>

        <div className="sm:col-span-2 mt-1 flex items-center gap-3">
          <button type="submit" className="rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110"
            style={{ background: `linear-gradient(90deg, ${BRAND_CYAN}, ${BRAND_VIOLET})` }}>
            {t.submit}
          </button>
          {submittedFlash && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-300">
              <Check className="h-3.5 w-3.5" /> {t.submitted}
            </span>
          )}
        </div>
      </form>
    </Panel>
  );
}

/* ---------------------------- Dashboard ---------------------------- */
function Dashboard({ t, locale, userName, onLocaleChange, onSignOut }) {
  const [active, setActive] = useState("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeService = SERVICES.find((s) => s.key === active);

  function renderContent() {
    if (!activeService || activeService.kind === "overview") {
      return <OverviewContent t={t} locale={locale} userName={userName} />;
    }
    if (activeService.kind === "profile") {
      return <ProfileForm t={t} locale={locale} onSubmit={(payload) => console.log("onProfileSubmit ->", payload)} />;
    }
    if (activeService.kind === "voice") {
      return <VoiceControlForm t={t} locale={locale} onTestCall={(payload) => console.log("onVoiceTestCall ->", payload)} />;
    }
    return (
      <ServiceRequestForm
        t={t}
        locale={locale}
        service={activeService}
        onSubmit={(payload) => console.log("onServiceSubmit ->", payload)}
      />
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-950">
      <Header t={t} locale={locale} onLocaleChange={onLocaleChange} onToggleSidebar={() => setMobileOpen(true)} userName={userName} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          t={t} locale={locale} active={active}
          onSelect={(key) => { setActive(key); setMobileOpen(false); }}
          collapsed={collapsed} onToggleCollapse={() => setCollapsed((v) => !v)}
          mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)}
        />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          {renderContent()}
          <button onClick={onSignOut} className="mt-6 text-xs text-slate-500 hover:text-slate-300">{t.signOut}</button>
        </main>
      </div>
    </div>
  );
}

/* ---------------------------- Root shell ---------------------------- */
export default function RoyalCommandIntegrated() {
  const [locale, setLocale] = useState("ko");
  const [screen, setScreen] = useState("login"); // 'login' | 'dashboard'
  const [userName, setUserName] = useState("Harry Park");
  const t = I18N[locale] || I18N.en;

  function handleLocaleChange(market) { setLocale(market.locale); }

  function handleLogin({ email }) {
    if (email) setUserName(email.split("@")[0]);
    setScreen("dashboard");
  }

  function handleSignOut() { setScreen("login"); }

  return (
    <div dir={t.dir} style={{ fontFamily: "'Inter', sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Sora:wght@600;700;800&family=JetBrains+Mono:wght@500;600&display=swap');
      `}</style>
      {screen === "login" ? (
        <LoginScreen t={t} locale={locale} onLocaleChange={handleLocaleChange} onSubmit={handleLogin} />
      ) : (
        <Dashboard t={t} locale={locale} userName={userName} onLocaleChange={handleLocaleChange} onSignOut={handleSignOut} />
      )}
    </div>
  );
}
