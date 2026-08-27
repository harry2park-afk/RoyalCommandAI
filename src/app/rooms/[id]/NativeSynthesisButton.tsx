"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type IntegratorOption = {
  id: string;
  name: string;
  connected: boolean;
};

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

export default function NativeSynthesisButton() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);

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
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#d7b64d]/60 bg-[#081321] text-[#f4f0e7] shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div>
                <div className="text-base font-semibold text-[#f4d66c]">Integrated Answer</div>
                <div className="mt-1 text-xs text-[#9aa4b3]">3 Connected · 7 Not Connected</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs">Close</button>
            </div>

            <div className="max-h-[62vh] overflow-y-auto p-2">
              {INTEGRATOR_OPTIONS.map((model, index) => (
                <div key={model.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-white/[0.04]">
                  <span className="w-5 shrink-0 text-right text-xs text-[#7f8998]">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{model.name}</span>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${model.connected ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-white/[0.03] text-[#7f8998]"}`}>
                    {model.connected ? "Connected" : "Not Connected"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>,
    host,
  );
}
