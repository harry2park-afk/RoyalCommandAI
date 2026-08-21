"use client";

import { useMemo, useState } from "react";
import {
  FX_SERVICE_PERCENT,
  LEGAL_JURISDICTION_PACKS,
  LEGAL_PACK_START_AUD,
  ROOM_MEMBERSHIP_MIN_AUD,
  legalPackMonthlyAud,
  legalRoomMonthlyAud,
} from "@/lib/legal/pricing";

type LegalSelectionDetail = {
  jurisdictions: string[];
  membershipAud: number;
  legalPackAud: number;
  recurringAud: number;
};

function publishSelection(jurisdictions: string[]) {
  const detail: LegalSelectionDetail = {
    jurisdictions,
    membershipAud: ROOM_MEMBERSHIP_MIN_AUD,
    legalPackAud: legalPackMonthlyAud(jurisdictions),
    recurringAud: legalRoomMonthlyAud(jurisdictions),
  };
  window.dispatchEvent(new CustomEvent("rc:legal-jurisdictions", { detail }));
}

export default function LegalMultiCountryPanel() {
  const [selected, setSelected] = useState<string[]>(["AU"]);
  const packs = useMemo(() => LEGAL_JURISDICTION_PACKS, []);
  const packSubtotal = legalPackMonthlyAud(selected);
  const total = legalRoomMonthlyAud(selected);

  function toggle(code: string) {
    setSelected((current) => {
      const next = current.includes(code) ? current.filter((item) => item !== code) : [...current, code];
      publishSelection(next);
      return next;
    });
  }

  return (
    <section className="rounded-2xl border border-[var(--gold)]/30 bg-black/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[var(--gold-soft)]">Multi-country Legal AI Packs</div>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--muted)]">
            국제 법률회사는 한 Legal Room 안에 필요한 국가를 여러 개 추가할 수 있습니다. 국가별 법률 AI/API가 실제 연결된 경우에만 연결 상태를 활성화합니다.
          </p>
        </div>
        <div className="rounded-xl border border-[var(--gold)]/35 bg-black/25 px-3 py-2 text-right text-xs">
          <div>Room membership: <strong>A${ROOM_MEMBERSHIP_MIN_AUD}/mo</strong></div>
          <div>Legal Pack: <strong>A${LEGAL_PACK_START_AUD}/mo부터</strong></div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {packs.map((pack) => {
          const active = selected.includes(pack.code);
          return (
            <button
              key={pack.code}
              type="button"
              onClick={() => toggle(pack.code)}
              className={`rounded-xl border p-3 text-left transition ${active ? "border-[var(--gold)] bg-[var(--gold)]/12" : "border-white/10 bg-black/10"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{pack.country}</span>
                <span className="text-xs text-[var(--gold-soft)]">A${pack.monthlyAud}/mo</span>
              </div>
              <div className="mt-1 text-xs text-[var(--muted)]">{pack.legalSystem} · {pack.currency}</div>
              <div className="mt-2 text-[10px] uppercase tracking-wide text-[var(--muted)]">Connector slot: {pack.aiConnectorId}</div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm md:grid-cols-3">
        <div><span className="text-[var(--muted)]">선택 국가</span><div className="font-semibold">{selected.length}개</div></div>
        <div><span className="text-[var(--muted)]">Legal Packs</span><div className="font-semibold">A${packSubtotal}/mo</div></div>
        <div><span className="text-[var(--muted)]">예상 반복요금</span><div className="font-semibold text-[var(--gold-soft)]">A${total}/mo + tax/FX</div></div>
      </div>

      <p className="mt-3 text-[11px] leading-5 text-[var(--muted)]">
        외화 결제는 실제 결제 시점의 실시간 환율을 사용하고, 환전/결제 서비스가 필요한 경우 최대 {FX_SERVICE_PERCENT}%의 FX/payment service 비용을 가격 엔진에서 반영하도록 설계합니다. 현재 단계에서는 결제사가 연결되지 않았으므로 실제 청구는 아직 실행하지 않습니다.
      </p>
    </section>
  );
}
