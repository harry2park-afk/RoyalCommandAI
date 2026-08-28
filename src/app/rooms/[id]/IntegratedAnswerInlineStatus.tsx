"use client";

import { useEffect } from "react";

const STYLE_ID = "rc-integrated-answer-inline-style";
const CANCEL_ID = "rc-integrated-answer-inline-cancel";

export default function IntegratedAnswerInlineStatus() {
  useEffect(() => {
    let disposed = false;

    const ensureStyle = () => {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
        @keyframes rcIntegratedSpin { to { transform: rotate(360deg); } }
        button[data-rc-native-synthesis-button="true"][data-rc-inline-working="1"]::before {
          content: "";
          width: 12px;
          height: 12px;
          flex: 0 0 12px;
          border: 2px solid rgba(244,214,108,.32);
          border-top-color: #f4d66c;
          border-radius: 9999px;
          animation: rcIntegratedSpin .75s linear infinite;
        }
        #${CANCEL_ID} {
          height: 30px;
          flex: 0 0 auto;
          padding: 0 10px;
          border: 1px solid rgba(255,255,255,.2);
          border-radius: 6px;
          background: #0b1524;
          color: #f4f0e7;
          font-size: 10px;
          font-weight: 600;
          line-height: 28px;
        }
      `;
      document.head.appendChild(style);
    };

    const sync = () => {
      if (disposed) return;
      ensureStyle();

      const synthesis = document.querySelector<HTMLButtonElement>('button[data-rc-native-synthesis-button="true"]');
      if (!synthesis) return;

      const working = (synthesis.textContent || "").includes("Working");
      synthesis.dataset.rcInlineWorking = working ? "1" : "0";

      const modalCancel = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((button) => {
        if ((button.textContent || "").trim() !== "Cancel") return false;
        return Boolean(button.closest('.fixed.inset-0.z-\\[400\\]'));
      });
      const modalRoot = modalCancel?.closest<HTMLElement>('.fixed.inset-0.z-\\[400\\]') || null;

      let inlineCancel = document.getElementById(CANCEL_ID) as HTMLButtonElement | null;

      if (working) {
        if (modalRoot) modalRoot.style.display = "none";

        if (!inlineCancel) {
          inlineCancel = document.createElement("button");
          inlineCancel.id = CANCEL_ID;
          inlineCancel.type = "button";
          inlineCancel.textContent = "Cancel";
          inlineCancel.title = "Cancel Integrated Answer";
          inlineCancel.addEventListener("click", () => {
            const hiddenCancel = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((button) => {
              if ((button.textContent || "").trim() !== "Cancel") return false;
              return Boolean(button.closest('.fixed.inset-0.z-\\[400\\]'));
            });
            hiddenCancel?.click();
          });
          synthesis.insertAdjacentElement("afterend", inlineCancel);
        }
      } else {
        if (modalRoot) modalRoot.style.display = "";
        inlineCancel?.remove();
      }
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

    return () => {
      disposed = true;
      observer.disconnect();
      document.getElementById(CANCEL_ID)?.remove();
      document.getElementById(STYLE_ID)?.remove();
    };
  }, []);

  return null;
}
