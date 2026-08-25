"use client";

import { useMemo, useState } from "react";
import {
  BASIC_ROOM_MONTHLY_AUD,
  BASIC_TRIAL_DAYS,
  CATALOG,
  CREATE_ROOM_FORM_VERSION,
  INDUSTRIES,
  PROMOTION_PERCENT,
  WEBSITE_BENEFIT_THRESHOLD_AUD,
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

const CONTROL = {
  aiRecommend: "AI Recommend My Room",
  direct: "Choose Myself",
  back: "Back",
  review: "Review Selection",
  edit: "Edit",
  agreementPayment: "Agreement & Payment",
  readyPreview: "Ready for Preview Integration",
  included: "Included",
  priceToConfirm: "Price to confirm",
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

function inferIndustry(text: string) {
  const value = text.toLowerCase();
  return INDUSTRIES.find((industry) => industry.keywords.some((keyword) => value.includes(keyword.toLowerCase()))) || INDUSTRIES.find((industry) => industry.id === "general")!;
}

function packageSelection(profileId: string, level: "essential" | "recommended" | "full") {
  const profile = INDUSTRIES.find((item) => item.id === profileId) || INDUSTRIES[INDUSTRIES.length - 1];
  const base = profile.recommended;
  if (level === "essential") return base.slice(0, Math.min(3, base.length));
  if (level === "recommended") return base;
  return Array.from(new Set([...base, "incoming-calls", "outgoing-calls", "customer-portal", "staff-accounts", "mail-service"]));
}

function categoryLabel(category: CatalogItem["category"], locale: CreateRoomLocale) {
  if (locale === "ko") {
    return ({ ai: "AI", secretary: "AI 비서", communication: "전화·SMS·이메일", business: "문서·업무", mail: "우편 서비스", website: "웹사이트 제작", maintenance: "웹사이트 관리·업그레이드" } as const)[category];
  }
  return ({ ai: "AI", secretary: "AI Secretary", communication: "Communication", business: "Documents & Business", mail: "Mail Service", website: "Website", maintenance: "Website Management & Upgrade" } as const)[category];
}

export default function CreateRoomPremiumWizard({ initialLocale, initialRoomName, initialCountryCode }: Props) {
  const [step, setStep] = useState(1);
  const [request, setRequest] = useState("");
  const [industryId, setIndustryId] = useState("general");
  const [teamSize, setTeamSize] = useState("1");
  const [countryCode, setCountryCode] = useState(validCountry(initialCountryCode));
  const [locale, setLocale] = useState<CreateRoomLocale>(normaliseLocale(initialLocale));
  const [selected, setSelected] = useState<string[]>([]);
  const [promotion, setPromotion] = useState(true);
  const [agreement, setAgreement] = useState(false);

  const t = createRoomCopy(locale);
  const isKorean = locale === "ko";
  const selectedCountry = CREATE_ROOM_COUNTRIES.find((item) => item.code === countryCode) || CREATE_ROOM_COUNTRIES[0];
  const selectedItems = useMemo(() => CATALOG.filter((item) => selected.includes(item.id)), [selected]);
  const monthlyKnown = BASIC_ROOM_MONTHLY_AUD + selectedItems.reduce((sum, item) => sum + (item.billing === "monthly" ? item.priceAud || 0 : 0), 0);
  const oneTimeKnown = selectedItems.reduce((sum, item) => sum + (item.billing === "one_time" ? item.priceAud || 0 : 0), 0);
  const discount = promotion ? monthlyKnown * (PROMOTION_PERCENT / 100) : 0;
  const monthlyAfterDiscount = Math.max(0, monthlyKnown - discount);
  const websiteBenefitEligible = monthlyAfterDiscount >= WEBSITE_BENEFIT_THRESHOLD_AUD;
  const hasUnconfirmed = selectedItems.some((item) => item.billing === "monthly" && item.priceAud == null);
  const categories = ["ai", "secretary", "communication", "business", "mail", "website", "maintenance"] as CatalogItem["category"][];

  function toggle(id: string) {
    const item = CATALOG.find((entry) => entry.id === id);
    if (!item) return;
    setSelected((current) => {
      const adding = !current.includes(id);
      let next = adding ? [...current, id] : current.filter((entry) => entry !== id);
      if (adding && ["secretary", "maintenance"].includes(item.category)) {
        next = next.filter((entry) => !CATALOG.some((candidate) => candidate.category === item.category && candidate.id === entry) || entry === id);
      }
      if (adding && item.category === "website" && item.id !== "website-free") {
        next = next.filter((entry) => !CATALOG.some((candidate) => candidate.category === "website" && candidate.id === entry) || entry === id);
      }
      return next;
    });
  }

  function runRecommendation() {
    const industry = inferIndustry(request);
    setIndustryId(industry.id);
    setSelected(packageSelection(industry.id, "recommended"));
    setStep(2);
  }

  function applyPackage(level: "essential" | "recommended" | "full") {
    setSelected(packageSelection(industryId, level));
    setStep(3);
  }

  function priceText(item: CatalogItem) {
    if (item.billing === "included") return item.priceLabel || CONTROL.included;
    if (item.priceLabel) return item.priceLabel;
    if (item.priceAud == null) return CONTROL.priceToConfirm;
    if (item.billing === "monthly") return `${money(item.priceAud)}/month`;
    return `From ${money(item.priceAud)}`;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(200,163,76,.12),transparent_35%),var(--background)] px-4 py-7 text-[var(--foreground)] md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[28px] border border-[var(--gold)]/35 bg-black/25 p-5 shadow-[0_28px_90px_rgba(0,0,0,.35)] md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--gold-soft)]">Royal Command · Universal Create Room v{CREATE_ROOM_FORM_VERSION}</div>
              <h1 className="mt-2 text-3xl font-semibold md:text-4xl">{t.title}</h1>
              {initialRoomName ? <div className="mt-2 text-sm text-emerald-200">Room name: <strong>{initialRoomName}</strong></div> : null}
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">{t.subtitle}</p>
              <p className="mt-2 text-xs text-[var(--muted)]">{isKorean ? "설명과 가입 Form은 선택 언어로 표시되며, 기본 버튼·메뉴·Royal Command·AI 이름은 English로 유지됩니다." : "Form content can use your preferred language while core buttons, menus, Royal Command and AI names stay in English."}</p>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-right">
              <div className="text-xs text-emerald-200">{BASIC_TRIAL_DAYS} Day Trial</div>
              <div className="text-lg font-semibold">{money(0)} today</div>
              <div className="text-xs text-[var(--muted)]">then {money(BASIC_ROOM_MONTHLY_AUD)}/month + selected services</div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-5 gap-2">
            {["Describe", "Recommend", "Customise", "Review", "Agreement"].map((label, index) => {
              const number = index + 1;
              const state = number === step ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold-soft)]" : number < step ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200" : "border-white/10 text-[var(--muted)]";
              return <div key={label} className={`rounded-xl border px-2 py-2 text-center text-xs ${state}`}><span className="font-bold">{number}</span><span className="hidden sm:inline"> · {label}</span></div>;
            })}
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="rounded-[28px] border border-white/10 bg-black/20 p-5 md:p-8">
            {step === 1 ? <div>
              <h2 className="text-2xl font-semibold">{t.step1Title}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{t.step1Help}</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <label className="text-sm font-medium">{t.teamSize}<select className="rc-input mt-2" value={teamSize} onChange={(event) => setTeamSize(event.target.value)}><option>1</option><option>2–5</option><option>6–20</option><option>21+</option></select></label>
                <label className="text-sm font-medium">{t.country}<select className="rc-input mt-2" value={countryCode} onChange={(event) => setCountryCode(event.target.value)}>{CREATE_ROOM_COUNTRIES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
                <label className="text-sm font-medium">{t.language}<select className="rc-input mt-2" value={locale} onChange={(event) => setLocale(event.target.value as CreateRoomLocale)}>{CREATE_ROOM_LANGUAGES.map((item) => <option key={item.locale} value={item.locale}>{item.label}</option>)}</select></label>
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">{isKorean ? "국가와 언어는 별개입니다. 예: United States + 한국어." : "Country and language are separate. Example: United States + 한국어."}</p>
              <textarea className="rc-input mt-5 min-h-40 text-base" value={request} onChange={(event) => setRequest(event.target.value)} placeholder={t.placeholder} />
              <div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={runRecommendation} className="rounded-xl bg-[var(--gold)] px-5 py-3 font-semibold text-black">{CONTROL.aiRecommend}</button><button type="button" onClick={() => setStep(3)} className="rounded-xl border border-white/15 px-5 py-3 font-semibold">{CONTROL.direct}</button></div>
            </div> : null}

            {step === 2 ? <div>
              <div className="inline-flex rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-3 py-1 text-xs text-[var(--gold-soft)]">Recommended Room: {INDUSTRIES.find((item) => item.id === industryId)?.label}</div>
              <h2 className="mt-4 text-2xl font-semibold">{t.step2Title}</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">{t.choosePackage}</p>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {(["essential", "recommended", "full"] as const).map((level) => <button key={level} type="button" onClick={() => applyPackage(level)} className={`rounded-3xl border p-5 text-left ${level === "recommended" ? "border-[var(--gold)] bg-[var(--gold)]/10" : "border-white/10 bg-black/10"}`}><div className="font-semibold">{level === "essential" ? t.good : level === "recommended" ? t.better : t.best}</div><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{level === "essential" ? t.goodDesc : level === "recommended" ? t.betterDesc : t.bestDesc}</p></button>)}
              </div>
            </div> : null}

            {step === 3 ? <div>
              <h2 className="text-2xl font-semibold">{t.step3Title}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{t.step3Help}</p>
              <div className="mt-6 space-y-3">
                {categories.map((category) => <details key={category} className="overflow-hidden rounded-2xl border border-white/10 bg-black/10" open={["ai", "secretary", "communication"].includes(category)}><summary className="cursor-pointer px-4 py-4 font-semibold text-[var(--gold-soft)]">{categoryLabel(category, locale)}</summary><div className="grid gap-3 border-t border-white/10 p-3 sm:grid-cols-2">{CATALOG.filter((item) => item.category === category).map((item) => { const active = selected.includes(item.id); return <button key={item.id} type="button" onClick={() => toggle(item.id)} className={`rounded-2xl border p-4 text-left ${active ? "border-emerald-400/70 bg-emerald-500/12" : "border-white/10 bg-black/10"}`}><div className="flex items-start justify-between gap-3"><span className="font-semibold"><span className={active ? "text-emerald-300" : "text-[var(--muted)]"}>{active ? "✓" : "○"}</span> {item.name}</span><span className="shrink-0 text-xs font-semibold text-[var(--gold-soft)]">{priceText(item)}</span></div><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{item.description}</p></button>; })}</div></details>)}
              </div>
              <div className="mt-6 flex gap-3"><button type="button" onClick={() => setStep(2)} className="rounded-xl border border-white/15 px-4 py-2">{CONTROL.back}</button><button type="button" onClick={() => setStep(4)} className="rounded-xl bg-[var(--gold)] px-5 py-2 font-semibold text-black">{CONTROL.review}</button></div>
            </div> : null}

            {step === 4 ? <div>
              <h2 className="text-2xl font-semibold">{t.step4Title}</h2>
              {initialRoomName ? <div className="mt-3 rounded-xl border border-white/10 p-3 text-sm">Room name: <strong>{initialRoomName}</strong></div> : null}
              <div className="mt-5 space-y-2">{selectedItems.length ? selectedItems.map((item) => <button key={item.id} type="button" onClick={() => toggle(item.id)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-left"><span><span className="font-bold text-emerald-300">✓</span> {item.name}</span><span className="text-sm font-semibold text-[var(--gold-soft)]">{priceText(item)}</span></button>) : <div className="rounded-xl border border-white/10 p-4 text-sm text-[var(--muted)]">{t.noAddons}</div>}</div>
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/10 p-5 text-sm leading-7"><div>{t.roomType}: <strong>{INDUSTRIES.find((item) => item.id === industryId)?.label}</strong></div><div>{t.team}: {teamSize} · {selectedCountry.label} · {CREATE_ROOM_LANGUAGES.find((item) => item.locale === locale)?.label}</div><div className="mt-2">{BASIC_TRIAL_DAYS} {t.trialText} {money(BASIC_ROOM_MONTHLY_AUD)}/month.</div><div className="mt-2 text-[var(--muted)]">{t.basicBenefit}</div>{websiteBenefitEligible ? <div className="mt-2 font-medium text-emerald-300">{t.websiteBenefit}</div> : null}</div>
              <div className="mt-6 flex gap-3"><button type="button" onClick={() => setStep(3)} className="rounded-xl border border-white/15 px-4 py-2">{CONTROL.edit}</button><button type="button" onClick={() => setStep(5)} className="rounded-xl bg-[var(--gold)] px-5 py-2 font-semibold text-black">{CONTROL.agreementPayment}</button></div>
            </div> : null}

            {step === 5 ? <div><h2 className="text-2xl font-semibold">{t.step5Title}</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{t.step5Help}</p><label className="mt-6 flex items-start gap-3 rounded-2xl border border-white/10 bg-black/10 p-4"><input type="checkbox" checked={agreement} onChange={(event) => setAgreement(event.target.checked)} className="mt-1 h-5 w-5 accent-emerald-500" /><span className="text-sm leading-6">{t.agreement}</span></label><div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm leading-6 text-amber-100">{t.pendingIntegration}</div><button type="button" disabled={!agreement} className="mt-6 rounded-xl bg-[var(--gold)] px-5 py-3 font-semibold text-black disabled:opacity-40">{CONTROL.readyPreview}</button></div> : null}
          </section>

          <aside className="hidden h-fit rounded-[28px] border border-[var(--gold)]/30 bg-black/30 p-5 lg:sticky lg:top-6 lg:block"><div className="text-sm font-semibold text-[var(--gold-soft)]">Live Price Summary</div><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span>Today</span><strong>{money(0)}</strong></div><div className="flex justify-between"><span>After trial / month</span><strong>{money(monthlyKnown)}</strong></div><div className="flex justify-between"><span>Promotion {PROMOTION_PERCENT}%</span><strong className="text-emerald-300">−{money(discount)}</strong></div><div className="flex justify-between"><span>You save</span><strong>{money(discount)}</strong></div><div className="border-t border-white/10 pt-4"><div className="text-xs text-[var(--muted)]">Monthly total</div><div className="mt-1 text-3xl font-semibold text-[var(--gold-soft)]">{money(monthlyAfterDiscount)}</div></div>{oneTimeKnown > 0 ? <div className="flex justify-between border-t border-white/10 pt-3"><span>One-time website work</span><strong>{money(oneTimeKnown)}</strong></div> : null}{hasUnconfirmed ? <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-3 text-xs leading-5 text-amber-100">Price to confirm: some usage-based services are not included in the known total yet.</div> : null}</div><label className="mt-5 flex items-center gap-2 text-xs text-[var(--muted)]"><input type="checkbox" checked={promotion} onChange={(event) => setPromotion(event.target.checked)} className="accent-emerald-500" /> Promotion {PROMOTION_PERCENT}%</label></aside>
        </div>

        <div className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-[var(--gold)]/35 bg-black/90 p-3 shadow-2xl backdrop-blur lg:hidden"><div className="flex items-center justify-between gap-4"><div><div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Monthly total</div><div className="text-xl font-semibold text-[var(--gold-soft)]">{money(monthlyAfterDiscount)}/mo</div></div><div className="text-right text-xs"><div>Today: {money(0)}</div><div className="text-emerald-300">You save: {money(discount)}</div></div></div></div><div className="h-20 lg:hidden" />
      </div>
    </main>
  );
}
