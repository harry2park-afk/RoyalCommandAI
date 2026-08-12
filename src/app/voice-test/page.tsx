"use client";

import { useEffect, useMemo, useState } from "react";
import { PhoneCall, Square, Radio } from "lucide-react";
import { RetellWebClient } from "retell-client-js-sdk";
import { createRetellWebSession, placeTwilioCall } from "@/lib/client/voiceApi";

export default function VoiceTestPage() {
  const client = useMemo(() => new RetellWebClient(), []);
  const [agentId, setAgentId] = useState(process.env.NEXT_PUBLIC_RETELL_TEST_AGENT_ID || "");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [status, setStatus] = useState("준비됨");
  const [error, setError] = useState("");

  useEffect(() => {
    const onStarted = () => { setInCall(true); setStatus("Retell 통화 연결됨"); };
    const onEnded = () => { setInCall(false); setBusy(false); setStatus("통화 종료됨"); };
    const onError = (message: unknown) => {
      setError(typeof message === "string" ? message : "Retell 통화 오류");
      setInCall(false);
      setBusy(false);
      client.stopCall();
    };

    client.on("call_started", onStarted);
    client.on("call_ended", onEnded);
    client.on("error", onError);

    return () => {
      client.off("call_started", onStarted);
      client.off("call_ended", onEnded);
      client.off("error", onError);
      client.stopCall();
    };
  }, [client]);

  async function startRetellTest() {
    if (!agentId.trim()) {
      setError("Retell Agent ID를 입력하세요.");
      return;
    }
    setBusy(true);
    setError("");
    setStatus("세션 생성 중…");
    try {
      const session = await createRetellWebSession(agentId.trim(), {
        metadata: { source: "royal-command-voice-test" },
      });
      setStatus("마이크 연결 중…");
      await client.startCall({ accessToken: session.data.accessToken });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Retell 연결 실패");
      setBusy(false);
      setInCall(false);
    }
  }

  async function stopRetellTest() {
    client.stopCall();
    setInCall(false);
    setBusy(false);
    setStatus("통화 종료됨");
  }

  async function startTwilioTest() {
    if (!phone.trim()) {
      setError("수신 전화번호를 E.164 형식으로 입력하세요. 예: +61…");
      return;
    }
    setBusy(true);
    setError("");
    setStatus("Twilio 발신 요청 중…");
    try {
      const call = await placeTwilioCall({ to: phone.trim() });
      setStatus(`Twilio 발신 접수: ${call.data.sid}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Twilio 발신 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl p-6 md:p-10">
      <div className="rounded-2xl border border-white/10 bg-black/30 p-5 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <Radio className="text-[var(--gold-soft)]" />
          <div>
            <h1 className="text-xl font-semibold text-[var(--gold-soft)]">실시간 통화 테스트</h1>
            <p className="text-xs text-[var(--muted)]">Direct Execution Controller · Retell Web Call · Twilio Voice</p>
          </div>
        </div>

        <section className="mb-6 rounded-xl border border-white/10 p-4">
          <h2 className="mb-3 text-sm font-semibold">Retell AI 브라우저 통화</h2>
          <input
            className="rc-input mb-3 w-full"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            placeholder="Retell Agent ID"
          />
          {!inCall ? (
            <button type="button" disabled={busy} onClick={() => void startRetellTest()} className="rc-btn rc-btn-primary flex items-center gap-2 disabled:opacity-50">
              <PhoneCall size={16} /> 실시간 통화 테스트
            </button>
          ) : (
            <button type="button" onClick={() => void stopRetellTest()} className="rc-btn flex items-center gap-2 border border-red-400/30 text-red-200">
              <Square size={16} /> 통화 종료
            </button>
          )}
        </section>

        <section className="rounded-xl border border-white/10 p-4">
          <h2 className="mb-3 text-sm font-semibold">Twilio 전화 발신 테스트</h2>
          <input
            className="rc-input mb-3 w-full"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+61…"
            inputMode="tel"
          />
          <button type="button" disabled={busy} onClick={() => void startTwilioTest()} className="rc-btn rc-btn-primary flex items-center gap-2 disabled:opacity-50">
            <PhoneCall size={16} /> Twilio 테스트 발신
          </button>
        </section>

        <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
          <div>상태: {status}</div>
          {error ? <div className="mt-2 text-red-300">오류: {error}</div> : null}
        </div>
      </div>
    </main>
  );
}
