"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function NativeSynthesisButton() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [testOpen, setTestOpen] = useState(false);

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
        onClick={() => setTestOpen(true)}
        className="flex h-8 min-w-[116px] shrink-0 items-center justify-center gap-1 rounded-md border-[2px] border-[#FFD700]/80 bg-[#0b1524] px-3 text-[10px] font-semibold text-[#f4d66c]"
        title="통합 답변"
        data-rc-native-synthesis-button="true"
      >
        <span>통합 답변</span>
      </button>

      {testOpen && createPortal(
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 p-4" role="presentation" onClick={() => setTestOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-[#d7b64d]/60 bg-[#081321] p-5 text-center text-[#f4f0e7] shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="text-base font-semibold text-[#f4d66c]">통합 답변 버튼 연결 정상</div>
            <div className="mt-2 text-sm text-[#d6d9df]">버튼 클릭이 정상적으로 작동합니다.</div>
            <button type="button" onClick={() => setTestOpen(false)} className="mt-4 rounded-lg border border-white/15 px-4 py-2 text-sm">닫기</button>
          </div>
        </div>,
        document.body,
      )}
    </>,
    host,
  );
}
