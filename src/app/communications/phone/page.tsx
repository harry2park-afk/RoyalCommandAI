"use client";

import { useEffect, useState } from "react";

type PhoneProfile = {
  phoneE164: string;
  countryCode: string | null;
  regionCode: string | null;
  verified: boolean;
  verifiedAt: string | null;
};

export default function RCPhonePage() {
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("AU");
  const [region, setRegion] = useState("NSW");
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [provider, setProvider] = useState<boolean | null>(null);
  const [status, setStatus] = useState("불러오는 중… / Loading…");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const [profileRes, providerRes] = await Promise.all([
      fetch("/api/communications/phone-profile", { cache: "no-store" }),
      fetch("/api/communications/provider-status", { cache: "no-store" }),
    ]);
    const profilePayload = await profileRes.json().catch(() => ({})) as { profile?: PhoneProfile; error?: string };
    const providerPayload = await providerRes.json().catch(() => ({})) as { providers?: { twilio?: { configured?: boolean } } };
    if (profilePayload.profile) {
      setPhone(profilePayload.profile.phoneE164 || "");
      setCountry(profilePayload.profile.countryCode || "AU");
      setRegion(profilePayload.profile.regionCode || "");
      setVerified(Boolean(profilePayload.profile.verified));
    }
    setProvider(Boolean(providerPayload.providers?.twilio?.configured));
    setStatus("");
  }

  useEffect(() => { void refresh(); }, []);

  async function savePhone() {
    setBusy(true); setStatus("전화번호 저장 중… / Saving phone number…");
    try {
      const response = await fetch("/api/communications/phone-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneE164: phone.trim(), countryCode: country.trim() || null, regionCode: region.trim() || null, useAsDefaultOutbound: true }),
      });
      const payload = await response.json().catch(() => ({})) as { profile?: PhoneProfile; error?: string };
      if (!response.ok || !payload.profile) { setStatus(payload.error || "저장 실패 / Save failed"); return; }
      setVerified(Boolean(payload.profile.verified));
      setStatus("저장했습니다. / Saved.");
    } finally { setBusy(false); }
  }

  async function sendCode() {
    setBusy(true); setStatus("인증문자 보내는 중… / Sending verification SMS…");
    try {
      const response = await fetch("/api/communications/phone-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send" }),
      });
      const payload = await response.json().catch(() => ({})) as { sent?: boolean; error?: string };
      setStatus(response.ok && payload.sent ? "인증문자를 보냈습니다. / Verification SMS sent." : (payload.error || "인증문자를 보내지 못했습니다. / Could not send verification SMS."));
    } finally { setBusy(false); }
  }

  async function checkCode() {
    setBusy(true); setStatus("인증 확인 중… / Checking code…");
    try {
      const response = await fetch("/api/communications/phone-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check", code: code.trim() }),
      });
      const payload = await response.json().catch(() => ({})) as { verified?: boolean; error?: string };
      if (response.ok && payload.verified) { setVerified(true); setStatus("전화번호 인증 완료. / Phone verified."); }
      else setStatus(payload.error || "인증번호가 맞지 않습니다. / Verification failed.");
    } finally { setBusy(false); }
  }

  async function testCall() {
    setBusy(true); setStatus("테스트 전화 연결 중… / Starting test call…");
    try {
      const response = await fetch("/api/communications/test-call", { method: "POST" });
      const payload = await response.json().catch(() => ({})) as { started?: boolean; status?: string; error?: string };
      setStatus(response.ok && payload.started ? `테스트 전화 시작됨 (${payload.status || "queued"}). / Test call started.` : (payload.error || "테스트 전화 실패 / Test call failed"));
    } finally { setBusy(false); }
  }

  return (
    <main className="min-h-dvh bg-[#06101c] px-4 py-8 text-white">
      <section className="mx-auto max-w-xl rounded-2xl border border-[#d7b64d]/60 bg-[#07111f] p-5 shadow-2xl">
        <h1 className="text-xl font-bold text-[#f3d36a]">Royal Command Phone</h1>
        <p className="mt-1 text-sm text-white/60">전화번호를 한 번 등록·인증하면 PC와 모바일 웹에서 같은 계정으로 사용합니다.</p>

        <div className="mt-5 space-y-3">
          <label className="block text-xs text-white/60">내 전화번호 / My phone number (국제형식, 예: +61…)</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-white/15 bg-black/25 px-3 py-2" placeholder="+61..." />
          <div className="grid grid-cols-2 gap-2">
            <input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} className="rounded-lg border border-white/15 bg-black/25 px-3 py-2" placeholder="AU" maxLength={2} />
            <input value={region} onChange={(e) => setRegion(e.target.value.toUpperCase())} className="rounded-lg border border-white/15 bg-black/25 px-3 py-2" placeholder="NSW" />
          </div>
          <button disabled={busy} onClick={() => void savePhone()} className="w-full rounded-lg border border-[#d7b64d] bg-[#7A0C2E] px-4 py-2 font-semibold text-[#ffe18a] disabled:opacity-50">전화번호 저장 / Save phone</button>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-sm">인증 상태 / Verification: <b className={verified ? "text-emerald-300" : "text-amber-300"}>{verified ? "완료 / Verified" : "미인증 / Not verified"}</b></div>
            <div className="mt-3 flex gap-2">
              <button disabled={busy || verified} onClick={() => void sendCode()} className="flex-1 rounded-lg border border-white/15 px-3 py-2 text-sm disabled:opacity-40">인증문자 받기 / Send code</button>
              <input value={code} onChange={(e) => setCode(e.target.value)} className="w-28 rounded-lg border border-white/15 bg-black/25 px-3 py-2" placeholder="Code" />
              <button disabled={busy || verified || !code.trim()} onClick={() => void checkCode()} className="rounded-lg border border-white/15 px-3 py-2 text-sm disabled:opacity-40">확인 / Verify</button>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
            전화 Provider / Phone provider: <b className={provider ? "text-emerald-300" : "text-amber-300"}>{provider === null ? "확인 중…" : provider ? "연결됨 / Connected" : "미연결 / Not connected"}</b>
          </div>

          <button disabled={busy || !verified || !provider} onClick={() => void testCall()} className="w-full rounded-lg border border-[#d7b64d] bg-[#7A0C2E] px-4 py-3 font-bold text-[#ffe18a] disabled:opacity-40">📞 내 번호로 테스트 전화 / Test call my phone</button>

          {status ? <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/75">{status}</div> : null}
        </div>
      </section>
    </main>
  );
}
