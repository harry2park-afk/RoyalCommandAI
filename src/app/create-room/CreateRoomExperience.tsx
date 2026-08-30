"use client";

import { useMemo, useState } from "react";
import CreateRoomPremiumWizard from "./CreateRoomPremiumWizard";

type CustomerInfo = {
  id: string;
  fullName: string;
  email: string;
  defaultLanguage: string;
  phone: string;
  address: string;
};

function initialLocale(code: string) {
  const value = code.toLowerCase();
  if (value.startsWith("ko")) return "ko";
  if (value.startsWith("ja")) return "ja";
  if (value.startsWith("zh")) return "zh";
  if (value.startsWith("vi")) return "vi";
  if (value.startsWith("id")) return "id";
  if (value.startsWith("th")) return "th";
  if (value.startsWith("hi")) return "hi";
  return "en";
}

export default function CreateRoomExperience({ customer }: { customer: CustomerInfo }) {
  const locale = useMemo(() => initialLocale(customer.defaultLanguage), [customer.defaultLanguage]);
  const isKorean = locale === "ko";
  const [roomName, setRoomName] = useState("");

  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 pt-7 md:px-8 md:pt-10">
        <section className="rounded-[28px] border border-[var(--gold)]/35 bg-black/25 p-5 shadow-[0_20px_70px_rgba(0,0,0,.25)] md:p-7">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--gold-soft)]">Royal Command · {isKorean ? "가입 고객 정보" : "Customer Profile"}</div>
          <h1 className="mt-2 text-2xl font-semibold md:text-3xl">{isKorean ? "먼저 가입 정보를 확인해 주세요" : "First, confirm your account details"}</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{isKorean ? "이미 가입할 때 등록된 정보는 다시 입력하지 않습니다. 저장되지 않은 항목만 나중에 보완할 수 있습니다." : "Information already saved at sign-up is shown automatically. Only missing details need to be added later."}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Info label={isKorean ? "성명" : "Name"} value={customer.fullName || (isKorean ? "등록되지 않음" : "Not registered")} />
            <Info label={isKorean ? "이메일" : "Email"} value={customer.email || (isKorean ? "등록되지 않음" : "Not registered")} />
            <Info label={isKorean ? "고객 ID" : "Customer ID"} value={customer.id || (isKorean ? "로그인 필요" : "Sign-in required")} />
            <Info label={isKorean ? "전화번호" : "Phone"} value={customer.phone || (isKorean ? "등록되지 않음" : "Not registered")} />
            <Info label={isKorean ? "주소" : "Address"} value={customer.address || (isKorean ? "등록되지 않음" : "Not registered")} />
            <Info label={isKorean ? "기본 언어" : "Default language"} value={customer.defaultLanguage || "en"} />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
            <label className="block">
              <span className="text-sm font-semibold text-[var(--gold-soft)]">{isKorean ? "이 Room의 이름을 정해 주세요" : "Choose a name for this Room"}</span>
              <input className="rc-input mt-2" value={roomName} onChange={(event) => setRoomName(event.target.value.slice(0, 120))} placeholder={isKorean ? "예: 박 회계사 사무실" : "e.g. Park Accounting Office"} />
              <p className="mt-2 text-xs text-[var(--muted)]">{isKorean ? "고객이 원하는 이름으로 정하고 나중에도 변경할 수 있습니다." : "Choose the Room name you want and change it later if needed."}</p>
            </label>

            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="text-sm font-semibold text-emerald-200">{isKorean ? "가입 고객 무료 AI 교육·수료증 혜택" : "Free AI training & certificate benefit"}</div>
              <div className="mt-2 text-sm leading-6">{isKorean ? "US$3.80 이상 Room 플랜 가입 고객은 30일 AI 교육, 기본 시험 5회, 70점 이상 합격 시 Royal Command 전자 수료증을 무료로 받을 수 있습니다. 불합격 시 2주 추가 학습과 새 시험 5회를 합격할 때까지 무료로 반복 제공합니다." : "Members on Room plans starting at US$3.80 receive the 30-day AI training program, five exam attempts per cycle, and a free Royal Command electronic Certificate of Completion after achieving 70% or higher. If not passed, an extra two-week study period and five new attempts are provided until passed."}</div>
            </div>
          </div>
        </section>
      </div>

      <CreateRoomPremiumWizard initialLocale={locale} initialRoomName={roomName} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/10 p-4"><div className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">{label}</div><div className="mt-1 break-words text-sm font-semibold">{value}</div></div>;
}
