"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "next/navigation";

type IntegratorOption = {
  id: string;
  name: string;
  providerId?: "openai" | "google" | "xai";
  connected: boolean;
};

type RoomMessage = {
  content?: unknown;
  author_type?: unknown;
  authorType?: unknown;
};

type SourceAnswer = {
  provider: "openai" | "anthropic" | "google" | "xai";
  content: string;
};

type IntegratedResult = {
  modelId: string;
  modelName: string;
  answer: string;
  latencyMs?: number;
};

const INTEGRATOR_OPTIONS: readonly IntegratorOption[] = [
  { id: "openai:gpt-5.6-sol", name: "GPT-5.6 Sol", providerId: "openai", connected: true },
  { id: "google:gemini-3.7-flash", name: "Gemini 3.7 Flash", providerId: "google", connected: true },
  { id: "xai:grok-4.5", name: "Grok 4.5", providerId: "xai", connected: true },
  { id: "anthropic:claude-opus-5", name: "Claude Opus 5", connected: false },
  { id: "anthropic:claude-sonnet-5", name: "Claude Sonnet 5", connected: false },
  { id: "google:gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview", connected: false },
  { id: "openai:gpt-5.6-terra", name: "GPT-5.6 Terra", connected: false },
  { id: "deepseek:deepseek-v4-pro", name: "DeepSeek V4 Pro", connected: false },
  { id: "cohere:command-a-plus-05-2026", name: "Cohere Command A+", connected: false },
  { id: "perplexity:sonar-pro", name: "Perplexity Sonar Pro", connected: false },
] as const;

const PROVIDER_BY_HEADING: Record<string, SourceAnswer["provider"]> = {
  ChatGPT: "openai",
  Claude: "anthropic",
  Gemini: "google",
  Grok: "xai",
};

function messageText(value: unknown) {
  return typeof value === "string" ? value : String(value ?? "");
}

function parseSourceSections(text: string): SourceAnswer[] {
  const heading = /^###\s+(ChatGPT|Claude|Gemini|Grok)\s*$/gm;
  const matches = Array.from(text.matchAll(heading));
  const answers: SourceAnswer[] = [];
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const provider = PROVIDER_BY_HEADING[match[1]];
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < matches.length ? (matches[index + 1].index ?? text.length) : text.length;
    const content = text.slice(start, end).trim();
    if (provider && content.length > 1) answers.push({ provider, content });
  }
  return answers;
}

function recoverLatestRun(messagesValue: unknown) {
  const messages = Array.isArray(messagesValue)
    ? messagesValue.filter((item): item is RoomMessage => Boolean(item && typeof item === "object"))
    : [];
  let userIndex = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const author = messages[index].author_type ?? messages[index].authorType;
    if (author === "user") {
      userIndex = index;
      break;
    }
  }
  if (userIndex < 0) return null;

  const originalPrompt = messageText(messages[userIndex].content).trim();
  if (!originalPrompt) return null;

  const byProvider = new Map<SourceAnswer["provider"], SourceAnswer>();
  for (const message of messages.slice(userIndex + 1)) {
    const author = message.author_type ?? message.authorType;
    if (author === "user") break;
    if (author !== "ai") continue;
    for (const answer of parseSourceSections(messageText(message.content))) {
      if (!byProvider.has(answer.provider)) byProvider.set(answer.provider, answer);
    }
  }

  const responses = Array.from(byProvider.values());
  return responses.length >= 2 ? { originalPrompt, responses } : null;
}

export default function NativeSynthesisButton() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [busyModelId, setBusyModelId] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState<IntegratedResult[]>([]);

  const options = useMemo(() => INTEGRATOR_OPTIONS, []);

  useEffect(() => {
    let disposed = false;
    let wrapper: HTMLElement | null = null;

    const mount = () => {
      if (disposed) return;
      const warehouse = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
        (button.textContent || "").includes("AI Warehouse") ||
        (button.getAttribute("title") || "").includes("AI Warehouse"),
      );
      const dock = warehouse?.parentElement;
      if (!(warehouse instanceof HTMLButtonElement) || !(dock instanceof HTMLElement)) return;

      let node = document.getElementById("rc-native-synthesis-host");
      if (!(node instanceof HTMLElement)) {
        node = document.createElement("div");
        node.id = "rc-native-synthesis-host";
        node.style.cssText = "order:-2;flex:0 0 auto;display:flex;align-items:center;height:30px;min-width:116px;position:relative;z-index:20;";
        dock.insertBefore(node, warehouse);
      }
      wrapper = node;
      setHost(node);
    };

    mount();
    const observer = new MutationObserver(mount);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    return () => {
      disposed = true;
      observer.disconnect();
      wrapper?.remove();
    };
  }, []);

  async function runIntegratedAnswer(model: IntegratorOption) {
    if (!model.connected || !model.providerId || busyModelId) return;
    setBusyModelId(model.id);
    setError("");

    try {
      const roomResponse = await fetch(`/api/rooms/${roomId}`, { cache: "no-store" });
      const roomData = await roomResponse.json().catch(() => ({}));
      if (!roomResponse.ok) throw new Error(roomData?.error || "Current Room could not be read.");

      const run = recoverLatestRun(roomData?.messages);
      if (!run) throw new Error("At least two current AI answers are required before creating an Integrated Answer.");

      const response = await fetch("/api/ai/integrated-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          originalPrompt: run.originalPrompt,
          language: roomData?.user?.defaultLanguage || "ko",
          modelId: model.id,
          responses: run.responses,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `${model.name} could not create an Integrated Answer.`);
      const answer = messageText(data?.finalAnswer).trim();
      if (!answer) throw new Error(`${model.name} returned an empty Integrated Answer.`);

      const result: IntegratedResult = {
        modelId: model.id,
        modelName: messageText(data?.modelName || model.name),
        answer,
        ...(typeof data?.latencyMs === "number" ? { latencyMs: data.latencyMs } : {}),
      };
      setResults((current) => [result, ...current.filter((item) => item.modelId !== model.id)]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Integrated Answer failed.");
    } finally {
      setBusyModelId("");
    }
  }

  if (!host) return null;

  return createPortal(
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 min-w-[116px] shrink-0 items-center justify-center gap-1 rounded-md border-[2px] border-[#FFD700]/80 bg-[#0b1524] px-3 text-[10px] font-semibold text-[#f4d66c]"
        title="Integrated Answer"
        data-rc-native-synthesis-button="true"
      >
        <span>Integrated Answer</span>
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[400] flex items-start justify-center bg-black/70 px-4 pb-4 pt-[105px]" role="presentation" onClick={() => setOpen(false)}>
          <div className="flex max-h-[76vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#d7b64d]/60 bg-[#081321] text-[#f4f0e7] shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div>
                <div className="text-base font-semibold text-[#f4d66c]">Integrated Answer</div>
                <div className="mt-1 text-xs text-[#9aa4b3]">3 Connected · 7 Not Connected</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs">Close</button>
            </div>

            <div className="min-h-0 overflow-y-auto p-2">
              {error && <div className="mx-2 mb-2 rounded-lg border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-200">{error}</div>}

              {options.map((model, index) => (
                <button
                  key={model.id}
                  type="button"
                  disabled={!model.connected || Boolean(busyModelId)}
                  onClick={() => void runIntegratedAnswer(model)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${model.connected ? "hover:bg-white/[0.07]" : "cursor-not-allowed opacity-55"}`}
                >
                  <span className="w-5 shrink-0 text-right text-xs text-[#7f8998]">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{model.name}</span>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${model.connected ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-white/[0.03] text-[#7f8998]"}`}>
                    {busyModelId === model.id ? "Working…" : model.connected ? "Connected" : "Not Connected"}
                  </span>
                </button>
              ))}

              {results.length > 0 && (
                <div className="mt-3 space-y-3 border-t border-white/10 p-2 pt-4">
                  {results.map((result) => (
                    <article key={result.modelId} className="rounded-xl border border-[#d7b64d]/25 bg-white/[0.03] p-4">
                      <div className="mb-2 text-sm font-semibold text-[#f4d66c]">
                        {result.modelName}{typeof result.latencyMs === "number" ? ` · ${(result.latencyMs / 1000).toFixed(1)}s` : ""}
                      </div>
                      <div className="whitespace-pre-wrap text-sm leading-6 text-[#e8e6dd]">{result.answer}</div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>,
    host,
  );
}
