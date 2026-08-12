import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Globe2, Search, Bell, ChevronDown, ChevronRight, Menu, X,
  Scale, Calculator, Mic, Truck, Building2, Users, ShieldCheck,
  Stethoscope, Landmark, Wrench, Boxes, Plane, HeartHandshake,
  MessageSquare, BarChart3, Settings, LayoutGrid, Radio, PhoneCall,
  FileText, Sparkles, Lock, Mail, Eye, EyeOff, ArrowUpRight, ArrowDownRight,
  Loader2,
} from "lucide-react";

/* ------------------------------------------------------------------
   ROYAL COMMAND — GLOBAL UI SHELL (Backend Integrated)
------------------------------------------------------------------- */
const BRAND_CYAN = "#00F0FF";
const BRAND_VIOLET = "#8B5CF6";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api"; // 환경변수로 쉽게 교체

/* ---------------------------- i18n layer ---------------------------- */
const I18N = {
  ko: {
    dir: "ltr",
    tagline1: "COMMAND YOUR DOMAIN",
    tagline2: "지구에서 우주까지",
    signIn: "로그인",
    email: "이메일",
    password: "비밀번호",
    remember: "로그인 상태 유지",
    forgot: "비밀번호를 잊으셨나요?",
    orContinue: "다른 방법으로 계속하기",
    noAccount: "계정이 없으신가요?",
    createAccount: "계정 생성",
    search: "서비스, 고객, 명령 검색…",
    welcome: "환영합니다",
    overview: "오늘의 운영 현황입니다.",
    liveReport: "실시간 AI 주문 · 상담 리포트",
    viewAll: "전체 보기",
    collapse: "메뉴 접기",
    signOut: "로그아웃",
    loading: "로딩 중…",
    loginError: "이메일 또는 비밀번호가 올바르지 않습니다.",
    networkError: "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
  },
  en: {
    dir: "ltr",
    tagline1: "COMMAND YOUR DOMAIN",
    tagline2: "From Earth to space",
    signIn: "Sign In",
    email: "Email",
    password: "Password",
    remember: "Keep me signed in",
    forgot: "Forgot password?",
    orContinue: "Or continue with",
    noAccount: "Don't have an account?",
    createAccount: "Create account",
    search: "Search services, customers, commands…",
    welcome: "Welcome back",
    overview: "Here's what's operating today.",
    liveReport: "Live AI Order & Consultation Report",
    viewAll: "View all",
    collapse: "Collapse menu",
    signOut: "Sign out",
    loading: "Loading…",
    loginError: "Invalid email or password.",
    networkError: "Unable to connect to the server. Please try again later.",
  },
  es: {
    dir: "ltr",
    tagline1: "COMANDA TU DOMINIO",
    tagline2: "De la Tierra al espacio",
    signIn: "Iniciar sesión",
    email: "Correo electrónico",
    password: "Contraseña",
    remember: "Mantener sesión iniciada",
    forgot: "¿Olvidaste tu contraseña?",
    orContinue: "O continuar con",
    noAccount: "¿No tienes una cuenta?",
    createAccount: "Crear cuenta",
    search: "Buscar servicios, clientes, comandos…",
    welcome: "Bienvenido de nuevo",
    overview: "Esto es lo que opera hoy.",
    liveReport: "Informe en vivo de pedidos IA y consultas",
    viewAll: "Ver todo",
    collapse: "Contraer menú",
    signOut: "Cerrar sesión",
    loading: "Cargando…",
    loginError: "Correo o contraseña incorrectos.",
    networkError: "No se puede conectar al servidor. Inténtalo de nuevo más tarde.",
  },
  ar: {
    dir: "rtl",
    tagline1: "قُد نطاقك",
    tagline2: "من الأرض إلى الفضاء",
    signIn: "تسجيل الدخول",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    remember: "إبقائي مسجّلاً للدخول",
    forgot: "هل نسيت كلمة المرور؟",
    orContinue: "أو المتابعة عبر",
    noAccount: "ليس لديك حساب؟",
    createAccount: "إنشاء حساب",
    search: "ابحث عن الخدمات والعملاء والأوامر…",
    welcome: "مرحبًا بعودتك",
    overview: "إليك ما يعمل اليوم.",
    liveReport: "تقرير مباشر لطلبات واستشارات الذكاء الاصطناعي",
    viewAll: "عرض الكل",
    collapse: "طيّ القائمة",
    signOut: "تسجيل الخروج",
    loading: "جارٍ التحميل…",
    loginError: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    networkError: "تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى لاحقًا.",
  },
};

/* ---------------------------- Services (static for now) ---------------------------- */
const SERVICES = [
  { key: "overview", label: { ko: "대시보드", en: "Dashboard" }, icon: LayoutGrid },
  { key: "legal", label: { ko: "법률", en: "Legal" }, icon: Scale },
  { key: "accounting", label: { ko: "회계", en: "Accounting" }, icon: Calculator },
  { key: "ai_voice", label: { ko: "AI 보이스", en: "AI Voice" }, icon: Mic },
  { key: "delivery", label: { ko: "배송", en: "Delivery" }, icon: Truck },
  { key: "real_estate", label: { ko: "부동산", en: "Real Estate" }, icon: Building2 },
  { key: "hr", label: { ko: "인사관리", en: "HR & Payroll" }, icon: Users },
  { key: "compliance", label: { ko: "컴플라이언스", en: "Compliance" }, icon: ShieldCheck },
  { key: "health", label: { ko: "헬스케어", en: "Healthcare" }, icon: Stethoscope },
  { key: "finance", label: { ko: "금융", en: "Finance" }, icon: Landmark },
  { key: "maintenance", label: { ko: "시설관리", en: "Maintenance" }, icon: Wrench },
  { key: "inventory", label: { ko: "재고관리", en: "Inventory" }, icon: Boxes },
  { key: "travel", label: { ko: "출장/여행", en: "Travel" }, icon: Plane },
  { key: "concierge", label: { ko: "컨시어지", en: "Concierge" }, icon: HeartHandshake },
  { key: "support", label: { ko: "고객상담", en: "Support" }, icon: MessageSquare },
  { key: "analytics", label: { ko: "분석", en: "Analytics" }, icon: BarChart3 },
  { key: "dispatch", label: { ko: "AI 디스패치", en: "AI Dispatch" }, icon: Radio },
  { key: "call_center", label: { ko: "콜센터", en: "Call Center" }, icon: PhoneCall },
  { key: "contracts", label: { ko: "계약관리", en: "Contracts" }, icon: FileText },
  { key: "automation", label: { ko: "자동화", en: "Automation" }, icon: Sparkles },
  { key: "settings", label: { ko: "설정", en: "Settings" }, icon: Settings },
];

const STATUS_STYLE = {
  resolved: { dot: "#34D399", text: "text-emerald-300", label: { ko: "완료", en: "Resolved" } },
  in_progress: { dot: BRAND_CYAN, text: "text-cyan-300", label: { ko: "진행중", en: "In progress" } },
  queued: { dot: "#94A3B8", text: "text-slate-400", label: { ko: "대기", en: "Queued" } },
};

/* ---------------------------- API Helpers ---------------------------- */
async function apiFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("rc_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    localStorage.removeItem("rc_token");
    localStorage.removeItem("rc_user");
    window.location.reload(); // 강제 로그아웃
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  return res.json();
}

/* ---------------------------- The Orbit ---------------------------- */
function Orbit({ size = 340, nodeCount = 48, compact = false }) {
  const nodes = useMemo(
    () => Array.from({ length: nodeCount }, (_, i) => i),
    [nodeCount]
  );
  if (compact) {
    return (
      <span className="relative inline-flex h-2.5 w-2.5">
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
          style={{ backgroundColor: BRAND_CYAN }}
        />
        <span
          className="relative inline-flex h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: BRAND_CYAN }}
        />
      </span>
    );
  }
  return (
    <div
      className="pointer-events-none absolute inset-0 mx-auto flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 rounded-full border border-white/10" />
      <div className="absolute inset-8 rounded-full border border-white/[0.08]" />
      <div className="absolute inset-16 rounded-full border border-white/[0.06]" />
      <div
        className="absolute inset-0 animate-[spin_36s_linear_infinite] rounded-full"
        style={{ width: size, height: size }}
      >
        {nodes.map((i) => {
          const angle = (i / nodeCount) * 2 * Math.PI;
          const r = size / 2;
          const x = r + r * Math.cos(angle);
          const y = r + r * Math.sin(angle);
          const isKey = i % 6 === 0;
          return (
            <span
              key={i}
              className="absolute rounded-full"
              style={{
                left: x,
                top: y,
                width: isKey ? 5 : 2.5,
                height: isKey ? 5 : 2.5,
                transform: "translate(-50%,-50%)",
                backgroundColor: isKey ? BRAND_CYAN : "rgba(148,163,184,0.5)",
                boxShadow: isKey ? `0 0 8px ${BRAND_CYAN}` : "none",
              }}
            />
          );
        })}
      </div>
      <div
        className="absolute h-24 w-24 animate-[spin_28s_linear_infinite_reverse] rounded-full blur-2xl opacity-30"
        style={{ background: `radial-gradient(circle, ${BRAND_VIOLET}, transparent 70%)` }}
      />
    </div>
  );
}

/* ---------------------------- Language switcher ---------------------------- */
function LanguageSwitcher({ locale, onChange, markets = [] }: any) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = markets.find((m: any) => m.locale === locale) || markets[0] || { code: "KR", label: "대한민국 · 한국어", locale: "ko" };

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/10"
      >
        <Globe2 className="h-4 w-4" style={{ color: BRAND_CYAN }} />
        <span className="hidden sm:inline">{current.label}</span>
        <span className="sm:hidden">{current.code}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute end-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/50">
          <div className="max-h-72 overflow-y-auto py-1">
            {markets.map((m) => (
              <button
                key={m.code}
                onClick={() => {
                  onChange(m);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-start text-sm transition hover:bg-white/5 ${
                  m.code === current.code ? "text-cyan-300" : "text-slate-300"
                }`}
              >
                <span>{m.label}</span>
                {m.code === current.code && (
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: BRAND_CYAN }} />
                )}
              </button>
            ))}
          </div>
          <div className="border-t border-white/10 px-4 py-2 text-[11px] text-slate-500">
            100+ markets · synced from /api/markets
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------- Header ---------------------------- */
function Header({ t, locale, onLocaleChange, onToggleSidebar, showSearch, showMenuButton, userName = "User", markets }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-slate-950/70 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        {showMenuButton && (
          <button
            onClick={onToggleSidebar}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10 lg:hidden"
            aria-label={t.collapse}
          >
            <Menu className="h-4 w-4" />
          </button>
        )}
        <Logo compact />
      </div>
      {showSearch && (
        <div className="hidden max-w-md flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 md:flex">
          <Search className="h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder={t.search}
            className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
          />
        </div>
      )}
      <div className="flex items-center gap-2 sm:gap-3">
        <LanguageSwitcher locale={locale} onChange={onLocaleChange} markets={markets} />
        <button className="relative rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10">
          <Bell className="h-4 w-4" />
          <span
            className="absolute -end-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-slate-950"
            style={{ backgroundColor: BRAND_CYAN }}
          />
        </button>
        <button className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 py-1.5 ps-1.5 pe-3 hover:bg-white/10">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-slate-950"
            style={{ background: `linear-gradient(135deg, ${BRAND_CYAN}, ${BRAND_VIOLET})` }}
          >
            {userName.slice(0, 1).toUpperCase()}
          </span>
          <span className="hidden text-sm text-slate-200 sm:inline">{userName}</span>
        </button>
      </div>
    </header>
  );
}

function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex h-8 w-8 items-center justify-center rounded-lg"
        style={{ background: `linear-gradient(135deg, ${BRAND_CYAN}, ${BRAND_VIOLET})` }}
      >
        <span className="text-sm font-bold text-slate-950" style={{ fontFamily: "'Sora', sans-serif" }}>
          R
        </span>
      </div>
      {!compact && (
        <span className="text-lg font-semibold tracking-tight text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
          ROYAL COMMAND
        </span>
      )}
      {compact && (
        <span className="hidden text-sm font-semibold tracking-wide text-white sm:inline" style={{ fontFamily: "'Sora', sans-serif" }}>
          ROYAL COMMAND
        </span>
      )}
    </div>
  );
}

/* ---------------------------- Login screen ---------------------------- */
function LoginScreen({ t, locale, onLocaleChange, onSubmit, markets, loading, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ email, password });
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-slate-950">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(139,92,246,0.14), transparent 60%), radial-gradient(40% 40% at 85% 90%, rgba(0,240,255,0.08), transparent 60%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }} />
      <div className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
        <Logo />
        <LanguageSwitcher locale={locale} onChange={onLocaleChange} markets={markets} />
      </div>
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16">
        <div className="relative mb-6 flex h-40 w-full items-center justify-center sm:h-52">
          <Orbit size={280} nodeCount={48} />
          <div className="relative text-center">
            <p className="text-xs font-medium tracking-[0.3em] text-slate-500">GLOBAL AI OPERATING PLATFORM</p>
          </div>
        </div>
        <div className="mb-8 text-center">
          <h1
            className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {t.tagline1}
          </h1>
          <p className="mt-1.5 text-base text-transparent bg-clip-text" style={{
            backgroundImage: `linear-gradient(90deg, ${BRAND_CYAN}, ${BRAND_VIOLET})`,
          }}>
            {t.tagline2}
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-8"
        >
          {error && (
            <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {error}
            </div>
          )}
          <label className="mb-1.5 block text-xs font-medium text-slate-400">{t.email}</label>
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2.5 focus-within:border-cyan-400/50">
            <Mail className="h-4 w-4 shrink-0 text-slate-500" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-200 outline-none"
              placeholder="you@company.com"
              disabled={loading}
            />
          </div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">{t.password}</label>
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2.5 focus-within:border-cyan-400/50">
            <Lock className="h-4 w-4 shrink-0 text-slate-500" />
            <input
              type={showPw ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-200 outline-none"
              placeholder="••••••••"
              disabled={loading}
            />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="shrink-0 text-slate-500 hover:text-slate-300">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="mb-6 flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-slate-400">
              <input type="checkbox" className="h-3.5 w-3.5 rounded border-white/20 bg-transparent accent-cyan-400" />
              {t.remember}
            </label>
            <button type="button" className="text-slate-400 hover:text-cyan-300">
              {t.forgot}
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110 active:brightness-95 disabled:opacity-60"
            style={{ background: `linear-gradient(90deg, ${BRAND_CYAN}, ${BRAND_VIOLET})` }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? t.loading : t.signIn}
          </button>
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] text-slate-500">{t.orContinue}</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["Google", "Microsoft", "Apple"].map((p) => (
              <button
                key={p}
                type="button"
                className="rounded-lg border border-white/10 bg-white/[0.03] py-2 text-[11px] text-slate-300 transition hover:bg-white/[0.08]"
              >
                {p}
              </button>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">
            {t.noAccount}{" "}
            <button type="button" className="font-medium text-cyan-300 hover:underline">
              {t.createAccount}
            </button>
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
        <button
          onClick={onToggleCollapse}
          className="hidden rounded-md border border-white/10 bg-white/5 p-1.5 text-slate-400 hover:bg-white/10 lg:flex"
          aria-label={t.collapse}
        >
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
            <button
              key={s.key}
              onClick={() => onSelect(s.key)}
              title={collapsed ? label : undefined}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
              style={isActive ? { boxShadow: `inset 2px 0 0 0 ${BRAND_CYAN}` } : undefined}
            >
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
      <aside
        className={`hidden shrink-0 border-e border-white/10 bg-slate-950/60 backdrop-blur-xl transition-all duration-200 lg:block ${
          collapsed ? "w-[76px]" : "w-64"
        }`}
      >
        {content}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={onCloseMobile} />
          <aside className="absolute inset-y-0 start-0 w-72 border-e border-white/10 bg-slate-950/95 backdrop-blur-xl">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}

/* ---------------------------- Dashboard ---------------------------- */
function Dashboard({ t, locale, userName, onLocaleChange, onSignOut, markets, kpiData, liveRows, loading }) {
  const [active, setActive] = useState("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col bg-slate-950">
      <Header
        t={t}
        locale={locale}
        onLocaleChange={onLocaleChange}
        onToggleSidebar={() => setMobileOpen(true)}
        showSearch
        showMenuButton
        userName={userName}
        markets={markets}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          t={t}
          locale={locale}
          active={active}
          onSelect={(key) => {
            setActive(key);
            setMobileOpen(false);
          }}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
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

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            </div>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {(kpiData || []).map((k) => (
                  <div
                    key={k.key}
                    className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl"
                  >
                    <p className="text-xs text-slate-400">{k.label[locale] || k.label.en}</p>
                    <div className="mt-2 flex items-end justify-between">
                      <span className="text-2xl font-semibold text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {k.value}
                      </span>
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
                      {(liveRows || []).map((row) => {
                        const st = STATUS_STYLE[row.status] || STATUS_STYLE.queued;
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
          )}

          <button
            onClick={onSignOut}
            className="mt-6 text-xs text-slate-500 hover:text-slate-300"
          >
            {t.signOut}
          </button>
        </main>
      </div>
    </div>
  );
}

/* ---------------------------- Root shell ---------------------------- */
export default function RoyalCommandShell() {
  const [locale, setLocale] = useState("ko");
  const [screen, setScreen] = useState<"login" | "dashboard" | "checking">("checking");
  const [userName, setUserName] = useState("User");
  const [markets, setMarkets] = useState([]);
  const [kpiData, setKpiData] = useState([]);
  const [liveRows, setLiveRows] = useState([]);
  const [loginLoading, setLoginLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const t = I18N[locale] || I18N.en;

  // 앱 시작 시 토큰 검사 + 마켓 로드
  useEffect(() => {
    const token = localStorage.getItem("rc_token");
    const savedUser = localStorage.getItem("rc_user");

    // 마켓은 로그인 여부와 관계없이 로드
    apiFetch("/markets")
      .then((data) => setMarkets(data.markets || data))
      .catch(() => {
        // 실패 시 fallback
        setMarkets([
          { code: "KR", label: "대한민국 · 한국어", locale: "ko" },
          { code: "US", label: "United States · English", locale: "en" },
          { code: "GB", label: "United Kingdom · English", locale: "en" },
          { code: "ES", label: "España · Español", locale: "es" },
          { code: "MX", label: "México · Español", locale: "es" },
          { code: "AE", label: "الإمارات · العربية", locale: "ar" },
          { code: "SA", label: "السعودية · العربية", locale: "ar" },
        ]);
      });

    if (token && savedUser) {
      setUserName(savedUser);
      setScreen("dashboard");
      loadDashboard();
    } else {
      setScreen("login");
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    try {
      const data = await apiFetch("/dashboard");
      setKpiData(data.kpis || []);
      setLiveRows(data.liveRows || []);
    } catch (err) {
      console.error("Dashboard load failed:", err);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  function handleLocaleChange(market) {
    setLocale(market.locale);
  }

  async function handleLogin({ email, password }) {
    setLoginLoading(true);
    setLoginError("");
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      // 기대 응답 형태: { accessToken, user: { name, email } }
      localStorage.setItem("rc_token", data.accessToken || data.token);
      const name = data.user?.name || data.user?.email?.split("@")[0] || email.split("@")[0];
      localStorage.setItem("rc_user", name);
      setUserName(name);
      setScreen("dashboard");
      loadDashboard();
    } catch (err: any) {
      setLoginError(err.message?.includes("401") || err.message?.includes("Invalid") ? t.loginError : t.networkError);
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // 서버 로그아웃 실패해도 클라이언트는 정리
    }
    localStorage.removeItem("rc_token");
    localStorage.removeItem("rc_user");
    setScreen("login");
    setKpiData([]);
    setLiveRows([]);
  }

  if (screen === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div dir={t.dir} className="font-sans" style={{ fontFamily: "'Inter', sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Sora:wght@600;700;800&family=JetBrains+Mono:wght@500;600&display=swap');
      `}</style>
      {screen === "login" ? (
        <LoginScreen
          t={t}
          locale={locale}
          onLocaleChange={handleLocaleChange}
          onSubmit={handleLogin}
          markets={markets}
          loading={loginLoading}
          error={loginError}
        />
      ) : (
        <Dashboard
          t={t}
          locale={locale}
          userName={userName}
          onLocaleChange={handleLocaleChange}
          onSignOut={handleSignOut}
          markets={markets}
          kpiData={kpiData}
          liveRows={liveRows}
          loading={dashboardLoading}
        />
      )}
    </div>
  );
}
