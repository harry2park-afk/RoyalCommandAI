"use client";

import { useEffect } from "react";

const PROVIDER_NAMES = new Set(["ChatGPT", "Claude", "Gemini", "Grok", "Codex"]);

export default function RCAMultiLayoutEnhancer() {
  useEffect(() => {
    let scheduled = false;

    const apply = () => {
      scheduled = false;
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
