"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "next/navigation";

type ProviderInfo = { id: string; name: string; available: boolean; configured: boolean };
type SourceResponse = { provider: string; content: string; latencyMs?: number; error?: string };
type CapturedRun = { originalPrompt: string; language: string; responses: SourceResponse[] };

type StreamEvent = {
  type?: string;
  result?: { responses?: SourceResponse[] };
};

function parseFinalResult(text: string) {
  let final: StreamEvent["result"] | null = null;
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line) as StreamEvent;
      if (event.type === "final" && event.result) final = event.result;
    } catch {}
  }
  return final;
}

export default function SynthesisBridge() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [captured, setCaptured] = useState<CapturedRun | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  const available = useMemo(() => providers.filter((provider) => provider.available), [providers]);
  const validSources = useMemo(() => {
    const seen = new Set<string>();
    return (captured?.responses || []).filter((item) => {
      if (item.error || !item.content?.trim() || seen.has(item.provider)) return false;
      seen.add(item.provider);
      return true;
    });
  }, [captured]);

  useEffect(() => {
    if (!roomId) return;
    const nativeFetch = window.fetch.bind(window);
    let disposed = false;

    const findTarget = () => {
      const node = document.querySelector(".royal-room-main main > div.fixed:first-of-type > div:first-child");
      if (!disposed && node instanceof HTMLElement) setTarget(node);
    };
    findTarget();
    const observer = new MutationObserver(findTarget);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    void nativeFetch("/api/ai/providers", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!disposed && Array.isArray(data?.connectors)) setProviders(data.connectors);
      })
      .catch(() => {});

    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
      const response = await nativeFetch(input, init);

      if (method === "POST" && rawUrl.endsWith("/api/ai/chat/stream") && response.ok) {
        let requestBody: Record<string, unknown> = {};
        try {
          const bodyText = typeof init?.body === "string" ? init.body : "";
          requestBody = bodyText ? JSON.parse(bodyText) : {};
        } catch {}

        void response.clone().text().then((text) => {
          if (disposed) return;
          const final = parseFinalResult(text);
          const responses = Array.isArray(final?.responses) ? final.responses : [];
          const originalPrompt = typeof requestBody.prompt === "string" ? requestBody.prompt.trim() : "";
          const language = typeof requestBody.language === "string" ? requestBody.language : "ko";
          if (originalPrompt && responses.length) {
            setCaptured({ originalPrompt, language, responses });
            setError("");
            setResult("");
          }
        }).catch(() => {});
      }

      return response;
    }) as typeof window.fetch;

    return () => {
      disposed = true;
      observer.disconnect();
      window.fetch = nativeFetch;
    };
  }, [roomId]);

  async function synthesize(providerId: string) {
    if (!captured || validSources.length < 2 || busy) return;
    setBusy(true);
    setOpen(false);
    setError("");
    setResult("");
    try {
      const response = await fetch("/api/ai/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          originalPrompt: captured.originalPrompt,
          language: captured.language,
          synthesizer: providerId,
          responses: validSources,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "통합 답변을 만들지 못했습니다.");
      setResult(String(data.finalAnswer || ""));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "통합 답변을 만들지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (!target) return null;

  return createPortal(
    <>
      <div className="relative shrink-0" data-rc-synthesis-control="true">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          disabled={busy || validSources.length < 2}
          className="h-7 rounded-md border border-[#d7b64d]/60 bg-[#0b1524] px-2 text-[11px] font-semibold text-[#f4d66c] disabled:cursor-not-allowed disabled:opacity-35"
          title={validSources.length < 2 ? "2개 이상의 AI 답변이 있어야 통합할 수 있습니다." : "통합 답변 AI 선택"}
        >
          {busy ? "통합 중…" : "통합 답변 ▾"}
        </button>

        {open && (
          <div className="absolute right-0 top-8 z-[240] min-w-[190px] rounded-xl border border-[#d7b64d]/50 bg-[#081321] p-2 shadow-2xl">
            <div className="px-2 pb-1 text-[10px] text-[#9aa4b3]">통합할 AI를 선택하세요</div>
            {available.map((provider) => (
              <button
                key={provider.id}
                type="button"
                onClick={() => void synthesize(provider.id)}
                className="block w-full rounded-lg px-2 py-2 text-left text-xs text-[#f4f0e7] hover:bg-white/10"
              >
                {provider.name}
              </button>
            ))}
            {!available.length && <div className="px-2 py-2 text-xs text-[#9aa4b3]">연결된 AI가 없습니다.</div>}
          </div>
        )}
      </div>

      {(result || error) && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 p-4" role="presentation" onClick={() => { setResult(""); setError(""); }}>
          <div className="max-h-[82vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[#d7b64d]/60 bg-[#081321] p-5 text-[#f4f0e7] shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="font-semibold text-[#f4d66c]">통합 답변</div>
              <button type="button" onClick={() => { setResult(""); setError(""); }} className="rounded-lg border border-white/15 px-3 py-1 text-xs">닫기</button>
            </div>
            {error ? <div className="text-sm text-red-200">{error}</div> : <div className="whitespace-pre-wrap text-sm leading-6">{result}</div>}
          </div>
        </div>
      )}
    </>,
    target,
  );
}
