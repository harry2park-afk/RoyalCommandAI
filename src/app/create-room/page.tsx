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

const STEP_LABELS = ["Describe", "Recommend", "Customise", "Review", "Agreement"];
const CATEGORY_LABELS: Record<CatalogItem["category"], string> = {
  ai: "AI",
  secretary: "AI Secretary",
  communication: "Communication",
  business: "Documents & Business",
  mail: "Mail Service",
  website: "Website",
  maintenance: "Website Management & Upgrade",
};

function money(value: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: value % 1 ? 2 : 0 }).format(value);
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

export default function UniversalCreateRoomPage() {
  const [step, setStep] = useState(1);
  const [request, setRequest] = useState("");
  const [industryId, setIndustryId] = useState("general");
  const [teamSize, setTeamSize] = useState("1");
  const [language, setLanguage] = useState("English");
  const [country, setCountry] = useState("Australia");
  const [selected, setSelected] = useState<string[]>([]);
  const [promotion, setPromotion] = useState(true);
  const [agreement, setAgreement] = useState(false);

  const selectedItems = useMemo(() => CATALOG.filter((item) => selected.includes(item.id)), [selected]);
  const monthlyKnown = BASIC_ROOM_MONTHLY_AUD + selectedItems.reduce((sum, item) => sum + (item.billing === "monthly" ? item.priceAud || 0 : 0), 0);
  const oneTimeKnown = selectedItems.reduce((sum, item) => sum + (item.billing === "one_time" ? item.priceAud || 0 : 0), 0);
  const discount = promotion ? monthlyKnown * (PROMOTION_PERCENT / 100) : 0;
  const monthlyAfterDiscount = Math.max(0, monthlyKnown - discount);
  const hasUnconfirmed = selectedItems.some((item) => item.billing === "monthly" && item.priceAud == null);
  const websiteBenefitEligible = monthlyAfterDiscount >= WEBSITE_BENEFIT_THRESHOLD_AUD;

  function toggle(id: string) {
    const item = CATALOG.find((entry) => entry.id === id);
    if (!item) return;
    setSelected((current) => {
      let next = current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id];
      if (item.category === "secretary" && !current.includes(id)) next = next.filter((entry) => !CATALOG.some((candidate) => candidate.category === "secretary" && candidate.id === entry) || entry === id);
      if (item.category === "maintenance" && !current.includes(id)) next = next.filter((entry) => !CATALOG.some((candidate) => candidate.category === "maintenance" && candidate.id === entry) || entry === id);
      if (item.category === "website" && item.id !== "website-free" && !current.includes(id)) next = next.filter((entry) => !CATALOG.some((candidate) => candidate.category === "website" && candidate.id === entry) || entry === id);
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
    if (item.billing === "included") return item.priceLabel || "Included";
    if (item.priceLabel) return item.priceLabel;
    if (item.priceAud == null) return "Price to confirm";
    if (item.billing === "monthly") return `${money(item.priceAud)}/month`;
    return `From ${money(item.priceAud)}`;
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-3xl border border-[var(--gold)]/35 bg-black/20 p-5 md:p-7">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--gold-soft)]">Royal Command · Universal Create Room v{CREATE_ROOM_FORM_VERSION}</div>
          <h1 className="mt-2 text-3xl font-semibold">Create Your Room</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">Tell us what you need in one short sentence. Royal Command recommends a simple starting configuration, then you can add or remove services before any agreement or payment.</p>
          <div className="mt-5 grid grid-cols-5 gap-2">
            {STEP_LABELS.map((label, index) => {
              const number = index + 1;
              return <div key={label} className={`rounded-xl border px-2 py-2 text-center text-xs ${number === step ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold-soft)]" : number < step ? "border-emerald-500/50 bg-emerald-500/10" : "border-white/10 text-[var(--muted)]"}`}><span className="font-semibold">{number}</span><span className="hidden sm:inline"> · {label}</span></div>;
            })}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <section className="rounded-3xl border border-white/10 bg-black/15 p-5 md:p-7">
            {step === 1 ? (
              <div>
                <h2 className="text-xl font-semibold">Step 1. What kind of Room should we create?</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">Example: “Create an accountant office for three staff. We need client documents, phone calls, appointments and GST reminders.”</p>
                <textarea className="rc-input mt-4 min-h-36" value={request} onChange={(event) => setRequest(event.target.value)} placeholder="Describe your Room in one or two sentences..." />
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <label className="text-sm">Team size<select className="rc-input mt-2" value={teamSize} onChange={(event) => setTeamSize(event.target.value)}><option>1</option><option>2–5</option><option>6–20</option><option>21+</option></select></label>
                  <label className="text-sm">Language<input className="rc-input mt-2" value={language} onChange={(event) => setLanguage(event.target.value)} /></label>
                  <label className="text-sm">Country<input className="rc-input mt-2" value={country} onChange={(event) => setCountry(event.target.value)} /></label>
                </div>
                <button type="button" onClick={runRecommendation} className="mt-5 rounded-xl bg-[var(--gold)] px-5 py-3 font-semibold text-black">AI Recommend My Room</button>
              </div>
            ) : null}

            {step === 2 ? (
              <div>
                <h2 className="text-xl font-semibold">Step 2. AI Recommendation</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">Recommended Room: <strong className="text-[var(--gold-soft)]">{INDUSTRIES.find((item) => item.id === industryId)?.label}</strong>. Choose a starting level; everything can be changed next.</p>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {(["essential", "recommended", "full"] as const).map((level) => (
                    <button key={level} type="button" onClick={() => applyPackage(level)} className={`rounded-2xl border p-5 text-left transition hover:border-[var(--gold)] ${level === "recommended" ? "border-[var(--gold)] bg-[var(--gold)]/10" : "border-white/10"}`}>
                      <div className="font-semibold capitalize">{level === "essential" ? "Good · Essential" : level === "recommended" ? "Better · Recommended" : "Best · Full Office"}</div>
                      <div className="mt-2 text-xs leading-5 text-[var(--muted)]">{level === "essential" ? "Core tools only." : level === "recommended" ? "Balanced package based on your description." : "Broader office, communication and customer tools."}</div>
                    </button>
                  ))}
                </div>
                <div className="mt-5"><label className="text-sm">Industry<select className="rc-input mt-2" value={industryId} onChange={(event) => setIndustryId(event.target.value)}>{INDUSTRIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label></div>
              </div>
            ) : null}

            {step === 3 ? (
              <div>
                <h2 className="text-xl font-semibold">Step 3. Customise only what you need</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">A clear green tick means selected. Tap it again to remove the service and update the total immediately.</p>
                <div className="mt-5 space-y-3">
                  {(Object.keys(CATEGORY_LABELS) as CatalogItem["category"][]).map((category) => (
                    <details key={category} className="rounded-2xl border border-white/10 bg-black/10" open={["ai", "secretary", "communication"].includes(category)}>
                      <summary className="cursor-pointer px-4 py-3 font-semibold text-[var(--gold-soft)]">{CATEGORY_LABELS[category]}</summary>
                      <div className="grid gap-2 border-t border-white/10 p-3 sm:grid-cols-2">
                        {CATALOG.filter((item) => item.category === category).map((item) => {
                          const active = selected.includes(item.id);
                          return <button key={item.id} type="button" onClick={() => toggle(item.id)} className={`rounded-xl border p-3 text-left ${active ? "border-emerald-500/70 bg-emerald-500/10" : "border-white/10 bg-black/10"}`}><div className="flex items-start justify-between gap-3"><span className="font-semibold">{active ? "✅ " : "☐ "}{item.name}</span><span className="shrink-0 text-xs text-[var(--gold-soft)]">{priceText(item)}</span></div><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{item.description}</p></button>;
                        })}
                      </div>
                    </details>
                  ))}
                </div>
                <div className="mt-5 flex gap-3"><button type="button" onClick={() => setStep(2)} className="rounded-xl border border-white/15 px-4 py-2">Back</button><button type="button" onClick={() => setStep(4)} className="rounded-xl bg-[var(--gold)] px-5 py-2 font-semibold text-black">Review Selection</button></div>
              </div>
            ) : null}

            {step === 4 ? (
              <div>
                <h2 className="text-xl font-semibold">Step 4. Final Review</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">Only selected services appear below. Remove any green-ticked item here and the estimate changes immediately.</p>
                <div className="mt-5 space-y-2">
                  {selectedItems.length ? selectedItems.map((item) => <button key={item.id} type="button" onClick={() => toggle(item.id)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-left"><span>✅ {item.name}</span><span className="text-sm text-[var(--gold-soft)]">{priceText(item)}</span></button>) : <div className="rounded-xl border border-white/10 p-4 text-sm text-[var(--muted)]">No add-on services selected. Basic RC Room only.</div>}
                </div>
                <div className="mt-5 rounded-2xl border border-white/10 p-4 text-sm leading-6">
                  <div>Room type: <strong>{INDUSTRIES.find((item) => item.id === industryId)?.label}</strong></div>
                  <div>Team: {teamSize} · {language} · {country}</div>
                  <div className="mt-2">Basic RC Room: <strong>{BASIC_TRIAL_DAYS} days FREE</strong>, then {money(BASIC_ROOM_MONTHLY_AUD)}/month.</div>
                  <div>AI training benefit: included for RC customers from A$3.80/month; 30-day program, five exam attempts per cycle, 70% pass mark, extra two-week study cycles until passed, electronic Certificate of Completion included.</div>
                  {websiteBenefitEligible ? <div className="mt-2 text-emerald-300">Starter Website Benefit: eligible at the current known monthly spend (A$80+).</div> : null}
                </div>
                <div className="mt-5 flex gap-3"><button type="button" onClick={() => setStep(3)} className="rounded-xl border border-white/15 px-4 py-2">Edit</button><button type="button" onClick={() => setStep(5)} className="rounded-xl bg-[var(--gold)] px-5 py-2 font-semibold text-black">Agreement & Payment</button></div>
              </div>
            ) : null}

            {step === 5 ? (
              <div>
                <h2 className="text-xl font-semibold">Step 5. Agreement & Payment</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">This preview implements the approved Form and pricing logic. Electronic signature and payment provider connections are intentionally not faked; they will be connected and tested before public launch.</p>
                <label className="mt-5 flex items-start gap-3 rounded-xl border border-white/10 p-4"><input type="checkbox" checked={agreement} onChange={(event) => setAgreement(event.target.checked)} className="mt-1" /><span className="text-sm">I have reviewed the selected services, trial terms, recurring estimate and any items marked “Price to confirm” or “Consultation”.</span></label>
                <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-100">Before public launch we will connect: electronic signature, payment, cancellation/renewal policy text, GST treatment, promotion dates, and final prices for currently unpriced usage services.</div>
                <button type="button" disabled={!agreement} className="mt-5 rounded-xl bg-[var(--gold)] px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40">Ready for Preview Integration</button>
              </div>
            ) : null}
          </section>

          <aside className="h-fit rounded-3xl border border-[var(--gold)]/30 bg-black/25 p-5 lg:sticky lg:top-6">
            <div className="text-sm font-semibold text-[var(--gold-soft)]">Live Price Summary</div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span>Today</span><strong>{money(0)}</strong></div>
              <div className="flex justify-between"><span>Known monthly normal</span><strong>{money(monthlyKnown)}</strong></div>
              {promotion ? <div className="flex justify-between text-emerald-300"><span>Promotion {PROMOTION_PERCENT}%</span><strong>−{money(discount)}</strong></div> : null}
              <div className="flex justify-between border-t border-white/10 pt-3 text-base"><span>After trial / month</span><strong className="text-[var(--gold-soft)]">{money(monthlyAfterDiscount)}</strong></div>
              <div className="flex justify-between"><span>Known one-time</span><strong>{money(oneTimeKnown)}</strong></div>
              {promotion ? <div className="text-xs text-emerald-300">You save {money(discount)}/month on currently priced monthly items.</div> : null}
              {hasUnconfirmed ? <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-2 text-xs text-amber-100">Some selected services have prices still to be confirmed and are not included in this estimate.</div> : null}
            </div>
            <label className="mt-4 flex items-center gap-2 text-xs"><input type="checkbox" checked={promotion} onChange={(event) => setPromotion(event.target.checked)} /> Show current 30% promotion example</label>
            <div className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-[var(--muted)]">Trial: {BASIC_TRIAL_DAYS} days · Basic Room after trial: {money(BASIC_ROOM_MONTHLY_AUD)}/month · Form version {CREATE_ROOM_FORM_VERSION}</div>
          </aside>
        </div>
      </div>
    </main>
  );
}
