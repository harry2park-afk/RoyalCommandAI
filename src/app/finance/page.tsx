"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Banknote,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  FileCheck2,
  FileText,
  Landmark,
  LockKeyhole,
  PiggyBank,
  ShieldCheck,
  TrendingUp,
  WalletCards,
} from "lucide-react";

type Task = {
  id: string;
  label: string;
  category: string;
};

const TASKS: Task[] = [
  { id: "identity", label: "Business identity and ownership details", category: "Business" },
  { id: "abn", label: "ABN / ACN and registration documents", category: "Business" },
  { id: "bank", label: "Bank statements and transaction history", category: "Financial" },
  { id: "pl", label: "Profit & Loss statement", category: "Financial" },
  { id: "balance", label: "Balance Sheet", category: "Financial" },
  { id: "cashflow", label: "Cash Flow statement and forecast", category: "Financial" },
  { id: "bas", label: "BAS and tax records", category: "Tax" },
  { id: "debts", label: "Current loans, cards and liabilities", category: "Credit" },
  { id: "assets", label: "Assets, security and guarantees", category: "Security" },
  { id: "ip", label: "IP, patents, trademarks, software and licences", category: "Security" },
  { id: "purpose", label: "Finance amount, purpose and use-of-funds plan", category: "Application" },
  { id: "repayment", label: "Repayment capacity and servicing evidence", category: "Application" },
];

const FEATURES = [
  {
    icon: Landmark,
    title: "Connect My Bank",
    text: "Designed for Australian Open Banking / CDR connections. Royal Command must never ask for or store a customer's internet-banking password.",
    status: "Connector integration next",
  },
  {
    icon: WalletCards,
    title: "My Financial Position",
    text: "Bring authorised accounts, income, expenses, liabilities and cash flow into one customer-controlled view.",
    status: "MVP structure ready",
  },
  {
    icon: TrendingUp,
    title: "Finance Readiness Pathway",
    text: "Do not stop at 'not ready'. Identify missing evidence, create actions, track progress and prepare the customer until finance-ready.",
    status: "MVP tracker ready",
  },
  {
    icon: FileCheck2,
    title: "Universal Bank Pack",
    text: "Prepare one clean base pack, then add bank-specific requirements rather than asking the customer to rebuild everything for every lender.",
    status: "MVP checklist ready",
  },
  {
    icon: Building2,
    title: "Bank Requirements Engine",
    text: "Store lender-specific eligibility and document requirements separately so the core customer file remains bank-independent.",
    status: "Rules database next",
  },
  {
    icon: BadgeDollarSign,
    title: "Loan Comparison",
    text: "Compare total borrowing cost, fees, security, term and conditions. Keep the customer in control of the final choice.",
    status: "Product-data integration next",
  },
  {
    icon: ShieldCheck,
    title: "Professional Review",
    text: "Allow customer-authorised accountants, brokers, lawyers or other qualified professionals to review the finance pack when required.",
    status: "Permission workflow next",
  },
  {
    icon: LockKeyhole,
    title: "Consent & Privacy",
    text: "Show what information the customer has authorised, who can access it, and allow consent to be withdrawn or changed.",
    status: "Governance layer required",
  },
];

export default function FinancePage() {
  const [completed, setCompleted] = useState<string[]>([]);
  const [targetAmount, setTargetAmount] = useState("");
  const [purpose, setPurpose] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("royalcommand:au-finance-readiness");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { completed?: string[]; targetAmount?: string; purpose?: string };
      setCompleted(parsed.completed || []);
      setTargetAmount(parsed.targetAmount || "");
      setPurpose(parsed.purpose || "");
    } catch {
      // Ignore invalid old local data.
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "royalcommand:au-finance-readiness",
      JSON.stringify({ completed, targetAmount, purpose }),
    );
  }, [completed, targetAmount, purpose]);

  const percent = useMemo(
    () => Math.round((completed.length / TASKS.length) * 100),
    [completed],
  );

  function toggleTask(id: string) {
    setCompleted((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-sm text-[var(--muted)]">← Dashboard</Link>
          <p className="mt-3 text-xs uppercase tracking-[0.25em] text-[var(--gold-soft)]">Royal Command Australia</p>
          <h1 className="mt-1 text-4xl" style={{ fontFamily: "var(--font-display), serif" }}>
            Finance & Banking Room
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
            One customer profile, any Australian bank. Prepare, improve, compare and stay finance-ready without locking the customer to one lender.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 px-4 py-3 text-right">
          <div className="text-xs text-[var(--muted)]">Finance readiness</div>
          <div className="text-2xl font-semibold text-[var(--gold-soft)]">{percent}%</div>
          <div className="text-xs text-[var(--muted)]">{completed.length}/{TASKS.length} core items prepared</div>
        </div>
      </header>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rc-card p-5">
          <div className="flex items-center gap-2 text-[var(--gold-soft)]"><CircleDollarSign size={20} /><span className="font-medium">Target finance</span></div>
          <label className="mt-4 block text-xs text-[var(--muted)]">Amount required (AUD)</label>
          <input className="rc-input mt-2" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="e.g. 100,000" />
        </div>
        <div className="rc-card p-5 md:col-span-2">
          <div className="flex items-center gap-2 text-[var(--gold-soft)]"><PiggyBank size={20} /><span className="font-medium">Purpose of finance</span></div>
          <label className="mt-4 block text-xs text-[var(--muted)]">What will the money be used for?</label>
          <input className="rc-input mt-2" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Equipment, working capital, expansion, acquisition…" />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rc-card p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">My Road to Finance</p>
              <h2 className="mt-1 text-2xl" style={{ fontFamily: "var(--font-display), serif" }}>Loan Readiness Journey</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">If finance is not available today, Royal Command keeps preparing the customer until the evidence is stronger.</p>
            </div>
            <Banknote className="text-[var(--gold-soft)]" size={28} />
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-[var(--gold)] transition-all" style={{ width: `${percent}%` }} />
          </div>

          <div className="mt-5 space-y-2">
            {TASKS.map((task) => {
              const checked = completed.includes(task.id);
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${checked ? "border-[var(--gold)]/50 bg-[var(--gold)]/8" : "border-white/10 bg-black/15 hover:border-white/25"}`}
                >
                  {checked ? <CheckCircle2 size={19} className="shrink-0 text-[var(--gold-soft)]" /> : <span className="h-[19px] w-[19px] shrink-0 rounded-full border border-white/25" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">{task.label}</div>
                    <div className="text-xs text-[var(--muted)]">{task.category}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rc-card p-5 md:p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Bank-independent design</p>
            <h2 className="mt-1 text-2xl" style={{ fontFamily: "var(--font-display), serif" }}>Australian Finance Architecture</h2>
            <div className="mt-4 space-y-3">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="rounded-2xl border border-white/10 bg-black/15 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--gold)]/25 bg-[var(--gold)]/5 text-[var(--gold-soft)]"><Icon size={18} /></div>
                      <div>
                        <div className="font-medium">{feature.title}</div>
                        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{feature.text}</p>
                        <div className="mt-2 text-[11px] text-[var(--gold-soft)]">{feature.status}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rc-card border-[var(--gold)]/25 p-5">
            <div className="flex items-center gap-2 text-[var(--gold-soft)]"><FileText size={19} /><span className="font-medium">Universal Bank Pack</span></div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              This first version builds the common preparation file. Bank-specific eligibility, live CDR bank connections, credit-assistance workflows and lender applications must only be activated after the relevant Australian compliance and licensed-partner pathways are configured.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
