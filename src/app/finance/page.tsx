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

type BankRequirement = {
  id: string;
  label: string;
  level: "core" | "often" | "product-specific";
  note?: string;
};

type BankProfile = {
  id: string;
  name: string;
  shortName: string;
  coverage: "major-bank" | "generic";
  requirements: BankRequirement[];
  sourceLabel: string;
  sourceUrl: string;
  lastVerified: string;
  note: string;
};

type FinanceConfig = {
  cdr: {
    mode: "not-configured" | "representative" | "accredited-recipient";
    configured: boolean;
    providerName: string | null;
    consentDashboardReady: boolean;
    liveBankDataEnabled: boolean;
    message: string;
  };
  banks: BankProfile[];
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
    text: "Australian Open Banking / CDR-ready architecture. Royal Command never asks for or stores a customer's internet-banking password.",
  },
  {
    icon: WalletCards,
    title: "My Financial Position",
    text: "Authorised accounts, income, expenses, liabilities and cash flow can be brought into one customer-controlled view when a CDR pathway is activated.",
  },
  {
    icon: TrendingUp,
    title: "Finance Readiness Pathway",
    text: "Do not stop at 'not ready'. Identify missing evidence, create actions, track progress and prepare the customer until finance-ready.",
  },
  {
    icon: FileCheck2,
    title: "Universal Bank Pack",
    text: "Prepare one clean base pack, then add bank-specific requirements rather than rebuilding the application for every lender.",
  },
  {
    icon: Building2,
    title: "Bank Requirements Engine",
    text: "Select an Australian bank to see its verified base requirements layered over the universal finance pack.",
  },
  {
    icon: BadgeDollarSign,
    title: "Loan Comparison",
    text: "Compare total borrowing cost, fees, security, term and conditions while keeping the customer in control of the final choice.",
  },
  {
    icon: ShieldCheck,
    title: "Professional Review",
    text: "Customer-authorised accountants, brokers, lawyers or other qualified professionals can be added to the review workflow later.",
  },
  {
    icon: LockKeyhole,
    title: "Consent & Privacy",
    text: "The customer must be able to see what data is authorised, who can access it and how consent can be changed or withdrawn.",
  },
];

export default function FinancePage() {
  const [completed, setCompleted] = useState<string[]>([]);
  const [targetAmount, setTargetAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [config, setConfig] = useState<FinanceConfig | null>(null);
  const [selectedBankId, setSelectedBankId] = useState("generic-au");
  const [bankCompleted, setBankCompleted] = useState<Record<string, string[]>>({});
  const [configError, setConfigError] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("royalcommand:au-finance-readiness");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { completed?: string[]; targetAmount?: string; purpose?: string };
        setCompleted(parsed.completed || []);
        setTargetAmount(parsed.targetAmount || "");
        setPurpose(parsed.purpose || "");
      } catch {
        // Ignore invalid old local data.
      }
    }

    const savedBank = window.localStorage.getItem("royalcommand:au-finance-bank-engine");
    if (savedBank) {
      try {
        const parsed = JSON.parse(savedBank) as { selectedBankId?: string; completed?: Record<string, string[]> };
        setSelectedBankId(parsed.selectedBankId || "generic-au");
        setBankCompleted(parsed.completed || {});
      } catch {
        // Ignore invalid old local data.
      }
    }

    fetch("/api/finance/config")
      .then(async (res) => {
        if (!res.ok) throw new Error("Finance configuration could not be loaded");
        return (await res.json()) as FinanceConfig;
      })
      .then(setConfig)
      .catch((error) => setConfigError(error instanceof Error ? error.message : "Configuration error"));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "royalcommand:au-finance-readiness",
      JSON.stringify({ completed, targetAmount, purpose }),
    );
  }, [completed, targetAmount, purpose]);

  useEffect(() => {
    window.localStorage.setItem(
      "royalcommand:au-finance-bank-engine",
      JSON.stringify({ selectedBankId, completed: bankCompleted }),
    );
  }, [selectedBankId, bankCompleted]);

  const percent = useMemo(
    () => Math.round((completed.length / TASKS.length) * 100),
    [completed],
  );

  const selectedBank = useMemo(
    () => config?.banks.find((bank) => bank.id === selectedBankId) || config?.banks[0] || null,
    [config, selectedBankId],
  );

  const selectedBankDone = selectedBank ? bankCompleted[selectedBank.id] || [] : [];
  const bankPercent = selectedBank?.requirements.length
    ? Math.round((selectedBankDone.length / selectedBank.requirements.length) * 100)
    : 0;

  function toggleTask(id: string) {
    setCompleted((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function toggleBankRequirement(id: string) {
    if (!selectedBank) return;
    setBankCompleted((prev) => {
      const current = prev[selectedBank.id] || [];
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      return { ...prev, [selectedBank.id]: next };
    });
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

      <section className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rc-card p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Open Banking / CDR</p>
              <h2 className="mt-1 text-2xl" style={{ fontFamily: "var(--font-display), serif" }}>Bank Connection Status</h2>
            </div>
            <Landmark className="text-[var(--gold-soft)]" size={26} />
          </div>

          {configError ? <p className="mt-4 text-sm text-[var(--danger)]">{configError}</p> : null}
          {!config ? <p className="mt-4 text-sm text-[var(--muted)]">Checking CDR configuration…</p> : (
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">Participation pathway</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs ${config.cdr.configured ? "bg-[var(--gold)]/15 text-[var(--gold-soft)]" : "bg-white/5 text-[var(--muted)]"}`}>
                    {config.cdr.configured ? "Configured" : "Not live yet"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--muted)]">Mode: {config.cdr.mode}</p>
                {config.cdr.providerName ? <p className="text-sm text-[var(--muted)]">Provider: {config.cdr.providerName}</p> : null}
                <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{config.cdr.message}</p>
              </div>

              <button
                type="button"
                disabled={!config.cdr.liveBankDataEnabled}
                className={`rc-btn w-full ${config.cdr.liveBankDataEnabled ? "rc-btn-primary" : "rc-btn-ghost opacity-60"}`}
                title={config.cdr.liveBankDataEnabled ? "Provider authorisation flow will be connected next" : "Requires an approved CDR participation pathway and provider credentials"}
              >
                {config.cdr.liveBankDataEnabled ? "Connect My Bank" : "Connect My Bank — awaiting CDR provider setup"}
              </button>

              <div className="rounded-xl border border-[var(--gold)]/20 bg-[var(--gold)]/5 px-3 py-2 text-xs text-[var(--muted)]">
                Security rule: Royal Command does not collect or store internet-banking passwords. Customer consent and bank/provider authorisation must happen through the approved CDR flow.
              </div>
            </div>
          )}
        </div>

        <div className="rc-card p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Bank Requirements Engine</p>
              <h2 className="mt-1 text-2xl" style={{ fontFamily: "var(--font-display), serif" }}>Choose a Bank</h2>
            </div>
            <Building2 className="text-[var(--gold-soft)]" size={26} />
          </div>

          <label className="mt-4 block text-xs text-[var(--muted)]">Australian lender profile</label>
          <select
            className="rc-input mt-2"
            value={selectedBankId}
            onChange={(e) => setSelectedBankId(e.target.value)}
            disabled={!config}
          >
            {(config?.banks || []).map((bank) => (
              <option key={bank.id} value={bank.id}>{bank.shortName}</option>
            ))}
          </select>

          {selectedBank ? (
            <div className="mt-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span>{selectedBank.shortName} pack readiness</span>
                <span className="text-[var(--gold-soft)]">{bankPercent}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-[var(--gold)] transition-all" style={{ width: `${bankPercent}%` }} />
              </div>
              <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{selectedBank.note}</p>
              <p className="mt-2 text-[11px] text-[var(--muted)]">Source checked: {selectedBank.lastVerified} · {selectedBank.sourceLabel}</p>
            </div>
          ) : null}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-6">
          <div className="rc-card p-5 md:p-6">
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
          </div>

          {selectedBank ? (
            <div className="rc-card p-5 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Selected bank pack</p>
                  <h2 className="mt-1 text-2xl" style={{ fontFamily: "var(--font-display), serif" }}>{selectedBank.shortName} Requirements</h2>
                </div>
                <FileCheck2 className="text-[var(--gold-soft)]" size={26} />
              </div>

              <div className="mt-5 space-y-2">
                {selectedBank.requirements.map((requirement) => {
                  const checked = selectedBankDone.includes(requirement.id);
                  return (
                    <button
                      key={requirement.id}
                      type="button"
                      onClick={() => toggleBankRequirement(requirement.id)}
                      className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${checked ? "border-[var(--gold)]/50 bg-[var(--gold)]/8" : "border-white/10 bg-black/15 hover:border-white/25"}`}
                    >
                      {checked ? <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-[var(--gold-soft)]" /> : <span className="mt-0.5 h-[19px] w-[19px] shrink-0 rounded-full border border-white/25" />}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm">{requirement.label}</div>
                        <div className="mt-1 text-xs capitalize text-[var(--muted)]">{requirement.level.replace("-", " ")}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
                This checklist is preparation guidance, not a promise of approval. Exact requirements vary by product, entity structure, security and the bank's current credit assessment.
              </p>
            </div>
          ) : null}
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
              The common pack and major-bank requirements engine are now wired into the Finance Room. Live CDR bank data remains disabled until Royal Command has an approved CDR representative or accredited-recipient pathway, provider credentials, authorisation flow and required testing.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
