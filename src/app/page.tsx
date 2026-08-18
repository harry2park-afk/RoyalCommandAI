"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import RoyalGateBackground from "@/components/RoyalGateBackground";

const SELECTED_LANGUAGE_KEY = "royalcommand:selected-language";

type HomeCopy = {
  beta: string;
  construction: string;
  upgrade: string;
  registration: string;
  authorised: string;
  member: string;
  signIn: string;
};

const EN_COPY: HomeCopy = {
  beta: "PRIVATE BETA",
  construction: "UNDER CONSTRUCTION",
  upgrade: "Royal Command is currently being upgraded for our next business release.",
  registration: "New customer registration is temporarily closed.",
  authorised: "Existing authorised members only",
  member: "Existing Member",
  signIn: "Sign in",
};

const KO_COPY: HomeCopy = {
  beta: "비공개 베타",
  construction: "현재 개발 중입니다",
  upgrade: "Royal Command는 다음 비즈니스 출시를 위해 현재 업그레이드 중입니다.",
  registration: "신규 고객 등록은 현재 일시 중단되어 있습니다.",
  authorised: "기존 승인 회원 전용",
  member: "기존 회원",
  signIn: "로그인",
};

function normaliseLocale(value: string | null) {
  if (!value) return "en-AU";
  if (value === "ko") return "ko-KR";
  if (value === "en") return "en-AU";
  return value;
}

function copyForLocale(locale: string) {
  if (locale.toLowerCase().startsWith("ko")) return KO_COPY;
  if (locale.toLowerCase().startsWith("en")) return EN_COPY;
  return null;
}

async function translateLine(text: string, locale: string) {
  const res = await fetch("/api/ai/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, targetLanguage: locale }),
  });
  if (!res.ok) throw new Error("Homepage translation failed");
  const data = await res.json();
  return typeof data?.translated === "string" && data.translated.trim() ? data.translated.trim() : text;
}

export default function HomePage() {
  const [locale, setLocale] = useState("en-AU");
  const [remoteCopy, setRemoteCopy] = useState<HomeCopy | null>(null);

  useEffect(() => {
    const applySavedLanguage = () => {
      const next = normaliseLocale(window.localStorage.getItem(SELECTED_LANGUAGE_KEY));
      setLocale(next);
      document.documentElement.lang = next;
    };

    applySavedLanguage();
    window.addEventListener("storage", applySavedLanguage);
    window.addEventListener("focus", applySavedLanguage);
    document.addEventListener("visibilitychange", applySavedLanguage);
    return () => {
      window.removeEventListener("storage", applySavedLanguage);
      window.removeEventListener("focus", applySavedLanguage);
      document.removeEventListener("visibilitychange", applySavedLanguage);
    };
  }, []);

  useEffect(() => {
    setRemoteCopy(null);
    if (copyForLocale(locale)) return;

    const cacheKey = `royalcommand:homepage-copy:${locale}`;
    try {
      const cached = window.localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as HomeCopy;
        if (parsed?.construction && parsed?.signIn) {
          setRemoteCopy(parsed);
          return;
        }
      }
    } catch {}

    let cancelled = false;
    void Promise.all([
      translateLine(EN_COPY.beta, locale),
      translateLine(EN_COPY.construction, locale),
      translateLine(EN_COPY.upgrade, locale),
      translateLine(EN_COPY.registration, locale),
      translateLine(EN_COPY.authorised, locale),
      translateLine(EN_COPY.member, locale),
      translateLine(EN_COPY.signIn, locale),
    ]).then(([beta, construction, upgrade, registration, authorised, member, signIn]) => {
      if (cancelled) return;
      const next = { beta, construction, upgrade, registration, authorised, member, signIn };
      setRemoteCopy(next);
      try { window.localStorage.setItem(cacheKey, JSON.stringify(next)); } catch {}
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [locale]);

  const copy = useMemo(() => copyForLocale(locale) || remoteCopy || EN_COPY, [locale, remoteCopy]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05070b]">
      <RoyalGateBackground />

      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/20 via-black/5 to-black/70" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-between px-5 py-7 text-center">
        <div className="pt-2">
          <div
            className="text-2xl tracking-[0.14em] text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.95)] md:text-3xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            ROYAL COMMAND<span className="text-[var(--gold)]"> AI</span>
          </div>
        </div>

        <div className="w-full max-w-4xl rounded-3xl border-2 border-[#d7b64d] bg-black/75 px-6 py-8 shadow-[0_0_55px_rgba(215,182,77,0.28)] backdrop-blur-md md:px-10 md:py-10">
          <p className="text-sm font-semibold tracking-[0.28em] text-[#f1d889] md:text-base">
            {copy.beta}
          </p>
          <h1
            className="mt-3 text-4xl font-bold tracking-[0.08em] text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.95)] md:text-6xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            {copy.construction}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/85 md:text-lg">
            {copy.upgrade}
          </p>
          <p className="mt-2 text-sm text-[#f1d889] md:text-base">
            {copy.registration}
          </p>
        </div>

        <div className="mb-8 w-full max-w-2xl rounded-2xl border border-[#c9a84f]/45 bg-black/50 p-5 shadow-2xl backdrop-blur-sm md:p-7">
          <p className="mb-5 text-sm tracking-[0.14em] text-[#f1d889] md:text-base">
            {copy.authorised}
          </p>

          <Link
            href="/login"
            className="block rounded-xl border border-[#d7b64d]/75 bg-[#0b0d12]/90 px-5 py-4 text-white transition hover:border-[#f3d36b] hover:bg-[#151923]"
          >
            <span className="block text-lg font-semibold">{copy.member}</span>
            <span className="mt-1 block text-sm text-white/70">{copy.signIn}</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
