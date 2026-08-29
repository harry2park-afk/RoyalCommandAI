"use client";

import { useMemo, useState } from "react";
import {
  BASIC_ROOM_MONTHLY_AUD,
  BASIC_TRIAL_DAYS,
  CATALOG,
  CREATE_ROOM_FORM_VERSION,
  PROMOTION_PERCENT,
  type CatalogItem,
} from "@/lib/rooms/universal-create-room-config";
import {
  CREATE_ROOM_COUNTRIES,
  CREATE_ROOM_LANGUAGES,
  createRoomCopy,
  type CreateRoomLocale,
} from "@/lib/rooms/create-room-i18n";

type Props = {
  initialLocale?: string;
  initialRoomName?: string;
  initialCountryCode?: string;
};

function normaliseLocale(value?: string): CreateRoomLocale {
  const code = (value || "en").toLowerCase();
  if (code.startsWith("ko")) return "ko";
  if (code.startsWith("ja")) return "ja";
  if (code.startsWith("zh")) return "zh";
  if (code.startsWith("vi")) return "vi";
  if (code.startsWith("id")) return "id";
  if (code.startsWith("th")) return "th";
  if (code.startsWith("hi")) return "hi";
  return "en";
}

function validCountry(value?: string) {
  return CREATE_ROOM_COUNTRIES.some((item) => item.code === value) ? value! : "AU";
}

function money(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: value % 1 ? 2 : 0,
  }).format(value);
}

function categoryLabel(category: CatalogItem["category"], locale: CreateRoomLocale) {
  if (locale === "ko") {
    return ({
      ai: "AI 연결",
      secretary: "AI 비서",
      communication: "전화 · SMS · 이메일 · 통역",
      professional: "전문가 연결",
      accounting: "회계 소프트웨어 연결",
      legal: "법률 소프트웨어 연결",
      files: "파일 · 프로젝트 정리",
      education: "교육 · 학습",
      business: "업무 도구",
      mail: "우편 서비스",
      website: "웹사이트 제작",
      maintenance: "웹사이트 관리",
    } as const)[category];
  }
  return ({
    ai: "AI Connections",
    secretary: "AI Secretary",
    communication: "Phone · SMS · Email · Translation",
    professional: "Professional Connections",
    accounting: "Accounting Software Connections",
    legal: "Legal Software Connections",
    files: "Files · Projects",
    education: "Education · Learning",
    business: "Business Tools",
    mail: "Mail Service",
    website: "Website Production",
    maintenance: "Website Management",
  } as const)[category];
}

export default function CreateRoomPremiumWizard({ initialLocale, initialRoomName, initialCountryCode }: Props) {
  const [locale, setLocale] = useState<CreateRoomLocale>(normaliseLocale(initialLocale));
  const [countryCode, setCountryCode] = useState(validCountry(initialCountryCode));
  const [selected, setSelected] = useState<string[]>([]);
  const [promotion, setPromotion] = useState(true);
  const [agreement, setAgreement] = useState(false);
  const [purchaseReview, setPurchaseReview] = useState(false);

  const t = createRoomCopy(locale);
  const isKorean = locale === "ko";
  const selectedItems = useMemo(() => CATALOG.filter((item) => selected.includes(item.id)), [selected]);
  const monthlyKnown = BASIC_ROOM_MONTHLY_AUD + selectedItems.reduce((sum, item) => sum + (item.billing === "monthly" ? item.priceAud || 0 : 0), 0);
  const oneTimeKnown = selectedItems.reduce((sum, item) => sum + (item.billing === "one_time" ? item.priceAud || 0 : 0), 0);
  const discount = promotion ? monthlyKnown * (PROMOTION_PERCENT / 100) : 0;
  const monthlyTotal = Math.max(0, monthlyKnown - discount);
  const unconfirmed = selectedItems.some((item) => item.priceAud == null && item.billing !== "included");

  const categories = ["ai", "secretary", "communication", "professional", "accounting", "legal", "files", "education", "business", "mail", "website", "maintenance"] as CatalogItem["category"][];

  function toggle(id: string) {
    const item = CATALOG.find((entry) => entry.id === id);
    if (!item) return;
    setSelected((current) => {
      const adding = !current.includes(id);
      let next = adding ? [...current, id] : current.filter((entry) => entry !== id);
      if (adding && item.exclusiveGroup) {
        next = next.filter((entry) => {
          const candidate = CATALOG.find((catalogItem) => catalogItem.id === entry);
          return !candidate || candidate.exclusiveGroup !== item.exclusiveGroup || entry === id;
        });
      }
      return next;
    });
  }

  function priceText(item: CatalogItem) {
    if (item.billing === "included") return item.priceLabel || "Included";
    if (item.priceLabel) return item.priceLabel;
    if (item.priceAud == null) return "Price to confirm";
    if (item.billing === "monthly") return `${money(item.priceAud)}/month`;
    return `From ${money(item.priceAud)}`;
  }

  function speakGuide() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const text = isKorean
      ? "이 화면은 로열 커맨드 룸에 연결할 수 있는 전체 도구를 배우고 선택하는 곳입니다. 챗지피티, 클로드, 제미나이, 그록 같은 인공지능을 연결할 수 있습니다. 회계는 제로, 마이옵, 퀵북스, 레콘 같은 프로그램 연결 옵션이 있고, 법률은 립과 로커넥트, 스모크볼, 클리오, 액션스텝 같은 시스템 연결 옵션을 확인할 수 있습니다. 클라우드 폰은 기본 전화번호, 알림 서비스, 인공지능 전화 비서, 회사와 전문가용 업무 전화 등 단계가 다릅니다. 파일 정리, 교육, 전문가 협업, 이메일, 캘린더와 다른 업무 도구도 선택할 수 있습니다. 무료 또는 기본 포함 기능과 유료 기능을 구분해서 보여주며, 가격이 확정되지 않은 연결은 결제 전에 반드시 확인합니다."
      : "This screen is where you learn about and choose the tools that can connect to a Royal Command Room. You can connect AI services such as ChatGPT, Claude, Gemini and Grok. Accounting connection options include Xero, MYOB, QuickBooks and Reckon. Legal connection options include LEAP and LawConnect, Smokeball, Clio and Actionstep. Cloud Phone has different tiers including a basic number, notifications, an AI phone secretary, and business or professional phone workflows. You can also select file organisation, education, professional collaboration, email, calendars and other business tools. Included and paid features are shown separately, and any unconfirmed connection price must be reviewed before payment.";
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = isKorean ? "ko-KR" : "en-AU";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(200,163,76,.12),transparent_35%),var(--background)] px-4 py-7 text-[var(--foreground)] md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[28px] border border-[var(--gold)]/35 bg-black/25 p-5 shadow-[0_28px_90px_rgba(0,0,0,.35)] md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--gold-soft)]">Royal Command · Universal Create Room v{CREATE_ROOM_FORM_VERSION}</div>
              <h1 className="mt-2 text-3xl font-semibold md:text-4xl">{isKorean ? "이 Room에 필요한 연결 도구를 선택하세요" : "Choose the connections for this Room"}</h1>
              {initialRoomName ? <div className="mt-2 text-sm text-emerald-200">Room name: <strong>{initialRoomName}</strong></div> : null}
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                {isKorean ? "아래 네모난 카드에서 필요한 기능만 선택하세요. 개인 Room도 나중에 AI·회계·법률·Cloud Phone·전문가·파일관리 같은 기능을 추가할 수 있습니다. 이 목록은 무엇을 연결할 수 있는지 배우는 안내 목록이기도 합니다." : "Select only the services you need from the cards below. Even a personal Room can later add AI, accounting, legal, Cloud Phone, expert or advanced file services. This list also teaches you what can be connected."}
              </p>
              <button type="button" onClick={speakGuide} className="mt-4 rounded-xl border border-[var(--gold)]/45 bg-[var(--gold)]/10 px-4 py-2 text-sm font-semibold text-[var(--gold-soft)] hover:bg-[var(--gold)] hover:text-black">🔊 {isKorean ? "전체 연결 도구 안내 듣기" : "Listen to connection guide"}</button>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-right">
              <div className="text-xs text-emerald-200">{BASIC_TRIAL_DAYS} Day Trial</div>
              <div className="text-lg font-semibold">{money(0)} today</div>
              <div className="text-xs text-[var(--muted)]">then {money(BASIC_ROOM_MONTHLY_AUD)}/month + selected services</div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">{t.country}
              <select className="rc-input mt-2" value={countryCode} onChange={(event) => setCountryCode(event.target.value)}>
                {CREATE_ROOM_COUNTRIES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">{t.language}
              <select className="rc-input mt-2" value={locale} onChange={(event) => setLocale(event.target.value as CreateRoomLocale)}>
                {CREATE_ROOM_LANGUAGES.map((item) => <option key={item.locale} value={item.locale}>{item.label}</option>)}
              </select>
            </label>
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">{isKorean ? "국가와 언어는 별개입니다. 예: United States + 한국어. 기본 버튼과 메뉴는 English로 유지됩니다." : "Country and language are separate. Core buttons and menus remain English."}</p>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="space-y-4">
            {categories.map((category) => (
              <section key={category} className="rounded-[24px] border border-white/10 bg-black/20 p-4 md:p-5">
                <h2 className="text-lg font-semibold text-[var(--gold-soft)]">{categoryLabel(category, locale)}</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {CATALOG.filter((item) => item.category === category).map((item) => {
                    const active = selected.includes(item.id);
                    return (
                      <div key={item.id} className={`rounded-2xl border p-4 transition ${active ? "border-emerald-400/80 bg-emerald-500/12 shadow-[0_0_0_1px_rgba(52,211,153,.16)]" : "border-white/10 bg-black/10"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{item.name}</div>
                            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{item.description}</p>
                          </div>
                          <div className="shrink-0 text-right text-xs font-semibold text-[var(--gold-soft)]">{priceText(item)}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggle(item.id)}
                          aria-pressed={active}
                          className={`mt-4 min-h-12 w-full rounded-xl border px-4 py-3 text-sm font-bold transition ${active ? "border-emerald-300 bg-emerald-500 text-black" : "border-[var(--gold)]/60 bg-[var(--gold)]/10 text-[var(--gold-soft)] hover:bg-[var(--gold)] hover:text-black"}`}
                        >
                          {active ? (isKorean ? "선택됨 ✓ — 취소" : "SELECTED ✓ — REMOVE") : (isKorean ? "선택 — Room에 연결" : "SELECT — CONNECT TO ROOM")}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </section>

          <aside className="h-fit rounded-[28px] border border-[var(--gold)]/35 bg-black/35 p-5 shadow-[0_20px_70px_rgba(0,0,0,.3)] lg:sticky lg:top-6">
            <div className="text-sm font-semibold text-[var(--gold-soft)]">{isKorean ? "내 연결 선택 목록" : "My Connection Selection"}</div>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{isKorean ? "선택한 연결 서비스만 여기에 표시됩니다. 카드를 다시 누르면 제거됩니다." : "Only selected connections appear here. Select again to remove one."}</p>

            <div className="mt-4 space-y-2">
              {selectedItems.length ? selectedItems.map((item) => (
                <button key={item.id} type="button" onClick={() => toggle(item.id)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-3 text-left text-sm">
                  <span><span className="font-bold text-emerald-300">✓</span> {item.name}</span>
                  <span className="shrink-0 text-xs text-[var(--gold-soft)]">{priceText(item)}</span>
                </button>
              )) : (
                <div className="rounded-xl border border-white/10 p-4 text-sm text-[var(--muted)]">{isKorean ? "아직 선택한 연결 서비스가 없습니다." : "No connections selected yet."}</div>
              )}
            </div>

            <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm">
              <div className="flex justify-between"><span>Basic RC Room</span><strong>{money(BASIC_ROOM_MONTHLY_AUD)}/mo</strong></div>
              <div className="flex justify-between"><span>{isKorean ? "확정 월간 소계" : "Known monthly subtotal"}</span><strong>{money(monthlyKnown)}</strong></div>
              <div className="flex justify-between"><span>Promotion {PROMOTION_PERCENT}%</span><strong className="text-emerald-300">−{money(discount)}</strong></div>
              <div className="flex justify-between border-t border-white/10 pt-3 text-base"><span>{isKorean ? "월 예상 합계" : "Monthly total"}</span><strong className="text-xl text-[var(--gold-soft)]">{money(monthlyTotal)}</strong></div>
              {oneTimeKnown > 0 ? <div className="flex justify-between"><span>{isKorean ? "일회성 작업" : "One-time work"}</span><strong>{money(oneTimeKnown)}</strong></div> : null}
              {unconfirmed ? <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-xs leading-5 text-amber-100">{isKorean ? "선택한 서비스 중 아직 가격이 확정되지 않은 항목이 있습니다. 이 항목은 현재 합계에 포함되지 않으며 결제 전에 반드시 가격을 확인합니다." : "Some selected services have unconfirmed pricing. They are not included in the known total and must be confirmed before payment."}</div> : null}
            </div>

            <label className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]"><input type="checkbox" checked={promotion} onChange={(event) => setPromotion(event.target.checked)} className="accent-emerald-500" /> Promotion {PROMOTION_PERCENT}%</label>

            <button type="button" disabled={!selectedItems.length} onClick={() => setPurchaseReview(true)} className="mt-5 min-h-12 w-full rounded-xl bg-[var(--gold)] px-4 py-3 font-bold text-black disabled:cursor-not-allowed disabled:opacity-35">
              {isKorean ? "선택 내용 확인" : "CONTINUE TO PURCHASE REVIEW"}
            </button>

            {purchaseReview ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="font-semibold">{isKorean ? "연결 서비스 확인" : "Purchase Review"}</div>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{isKorean ? "선택한 서비스와 금액을 확인한 뒤 동의하면 결제 연결 단계로 이동합니다. 현재 실제 결제 연결은 아직 활성화하지 않았으므로 이 화면에서 임의로 과금하지 않습니다." : "Review your selected services and pricing. Payment integration is not yet activated in this form, so no charge is made from this screen."}</p>
                <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" checked={agreement} onChange={(event) => setAgreement(event.target.checked)} className="mt-1 h-4 w-4 accent-emerald-500" /><span>{isKorean ? "선택한 서비스와 예상 금액을 확인했습니다." : "I reviewed my selected services and estimated charges."}</span></label>
                <button type="button" disabled={!agreement} className="mt-3 min-h-11 w-full rounded-xl border border-[var(--gold)]/50 px-3 py-2 font-semibold text-[var(--gold-soft)] disabled:opacity-35">Agreement & Payment</button>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
