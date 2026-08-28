"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "next/navigation";

type IntegratorOption = {
  id: string;
  name: string;
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

type RunPhase = "idle" | "running" | "success" | "error";

const INTEGRATOR_OPTIONS: readonly IntegratorOption[] = [
  { id: "openai:gpt-5.6-sol", name: "GPT-5.6 Sol", connected: true },
  { id: "google:gemini-3.7-flash", name: "Gemini 3.7 Flash", connected: true },
  { id: "xai:grok-4.5", name: "Grok 4.5", connected: true },
  { id: "anthropic:claude-opus-5", name: "Claude Opus 5", connected: false },
  { id: "anthropic:claude-sonnet-5", name: "Claude Sonnet 5", connected: false },
  { id: "google:gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview", connected: false },
  { id: "openai:gpt-5.6-terra", name: "GPT-5.6 Terra", connected: false },
  { id: "deepseek:deepseek-v4-pro", name: "DeepSeek V4 Pro", connected: false },
  { id: "cohere:command-a-plus-05-2026", name: "Cohere Command A+", connected: false },
  { id: "perplexity:sonar-pro", name: "Perplexity Sonar Pro", connected: false },
] as const;

const CONNECTED_MODEL_IDS = new Set(
  INTEGRATOR_OPTIONS.filter((model) => model.connected).map((model) => model.id),
);
const DEFAULT_SELECTION = ["openai:gpt-5.6-sol"];
const PROVIDER_BY_HEADING: Record<string, SourceAnswer["provider"]> = {
  ChatGPT: "openai",
  Claude: "anthropic",
  Gemini: "google",
  Grok: "xai",
};

function readSavedSelection(roomId: string) {
  if (typeof window === "undefined") return DEFAULT_SELECTION;
  try {
    const storageKey = `royalcommand:room:${roomId}:integrated-answer-models`;
    const stored = JSON.parse(localStorage.getItem(storageKey) || "[]") as unknown;
    const valid = Array.isArray(stored)
      ? stored.filter((id): id is string => typeof id === "string" && CONNECTED_MODEL_IDS.has(id))
      : [];
    return valid.length ? Array.from(new Set(valid)) : DEFAULT_SELECTION;
  } catch {
    return DEFAULT_SELECTION;
  }
}

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
  const storageKey = `royalcommand:room:${roomId}:integrated-answer-models`;
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [runPhase, setRunPhase] = useState<RunPhase>("idle");
  const [runMessage, setRunMessage] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selected, setSelected] = useState<string[]>(() => readSavedSelection(roomId));
  const [draftSelected, setDraftSelected] = useState<string[]>(() => readSavedSelection(roomId));

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

  useEffect(() => {
    if (!running) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  function openChooser() {
    if (running) return;
    setDraftSelected(selected);
    setRunPhase("idle");
    setRunMessage("");
    setOpen(true);
  }

  function toggleModel(model: IntegratorOption) {
    if (!model.connected || running) return;
    setDraftSelected((current) =>
      current.includes(model.id)
        ? current.filter((id) => id !== model.id)
        : [...current, model.id],
    );
  }

  async function saveAndRun() {
    if (running) return;
    const clean = Array.from(new Set(draftSelected.filter((id) => CONNECTED_MODEL_IDS.has(id))));
    setSelected(clean);
    try {
      localStorage.setItem(storageKey, JSON.stringify(clean));
    } catch {}

    if (!clean.length) {
      setRunPhase("error");
      setRunMessage("Select at least one Connected model.");
      return;
    }

    const names = clean.map((id) => INTEGRATOR_OPTIONS.find((item) => item.id === id)?.name || id);
    setElapsedSeconds(0);
    setRunning(true);
    setRunPhase("running");
    setRunMessage(`${names.join(" + ")} is creating the Integrated Answer…`);

    try {
      const roomResponse = await fetch(`/api/rooms/${roomId}`, { cache: "no-store" });
      const roomData = await roomResponse.json().catch(() => ({}));
      if (!roomResponse.ok) throw new Error(roomData?.error || "Current Room could not be read.");

      const run = recoverLatestRun(roomData?.messages);
      if (!run) throw new Error("At least two current AI answers are required before creating an Integrated Answer.");

      const results = await Promise.all(clean.map(async (modelId) => {
        const model = INTEGRATOR_OPTIONS.find((item) => item.id === modelId);
        const response = await fetch("/api/ai/integrated-answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            originalPrompt: run.originalPrompt,
            language: roomData?.user?.defaultLanguage || "ko",
            modelId,
            responses: run.responses,
          }),
        });
        const data = await response.json().catch(() => ({}));
        return {
          ok: response.ok,
          name: model?.name || modelId,
          error: response.ok ? "" : messageText(data?.error || "Integrated Answer failed."),
        };
      }));

      const failed = results.filter((item) => !item.ok);
      const succeeded = results.filter((item) => item.ok);
      if (succeeded.length) {
        setRunning(false);
        setRunPhase("success");
        setRunMessage(
          failed.length
            ? `${succeeded.length} completed. Failed: ${failed.map((item) => item.name).join(", ")}. Loading completed answer(s)…`
            : `${succeeded.map((item) => item.name).join(" + ")} completed. Loading answer(s)…`,
        );
        window.setTimeout(() => window.location.reload(), 1100);
        return;
      }

      throw new Error(failed.map((item) => `${item.name}: ${item.error}`).join("\n") || "Integrated Answer failed.");
    } catch (error) {
      setRunning(false);
      setRunPhase("error");
      setRunMessage(error instanceof Error ? error.message : "Integrated Answer failed.");
    }
  }

  function cancelAndClose() {
    if (running) return;
    setDraftSelected(selected);
    setRunPhase("idle");
    setRunMessage("");
    setOpen(false);
  }

  if (!host) return null;

  return createPortal(
    <>
      <button
        type="button"
        onClick={openChooser}
        disabled={running}
        className="flex h-8 min-w-[116px] shrink-0 items-center justify-center gap-1 rounded-md border-[2px] border-[#FFD700]/80 bg-[#0b1524] px-3 text-[10px] font-semibold text-[#f4d66c] disabled:opacity-60"
        title="Integrated Answer"
        data-rc-native-synthesis-button="true"
      >
        <span>{running ? "Working…" : "Integrated Answer"}</span>
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[400] flex items-start justify-center bg-black/70 px-4 pb-4 pt-[105px]"
          role="presentation"
          onClick={running ? undefined : cancelAndClose}
        >
          <div className="flex max-h-[76vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#d7b64d]/60 bg-[#081321] text-[#f4f0e7] shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div>
                <div className="text-base font-semibold text-[#f4d66c]">Integrated Answer</div>
                <div className="mt-1 text-xs text-[#9aa4b3]">
                  {draftSelected.length} Selected · 3 Connected · 7 Not Connected
                </div>
              </div>
              <button
                type="button"
                onClick={cancelAndClose}
                disabled={running}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                Cancel
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto p-2">
              {INTEGRATOR_OPTIONS.map((model, index) => {
                const checked = draftSelected.includes(model.id);
                return (
                  <button
                    key={model.id}
                    type="button"
                    disabled={!model.connected || running}
                    onClick={() => toggleModel(model)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${model.connected && !running ? "hover:bg-white/[0.07]" : "cursor-not-allowed opacity-55"}`}
                    aria-pressed={checked}
                  >
                    <span className="w-5 shrink-0 text-right text-xs text-[#7f8998]">{index + 1}</span>
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border text-xs font-bold ${checked ? "border-emerald-400 bg-emerald-500/20 text-emerald-300" : "border-white/20 text-transparent"}`}>
                      ✓
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{model.name}</span>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${model.connected ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-white/[0.03] text-[#7f8998]"}`}>
                      {model.connected ? "Connected" : "Not Connected"}
                    </span>
                  </button>
                );
              })}
            </div>

            {runPhase !== "idle" && (
              <div className={`mx-4 mb-3 rounded-xl border px-4 py-3 ${runPhase === "error" ? "border-red-400/30 bg-red-500/10 text-red-200" : runPhase === "success" ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : "border-[#d7b64d]/35 bg-[#d7b64d]/10 text-[#f4d66c]"}`}>
                <div className="flex items-center gap-3">
                  {runPhase === "running" && (
                    <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[#d7b64d]/30 border-t-[#f4d66c]" aria-hidden="true" />
                  )}
                  {runPhase === "success" && <span className="text-lg">✓</span>}
                  {runPhase === "error" && <span className="text-lg">!</span>}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{runMessage}</div>
                    {runPhase === "running" && (
                      <div className="mt-1 text-xs text-[#c9b96f]">Working · {elapsedSeconds}s elapsed</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
              <div className="text-xs text-[#9aa4b3]">
                {running ? "Please wait. This window will stay open until the Integrated Answer finishes." : "Select connected models. Done will create one Integrated Answer per selected model."}
              </div>
              <button
                type="button"
                onClick={() => void saveAndRun()}
                disabled={running}
                className="rounded-lg border border-[#d7b64d]/70 bg-[#d7b64d]/10 px-5 py-2 text-sm font-semibold text-[#f4d66c] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {running ? "Working…" : "Done"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>,
    host,
  );
}
