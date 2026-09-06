"use client";

import { useEffect } from "react";

const PROVIDER_NAMES = new Set(["ChatGPT", "Claude", "Gemini", "Grok", "Codex"]);

export default function RCAMultiLayoutEnhancer() {
  useEffect(() => {
    let scheduled = false;

    const applyComposer = () => {
      const textarea = document.querySelector<HTMLTextAreaElement>('textarea[placeholder="Ask the selected AI rooms..."]');
      const form = textarea?.closest("form");
      if (!(form instanceof HTMLFormElement)) return;

      form.dataset.rcComposerEnhanced = "true";
      const mic = form.querySelector<HTMLButtonElement>('button[title="Microphone"]');
      const helper = form.querySelector<HTMLButtonElement>('button[title="AI Helper"]');
      const send = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      const controls = mic?.parentElement;

      if (controls instanceof HTMLElement && helper && send && controls.contains(helper) && controls.contains(send)) {
        controls.dataset.rcComposerControls = "true";
      }
    };

    const apply = () => {
      scheduled = false;
      applyComposer();

      const grids = Array.from(document.querySelectorAll<HTMLElement>("main section.grid"));
      const grid = grids.find((node) => Array.from(node.querySelectorAll("h3")).some((h) => PROVIDER_NAMES.has((h.textContent || "").trim())));
      if (!grid) return;

      grid.dataset.rcMultiAiGrid = "true";
      const cards = Array.from(grid.querySelectorAll<HTMLElement>(":scope > article"));
      const providerCards = cards.filter((card) => PROVIDER_NAMES.has((card.querySelector("h3")?.textContent || "").trim()));

      providerCards.forEach((card) => {
        card.dataset.rcMultiAiCard = "true";
        const selectButton = card.querySelector<HTMLButtonElement>("button");
        const available = !selectButton?.disabled;
        const active = Boolean(selectButton && String(selectButton.className).includes("bg-[#d7b64d]"));

        if (available && !active) {
          selectButton?.click();
          return;
        }

        card.dataset.rcMultiAiActive = active && available ? "true" : "false";
        card.style.display = active && available ? "flex" : "none";
      });

      const visibleCount = providerCards.filter((card) => card.dataset.rcMultiAiActive === "true").length;
      grid.dataset.rcMultiAiCount = String(visibleCount);
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(apply);
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const card = target.closest<HTMLElement>('article[data-rc-multi-ai-card="true"]');
      if (!card) return;
      if (target.closest("button, input, textarea, select, a")) return;
      const expanded = card.dataset.rcMultiAiExpanded === "true";
      card.dataset.rcMultiAiExpanded = expanded ? "false" : "true";
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "disabled"] });
    document.addEventListener("click", onClick, true);
    window.addEventListener("resize", schedule);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <style>{`
      form[data-rc-composer-enhanced="true"] {
        overflow: visible !important;
      }

      form[data-rc-composer-enhanced="true"] > div[data-rc-composer-controls="true"] {
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100% !important;
        height: 100% !important;
        display: block !important;
        pointer-events: none !important;
        z-index: 20 !important;
      }

      form[data-rc-composer-enhanced="true"] button[title="Microphone"] {
        position: absolute !important;
        left: 12px !important;
        right: auto !important;
        bottom: 8px !important;
        pointer-events: auto !important;
        z-index: 24 !important;
      }

      form[data-rc-composer-enhanced="true"] button[title="AI Helper"] {
        position: absolute !important;
        right: 18px !important;
        left: auto !important;
        bottom: -2px !important;
        width: 158px !important;
        height: 164px !important;
        min-width: 158px !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        background-color: transparent !important;
        background-image: url('/ai-helper-woman.svg') !important;
        background-repeat: no-repeat !important;
        background-position: right bottom !important;
        background-size: contain !important;
        box-shadow: none !important;
        color: transparent !important;
        font-size: 0 !important;
        line-height: 0 !important;
        overflow: visible !important;
        pointer-events: auto !important;
        z-index: 22 !important;
      }

      form[data-rc-composer-enhanced="true"] button[title="AI Helper"] > * {
        display: none !important;
      }

      form[data-rc-composer-enhanced="true"] button[title="AI Helper"]::before {
        content: "✦";
        position: absolute;
        left: 8px;
        top: 58px;
        color: rgba(240, 211, 106, 0.88);
        font-size: 22px;
        line-height: 1;
        text-shadow: 18px -7px 0 rgba(240, 211, 106, 0.45);
      }

      form[data-rc-composer-enhanced="true"] button[type="submit"] {
        position: absolute !important;
        right: 3px !important;
        left: auto !important;
        bottom: 3px !important;
        width: 34px !important;
        height: 34px !important;
        min-width: 34px !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        color: rgba(244, 240, 231, 0.70) !important;
        opacity: 0.78 !important;
        pointer-events: auto !important;
        z-index: 26 !important;
      }

      form[data-rc-composer-enhanced="true"] button[type="submit"]:hover {
        color: rgba(248, 223, 122, 0.92) !important;
        opacity: 1 !important;
      }

      form[data-rc-composer-enhanced="true"] button[type="submit"] svg {
        width: 22px !important;
        height: 22px !important;
        stroke-width: 1.25 !important;
      }

      main section[data-rc-multi-ai-grid="true"] {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) !important;
        gap: 10px !important;
        width: 100% !important;
        max-width: none !important;
        max-height: calc(100dvh - 255px) !important;
        overflow-y: auto !important;
        overscroll-behavior: contain;
        padding-right: 2px;
      }

      main section[data-rc-multi-ai-grid="true"] > article[data-rc-multi-ai-card="true"] {
        width: 100% !important;
        min-width: 0 !important;
        min-height: clamp(240px, calc((100dvh - 285px) / 2.18), 355px) !important;
        height: clamp(240px, calc((100dvh - 285px) / 2.18), 355px) !important;
        max-height: clamp(240px, calc((100dvh - 285px) / 2.18), 355px) !important;
        overflow: hidden !important;
        cursor: pointer;
      }

      main section[data-rc-multi-ai-grid="true"] > article[data-rc-multi-ai-card="true"][data-rc-multi-ai-expanded="true"] {
        height: auto !important;
        max-height: none !important;
        min-height: clamp(240px, calc((100dvh - 285px) / 2.18), 355px) !important;
        overflow: visible !important;
      }

      main section[data-rc-multi-ai-grid="true"] > article[data-rc-multi-ai-card="true"] > div:nth-of-type(2) {
        overflow-y: auto !important;
      }

      main section[data-rc-multi-ai-grid="true"] > article:not([data-rc-multi-ai-card="true"]) {
        width: 100% !important;
      }

      @media (max-width: 700px) {
        form[data-rc-composer-enhanced="true"] button[title="AI Helper"] {
          width: 122px !important;
          height: 132px !important;
          min-width: 122px !important;
        }

        main section[data-rc-multi-ai-grid="true"] {
          max-height: none !important;
          overflow-y: visible !important;
        }
        main section[data-rc-multi-ai-grid="true"] > article[data-rc-multi-ai-card="true"] {
          min-height: 280px !important;
          height: 280px !important;
          max-height: 280px !important;
        }
      }
    `}</style>
  );
}
