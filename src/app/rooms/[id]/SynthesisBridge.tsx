"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "next/navigation";

type ProviderInfo = { id: string; name: string; available: boolean; configured: boolean };
type IntegratorInfo = { id: string; providerId: string; displayName: string; available: boolean };
type SourceResponse = { provider: string; content: string; latencyMs?: number; error?: string };
type CapturedRun = { originalPrompt: string; language: string; responses: SourceResponse[] };
type RoomMessage = { content?: unknown; author_type?: unknown; authorType?: unknown };
type SynthesisResult = { modelId: string; modelName: string; answer: string; latencyMs?: number };
type StreamEvent = { type?: string; result?: { responses?: SourceResponse[] } };

const RCA_LAST_RUN_KEY = "royalcommand:rca:last-run:v1";
const RCA_LAST_RUN_EVENT = "rca:last-run";
const RCA_LAST_INTEGRATOR_KEY = "royalcommand:rca:last-integrator:v1";
const RCA_CONVERSATIONS_KEY = "royalcommand:rca:conversations:v4";
const RCA_ACTIVE_KEY = "royalcommand:room:rca:active-conversation";
const RCA_PROVIDER_BY_HEADING: Record<string, string> = {
  ChatGPT: "openai",
  Claude: "anthropic",
  Gemini: "google",
  Grok: "xai",
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

function parseCapturedRun(value: unknown): CapturedRun | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const originalPrompt = typeof item.originalPrompt === "string" ? item.originalPrompt.trim() : "";
  const language = typeof item.language === "string" && item.language.trim() ? item.language.trim() : "ko";
  const rawResponses = Array.isArray(item.responses) ? item.responses : [];
  const responses: SourceResponse[] = rawResponses.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const response = raw as Record<string, unknown>;
    const provider = typeof response.provider === "string" ? response.provider.trim() : "";
    const content = typeof response.content === "string" ? response.content : "";
    if (!provider) return [];
    return [{
      provider,
      content,
      ...(typeof response.latencyMs === "number" ? { latencyMs: response.latencyMs } : {}),
      ...(typeof response.error === "string" && response.error ? { error: response.error } : {}),
    }];
  });
  if (!originalPrompt || !responses.length) return null;
  return { originalPrompt, language, responses };
}

function restoreCapturedFromMessages(value: unknown): CapturedRun | null {
  const rawMessages = Array.isArray(value) ? value : [];
  const messages: RoomMessage[] = rawMessages.filter((item): item is RoomMessage => Boolean(item && typeof item === "object"));
  let lastUserIndex = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const author = messages[index].author_type ?? messages[index].authorType;
    if (author === "user") { lastUserIndex = index; break; }
  }
  if (lastUserIndex < 0) return null;
  const userContent = messages[lastUserIndex]?.content;
  const originalPrompt = typeof userContent === "string" ? userContent.trim() : "";
  if (!originalPrompt) return null;

  const seen = new Set<string>();
  const responses: SourceResponse[] = [];
  for (const message of messages.slice(lastUserIndex + 1)) {
    const author = message.author_type ?? message.authorType;
    if (author !== "ai" || typeof message.content !== "string") continue;
    const match = message.content.trim().match(/^###\s+(ChatGPT|Claude|Gemini|Grok)\s*\n([\s\S]*)$/);
    if (!match) continue;
    const provider = RCA_PROVIDER_BY_HEADING[match[1]];
    const answer = match[2]?.trim() || "";
    if (!provider || !answer || seen.has(provider)) continue;
    seen.add(provider);
    responses.push({ provider, content: answer });
  }
  if (responses.length < 2) return null;
  return { originalPrompt, language: "ko", responses };
}

function restoreCapturedFromLocalStorage(): CapturedRun | null {
  try {
    const conversations = JSON.parse(localStorage.getItem(RCA_CONVERSATIONS_KEY) || "[]");
    if (!Array.isArray(conversations)) return null;
    const activeId = sessionStorage.getItem(RCA_ACTIVE_KEY) || localStorage.getItem("rca-active") || "";
    const conversation = conversations.find((item) => item?.id === activeId && item?.status !== "archived")
      || conversations.find((item) => item?.status !== "archived");
    return restoreCapturedFromMessages(conversation?.messages);
  } catch {
    return null;
  }
}

function validResponses(run: CapturedRun | null) {
  const seen = new Set<string>();
  return (run?.responses || []).filter((item) => {
    if (item.error || !item.content?.trim() || seen.has(item.provider)) return false;
    seen.add(item.provider);
    return true;
  });
}

export default function SynthesisBridge() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const isRca = roomId === "rca";
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [integrators, setIntegrators] = useState<IntegratorInfo[]>([]);
  const [lastIntegratorId, setLastIntegratorId] = useState(() => {
    if (typeof window === "undefined") return "";
    try { return localStorage.getItem(RCA_LAST_INTEGRATOR_KEY) || ""; } catch { return ""; }
  });
  const [captured, setCaptured] = useState<CapturedRun | null>(null);
  const [open, setOpen] = useState(false);
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [results, setResults] = useState<SynthesisResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const availableProviders = useMemo(() => providers.filter((provider) => provider.available), [providers]);
  const orderedIntegrators = useMemo(() => {
    if (!lastIntegratorId) return integrators;
    return [...integrators].sort((a, b) => a.id === lastIntegratorId ? -1 : b.id === lastIntegratorId ? 1 : 0);
  }, [integrators, lastIntegratorId]);
  const validSources = useMemo(() => validResponses(captured), [captured]);

  const acceptCaptured = useCallback((run: CapturedRun | null) => {
    if (!run) return false;
    setCaptured(run);
    setError("");
    setResults([]);
    setShowResults(false);
    if (isRca) {
      try { sessionStorage.setItem(RCA_LAST_RUN_KEY, JSON.stringify(run)); } catch {}
    }
    return true;
  }, [isRca]);

  async function recoverRcaRun() {
    let restored: CapturedRun | null = null;
    try { restored = parseCapturedRun(JSON.parse(sessionStorage.getItem(RCA_LAST_RUN_KEY) || "null")); } catch {}
    if (!restored) restored = restoreCapturedFromLocalStorage();
    if (!restored) {
      try {
        const response = await fetch("/api/rooms/rca", { cache: "no-store" });
        const data = response.ok ? await response.json() : null;
        restored = restoreCapturedFromMessages(data?.messages);
      } catch {}
    }
    if (restored && validResponses(restored).length >= 2) {
      acceptCaptured(restored);
      return restored;
    }
    return null;
  }

  async function ensureRcaSession() {
    try {
      let response = await fetch("/api/au-v2/session", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data?.active) return true;
      response = await fetch("/api/au-v2/enter", { method: "POST" });
      return response.ok;
    } catch {
      return false;
    }
  }

  useEffect(() => {
    if (!roomId) return;
    const nativeFetch = window.fetch.bind(window);
    let disposed = false;
    let host: HTMLElement | null = null;

    const findTarget = () => {
      const dock = document.querySelector(".royal-room-main main > div.fixed:first-of-type > div:nth-child(2)");
      if (!(dock instanceof HTMLElement) || disposed) return;
      let node = document.getElementById("rc-synthesis-host");
      if (!(node instanceof HTMLElement)) {
        node = document.createElement("div");
        node.id = "rc-synthesis-host";
        node.setAttribute("data-rc-synthesis-host", "true");
        node.style.cssText = "position:relative;order:-2;flex:0 0 auto;display:flex;align-items:center;height:30px;min-width:94px;z-index:20;";
        dock.prepend(node);
      }
      host = node;
      setTarget(node);
    };

    findTarget();
    const observer = new MutationObserver(findTarget);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    if (isRca) {
      void nativeFetch("/api/au-v2/integrators", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : null)
        .then((data) => { if (!disposed && Array.isArray(data?.integrators)) setIntegrators(data.integrators); })
        .catch(() => {});

      const handleLastRun = (event: Event) => {
        const detail = event instanceof CustomEvent ? event.detail : null;
        acceptCaptured(parseCapturedRun(detail));
      };
      window.addEventListener(RCA_LAST_RUN_EVENT, handleLastRun);

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
            if (originalPrompt && responses.length) acceptCaptured({ originalPrompt, language, responses });
          }).catch(() => {});
        }
        return response;
      }) as typeof window.fetch;

      return () => {
        disposed = true;
        observer.disconnect();
        window.removeEventListener(RCA_LAST_RUN_EVENT, handleLastRun);
        window.fetch = nativeFetch;
        host?.remove();
      };
    }

    void nativeFetch("/api/ai/providers", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (!disposed && Array.isArray(data?.connectors)) setProviders(data.connectors); })
      .catch(() => {});

    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
      const response = await nativeFetch(input, init);
      if (method === "POST" && rawUrl.endsWith("/api/ai/chat/stream") && response.ok) {
        let requestBody: Record<string, unknown> = {};
        try { const bodyText = typeof init?.body === "string" ? init.body : ""; requestBody = bodyText ? JSON.parse(bodyText) : {}; } catch {}
        void response.clone().text().then((text) => {
          if (disposed) return;
          const final = parseFinalResult(text);
          const responses = Array.isArray(final?.responses) ? final.responses : [];
          const originalPrompt = typeof requestBody.prompt === "string" ? requestBody.prompt.trim() : "";
          const language = typeof requestBody.language === "string" ? requestBody.language : "ko";
          if (originalPrompt && responses.length) acceptCaptured({ originalPrompt, language, responses });
        }).catch(() => {});
      }
      return response;
    }) as typeof window.fetch;

    return () => {
      disposed = true;
      observer.disconnect();
      window.fetch = nativeFetch;
      host?.remove();
    };
  }, [roomId, isRca, acceptCaptured]);

  async function toggleSynthesis() {
    if (isRca && validSources.length < 2) {
      const restored = await recoverRcaRun();
      if (!restored) {
        setError("현재 질문에 2개 이상의 AI 답변을 찾지 못했습니다. 4AI 답변이 화면에 나온 뒤 다시 눌러 주세요.");
        setShowResults(true);
        return;
      }
    }
    setError("");
    setOpen((value) => !value);
  }

  async function synthesizeRca(model: IntegratorInfo) {
    if (!model.available || busyIds.includes(model.id)) return;
    const run = validSources.length >= 2 ? captured : await recoverRcaRun();
    const sources = validResponses(run);
    if (!run || sources.length < 2) {
      setError("통합할 AI 답변을 찾지 못했습니다.");
      setShowResults(true);
      return;
    }
    if (!await ensureRcaSession()) {
      setError("RCA 통합 세션을 시작하지 못했습니다.");
      setShowResults(true);
      return;
    }

    setBusyIds((ids) => [...ids, model.id]);
    setError("");
    setLastIntegratorId(model.id);
    try { localStorage.setItem(RCA_LAST_INTEGRATOR_KEY, model.id); } catch {}
    try {
      const response = await fetch("/api/au-v2/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalPrompt: run.originalPrompt, modelId: model.id, responses: sources }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `${model.displayName} 통합 답변을 만들지 못했습니다.`);
      const answer = String(data.finalAnswer || "").trim();
      if (!answer) throw new Error(`${model.displayName} 통합 답변이 비어 있습니다.`);
      const result: SynthesisResult = {
        modelId: model.id,
        modelName: String(data.modelName || model.displayName),
        answer,
        ...(typeof data.latencyMs === "number" ? { latencyMs: data.latencyMs } : {}),
      };
      setResults((items) => [result, ...items.filter((item) => item.modelId !== model.id)]);
      setShowResults(true);
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `${model.displayName} 통합 답변을 만들지 못했습니다.`);
      setShowResults(true);
    } finally {
      setBusyIds((ids) => ids.filter((id) => id !== model.id));
    }
  }

  async function synthesizeLegacy(providerId: string) {
    if (!captured || validSources.length < 2 || busyIds.includes(providerId)) return;
    setBusyIds((ids) => [...ids, providerId]);
    setOpen(false);
    setError("");
    try {
      const response = await fetch("/api/ai/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, originalPrompt: captured.originalPrompt, language: captured.language, synthesizer: providerId, responses: validSources }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "통합 답변을 만들지 못했습니다.");
      const answer = String(data.finalAnswer || "").trim();
      if (!answer) throw new Error("통합 답변이 비어 있습니다.");
      setResults([{ modelId: providerId, modelName: providerId, answer }]);
      setShowResults(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "통합 답변을 만들지 못했습니다.");
      setShowResults(true);
    } finally {
      setBusyIds((ids) => ids.filter((id) => id !== providerId));
    }
  }

  if (!target) return null;
  const anyBusy = busyIds.length > 0;
  const disabled = !isRca && validSources.length < 2;

  return createPortal(
    <>
      <div className="relative flex h-[30px] min-w-[94px] shrink-0 items-center" data-rc-synthesis-control="true">
        <button
          type="button"
          onClick={() => void toggleSynthesis()}
          disabled={disabled}
          className="h-[30px] min-w-[94px] rounded-md border border-[#FFD700]/80 bg-[#7A0C2E] px-2 font-[Times_New_Roman] text-[11px] font-semibold text-[#FFF3D6] disabled:bg-[#2b3440] disabled:text-[#a7adb6] disabled:opacity-100"
          title={disabled ? "2개 이상의 AI 답변이 있어야 통합할 수 있습니다." : "통합 답변 AI 선택"}
        >
          {anyBusy ? `통합 중 ${busyIds.length}` : "통합 답변 ▾"}
        </button>

        {open && (
          <div className="fixed left-3 top-[96px] z-[260] max-h-[420px] min-w-[230px] overflow-y-auto rounded-xl border border-[#d7b64d]/50 bg-[#081321] p-2 shadow-2xl">
            <div className="px-2 pb-1 text-[10px] text-[#9aa4b3]">통합할 AI 모델을 선택하세요</div>
            {isRca ? orderedIntegrators.map((model, index) => (
              <button
                key={model.id}
                type="button"
                disabled={!model.available || busyIds.includes(model.id)}
                onClick={() => void synthesizeRca(model)}
                className="block w-full rounded-lg px-2 py-2 text-left text-xs text-[#f4f0e7] hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {index === 0 && model.id === lastIntegratorId ? "★ " : ""}{model.displayName}{busyIds.includes(model.id) ? " — 통합 중…" : ""}
              </button>
            )) : availableProviders.map((provider) => (
              <button key={provider.id} type="button" onClick={() => void synthesizeLegacy(provider.id)} className="block w-full rounded-lg px-2 py-2 text-left text-xs text-[#f4f0e7] hover:bg-white/10">
                {provider.name}
              </button>
            ))}
            {isRca && !orderedIntegrators.length && <div className="px-2 py-2 text-xs text-[#9aa4b3]">통합 모델 목록을 불러오지 못했습니다.</div>}
          </div>
        )}
      </div>

      {showResults && (results.length > 0 || error) && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 p-4" role="presentation" onClick={() => setShowResults(false)}>
          <div className="max-h-[82vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[#d7b64d]/60 bg-[#081321] p-5 text-[#f4f0e7] shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="font-semibold text-[#f4d66c]">통합 답변 {results.length ? `(${results.length})` : ""}</div>
              <button type="button" onClick={() => setShowResults(false)} className="rounded-lg border border-white/15 px-3 py-1 text-xs">닫기</button>
            </div>
            {error && <div className="mb-4 rounded-lg border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-200">{error}</div>}
            <div className="space-y-4">
              {results.map((item) => (
                <article key={item.modelId} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-2 text-sm font-semibold text-[#f4d66c]">통합 답변 — {item.modelName}{typeof item.latencyMs === "number" ? ` · ${(item.latencyMs / 1000).toFixed(1)}초` : ""}</div>
                  <div className="whitespace-pre-wrap text-sm leading-6">{item.answer}</div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </>,
    target,
  );
}