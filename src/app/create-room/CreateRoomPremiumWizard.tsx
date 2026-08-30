"use client";

import { useMemo, useState } from "react";
import {
  BASIC_TRIAL_DAYS,
  CATALOG,
  CREATE_ROOM_FORM_VERSION,
  PROMOTION_PERCENT,
} from "@/lib/rooms/universal-create-room-config";
import { commercialMeta } from "@/lib/rooms/room-connection-commercial";
import { EXPANDED_CATALOG } from "@/lib/rooms/room-connection-expanded-catalog";
import {
  BASE_ROOM_MONTHLY_USD,
  calculateCreateRoomPricing,
} from "@/lib/rooms/create-room-pricing";
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

type ConnectionCategory =
  | "ai"
  | "secretary"
  | "communication"
  | "professional"
  | "accounting"
  | "legal"
  | "files"
  | "education"
  | "media"
  | "music"
  | "sports"
  | "travel"
  | "marketplace"
  | "business"
  | "mail"
  | "website"
  | "maintenance";

type ConnectionItem = {
  id: string;
  category: ConnectionCategory;
  subcategory?: string;
  name: string;
  description: string;
  billing: "monthly" | "one_time" | "quote" | "included";
  priceAud?: number;
  priceLabel?: string;
  consultation?: boolean;
  includedIn?: string[];
  exclusiveGroup?: string;
};

const ALL_CATALOG: ConnectionItem[] = [
  ...(CATALOG as unknown as ConnectionItem[]),
  ...(EXPANDED_CATALOG as ConnectionItem[]),
];

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

function moneyAud(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    currencyDisplay: "code",
    minimumFractionDigits: value % 1 ? 2 : 0,
  }).format(value);
}

function moneyUsd(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "USD",
    currencyDisplay: "code",
    minimumFractionDigits: value % 1 ? 2 : 0,
  }).format(value);
}

function categoryLabel(category: ConnectionCategory, locale: CreateRoomLocale) {
  if (locale === "ko") {
    return ({
      ai: "AI 연결",
      secretary: "AI 비서",
      communication: "전화 · SMS · 이메일 · 통역",
      professional: "전문가 연결",
      accounting: "회계 소프트웨어",
      legal: "법률 소프트웨어",
      files: "파일 · 프로젝트",
      education: "교육 · 학습",
      media: "영상 · 콘텐츠 제작",
      music: "음악",
      sports: "스포츠",
      travel: "여행 · 예약 · 티켓",
      marketplace: "중고 Marketplace",
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
    accounting: "Accounting Software",
    legal: "Legal Software",
    files: "Files · Projects",
    education: "Education · Learning",
    media: "Video · Content Creation",
    music: "Music",
    sports: "Sports",
    travel: "Travel · Booking · Tickets",
    marketplace: "Community Marketplace",
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
  const [activeCategory, setActiveCategory] = useState<ConnectionCategory>("ai");

  const t = createRoomCopy(locale);
  const isKorean = locale === "ko";
  const selectedItems = useMemo(() => ALL_CATALOG.filter((item) => selected.includes(item.id)), [selected]);
  const pricing = calculateCreateRoomPricing(selectedItems, promotion, PROMOTION_PERCENT);
  const unconfirmed = pricing.hasUnconfirmedPricing;

  const categories: ConnectionCategory[] = [
    "ai",
    "secretary",
    "communication",
    "professional",
    "accounting",
    "legal",
    "files",
    "education",
    "media",
    "music",
    "sports",
    "travel",
    "marketplace",
    "business",
    "mail",
    "website",
    "maintenance",
  ];
  const visibleItems = ALL_CATALOG.filter((item) => item.category === activeCategory);

  function toggle(id: string) {
    const item = ALL_CATALOG.find((entry) => entry.id === id);
    if (!item) return;
    setSelected((current) => {
      const adding = !current.includes(id);
      let next = adding ? [...current, id] : current.filter((entry) => entry !== id);
      if (adding && item.exclusiveGroup) {
        next = next.filter((entry) => {
          const candidate = ALL_CATALOG.find((catalogItem) => catalogItem.id === entry);
          return !candidate || candidate.exclusiveGroup !== item.exclusiveGroup || entry === id;
        });
      }
      return next;
    });
  }

  function priceText(item: ConnectionItem) {
    if (item.billing === "included") return item.priceLabel || "Included";
    if (item.priceLabel) return item.priceLabel;
    if (item.priceAud == null) return "Price to confirm";
    if (item.billing === "monthly") return `${moneyAud(item.priceAud)}/month`;
    return `From ${moneyAud(item.priceAud)}`;
  }

  function speakGuide() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const text = isKorean
      ? "이 화면은 로열 커맨드 룸에 연결할 서비스를 배우고 선택하는 곳입니다. 먼저 카테고리를 고르면 해당 연결 도구만 표시됩니다. 인공지능, 전화와 비서, 회계, 법률, 파일, 교육뿐 아니라 영상 제작, 음악, 스포츠, 여행과 예약, 티켓, 중고 마켓플레이스 같은 분야도 필요한 만큼 확장할 수 있습니다. 각 분야 안에는 세부 기능이 따로 있어 고객은 하고 싶은 일을 선택하고 로열 커맨드가 필요한 연결을 뒤에서 구성하는 방식입니다. 고객 명의 직접가입, 제휴, 리셀, 도매, 커미션 방식과 국가별 가격은 서비스마다 별도로 관리합니다. 확정되지 않은 가격은 결제 전에 반드시 확인합니다."
      : "This screen lets you learn about and choose services for a Royal Command Room. Choose a category first and only the relevant tools are shown. In addition to AI, phone, accounting, legal, files and education, the catalogue can expand into video creation, music, sports, travel, reservations, tickets and community marketplace services. Each area has subcategories so the customer can choose the outcome they want while Royal Command configures the required connections behind the scenes. Customer-direct, partner, resale, wholesale and commission models, as well as country pricing, are managed per service. Unconfirmed prices must be reviewed before payment.";
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
                {isKorean ? "먼저 아래 카테고리를 선택하세요. 영상·음악·스포츠·여행 같은 새 분야가 계속 추가되어도 선택한 분야의 도구만 보여주므로 화면은 단순하게 유지됩니다. 개인 Room에도 나중에 필요한 기능을 추가할 수 있습니다." : "Choose a category first. Even as new areas such as video, music, sports and travel are added, only the selected category is shown, keeping the screen simple. A personal Room can add more capabilities later."}
              </p>
              <button type="button" onClick={speakGuide} className="mt-4 rounded-xl border border-[var(--gold)]/45 bg-[var(--gold)]/10 px-4 py-2 text-sm font-semibold text-[var(--gold-soft)] hover:bg-[var(--gold)] hover:text-black">🔊 {isKorean ? "전체 연결 도구 안내 듣기" : "Listen to connection guide"}</button>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-right">
              <div className="text-xs text-emerald-200">{BASIC_TRIAL_DAYS} Day Trial</div>
              <div className="text-lg font-semibold">{moneyUsd(0)} today</div>
              <div className="text-xs text-[var(--muted)]">then {moneyUsd(BASE_ROOM_MONTHLY_USD)}/month + selected services priced separately</div>
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
          <p className="mt-2 text-xs text-[var(--muted)]">{isKorean ? "국가와 언어는 별개입니다. 국가에 따라 가격·공급업체·법적 사용 가능 범위를 따로 적용할 수 있습니다." : "Country and language are separate. Pricing, suppliers and legally available capabilities can be configured independently for each country."}</p>
        </header>

        <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4">
          <div className="mb-3 text-sm font-semibold text-[var(--gold-soft)]">{isKorean ? "연결 카테고리" : "Connection categories"}</div>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {categories.map((category) => {
              const active = activeCategory === category;
              const count = ALL_CATALOG.filter((item) => item.category === category).length;
              return (
                <button key={category} type="button" onClick={() => setActiveCategory(category)} className={`rounded-xl border px-3 py-3 text-left text-sm transition ${active ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold-soft)]" : "border-white/10 bg-black/10 hover:border-white/25"}`}>
                  <div className="font-semibold">{categoryLabel(category, locale)}</div>
                  <div className="mt-1 text-xs text-[var(--muted)]">{count} {isKorean ? "개 연결" : "connections"}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="rounded-[24px] border border-white/10 bg-black/20 p-4 md:p-5">
            <h2 className="text-xl font-semibold text-[var(--gold-soft)]">{categoryLabel(activeCategory, locale)}</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">{isKorean ? "필요한 서비스만 선택하세요. 세부분야가 표시되므로 같은 카테고리 안에서도 원하는 기능을 쉽게 찾을 수 있습니다." : "Select only what you need. Subcategories help you find the right capability inside each area."}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {visibleItems.map((item) => {
                const active = selected.includes(item.id);
                const meta = commercialMeta(item.id);
                return (
                  <div key={item.id} className={`rounded-2xl border p-4 transition ${active ? "border-emerald-400/80 bg-emerald-500/12 shadow-[0_0_0_1px_rgba(52,211,153,.16)]" : "border-white/10 bg-black/10"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {item.subcategory ? <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200/80">{item.subcategory}</div> : null}
                        <div className="font-semibold">{item.name}</div>
                        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{item.description}</p>
                      </div>
                      <div className="shrink-0 text-right text-xs font-semibold text-[var(--gold-soft)]">{priceText(item)}</div>
                    </div>
                    <div className="mt-3 rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-[11px] leading-4">
                      <div className="font-semibold text-emerald-200">{isKorean ? meta.labelKo : meta.labelEn}</div>
                      {(isKorean ? meta.noteKo : meta.noteEn) ? <div className="mt-1 text-[var(--muted)]">{isKorean ? meta.noteKo : meta.noteEn}</div> : null}
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

          <aside className="h-fit rounded-[28px] border border-[var(--gold)]/35 bg-black/35 p-5 shadow-[0_20px_70px_rgba(0,0,0,.3)] lg:sticky lg:top-6">
            <div className="text-sm font-semibold text-[var(--gold-soft)]">{isKorean ? "내 연결 선택 목록" : "My Connection Selection"}</div>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{isKorean ? "선택한 연결 서비스만 여기에 표시됩니다. 다른 카테고리로 이동해도 선택은 유지됩니다." : "Only selected connections appear here. Your selections stay in place while browsing other categories."}</p>

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
              <div className="flex justify-between"><span>Basic RC Room</span><strong>{moneyUsd(pricing.baseRoomMonthlyUsd)}/mo</strong></div>
              <div className="rounded-xl border border-sky-400/25 bg-sky-400/5 p-3 text-xs leading-5 text-sky-100">
                {isKorean ? "기본 Room 임대료는 USD로, 추가 서비스는 현재 AUD 가격표로 별도 표시합니다. 승인된 환율·정산 규칙이 없으므로 서로 다른 통화를 하나의 합계로 더하지 않습니다." : "Base Room rent is shown in USD. Selected services use the current AUD catalogue and are shown separately. Different currencies are never combined without an approved FX and settlement rule."}
              </div>
              <div className="flex justify-between"><span>{isKorean ? "확정 월간 추가 서비스 소계" : "Known monthly add-ons"}</span><strong>{moneyAud(pricing.monthlyAddOnsAud)}</strong></div>
              <div className="flex justify-between"><span>Promotion {PROMOTION_PERCENT}%</span><strong className="text-emerald-300">−{moneyAud(pricing.promotionDiscountAud)}</strong></div>
              <div className="flex justify-between border-t border-white/10 pt-3 text-base"><span>{isKorean ? "할인 후 월간 추가 서비스" : "Monthly add-ons after promotion"}</span><strong className="text-xl text-[var(--gold-soft)]">{moneyAud(pricing.monthlyAddOnsAfterPromotionAud)}</strong></div>
              {pricing.oneTimeAddOnsAud > 0 ? <div className="flex justify-between"><span>{isKorean ? "일회성 추가 서비스" : "One-time add-ons"}</span><strong>{moneyAud(pricing.oneTimeAddOnsAud)}</strong></div> : null}
              {unconfirmed ? <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-xs leading-5 text-amber-100">{isKorean ? "선택한 서비스 중 아직 가격이 확정되지 않은 항목이 있습니다. 국가별 파트너 가격·할인·RC 마진을 확인한 뒤 결제 전에 최종 금액을 보여줍니다." : "Some selected services have unconfirmed pricing. Country partner cost, customer discount and RC margin must be verified before the final amount is shown."}</div> : null}
            </div>

            <label className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]"><input type="checkbox" checked={promotion} onChange={(event) => setPromotion(event.target.checked)} className="accent-emerald-500" /> Promotion {PROMOTION_PERCENT}% {isKorean ? "(AUD 추가 서비스)" : "(AUD add-ons)"}</label>

            <button type="button" disabled={!selectedItems.length} onClick={() => setPurchaseReview(true)} className="mt-5 min-h-12 w-full rounded-xl bg-[var(--gold)] px-4 py-3 font-bold text-black disabled:cursor-not-allowed disabled:opacity-35">
              {isKorean ? "선택 내용 확인" : "CONTINUE TO PURCHASE REVIEW"}
            </button>

            {purchaseReview ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="font-semibold">{isKorean ? "연결 서비스 확인" : "Purchase Review"}</div>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{isKorean ? "선택한 서비스, 소유 방식, 국가별 가격을 확인한 뒤 동의하면 결제 연결 단계로 이동합니다. 가격이 확정되지 않은 서비스는 결제되지 않습니다. USD Room 임대료와 AUD 추가 서비스는 승인된 환산 규칙이 생기기 전까지 별도로 표시됩니다." : "Review selected services, ownership method and country pricing before proceeding. Services with unconfirmed pricing are not charged. USD Room rent and AUD add-ons remain separate until an approved conversion rule is available."}</p>
                <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" checked={agreement} onChange={(event) => setAgreement(event.target.checked)} className="mt-1 h-4 w-4 accent-emerald-500" /><span>{isKorean ? "선택한 서비스와 통화별 예상 금액을 확인했습니다." : "I reviewed my selected services and the estimated charges shown by currency."}</span></label>
                <button type="button" disabled={!agreement} className="mt-3 min-h-11 w-full rounded-xl border border-[var(--gold)]/50 px-3 py-2 font-semibold text-[var(--gold-soft)] disabled:opacity-35">Agreement & Payment</button>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
