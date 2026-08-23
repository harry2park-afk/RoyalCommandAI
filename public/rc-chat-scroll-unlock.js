(() => {
  if (!/^\/rooms\//.test(window.location.pathname)) return;

  const PATCH_FLAG = "rcScrollUnlockPatched";

  function findViewport() {
    return Array.from(document.querySelectorAll("div")).find((el) => {
      const cls = String(el.className || "");
      return cls.includes("overflow-y-auto") && cls.includes("overscroll-contain");
    }) || null;
  }

  function patch() {
    const viewport = findViewport();
    if (!(viewport instanceof HTMLElement)) return;
    if (viewport.dataset[PATCH_FLAG] === "1") return;

    const nativeScrollTo = viewport.scrollTo.bind(viewport);
    viewport.scrollTo = (...args) => {
      const first = args[0];
      if (
        first &&
        typeof first === "object" &&
        first.behavior === "auto" &&
        typeof first.top === "number" &&
        first.top >= viewport.scrollHeight - 2
      ) {
        return;
      }
      nativeScrollTo(...args);
    };

    viewport.dataset[PATCH_FLAG] = "1";
  }

  function patchVoiceLayout() {
    // Main chat voice status: keep it compact (about 30px) and below the text area
    // so dictated text remains visible while the microphone is active.
    const voicePanels = Array.from(document.querySelectorAll("div")).filter((el) => {
      const text = (el.textContent || "").trim();
      const hasArrow = Array.from(el.querySelectorAll("button")).some((button) => (button.textContent || "").trim() === "↑");
      return hasArrow && /입력 준비됨|듣고 있습니다|말씀하세요|실시간 입력 중|마이크/.test(text);
    });

    for (const panel of voicePanels) {
      if (!(panel instanceof HTMLElement)) continue;
      panel.style.height = "30px";
      panel.style.minHeight = "30px";
      panel.style.paddingTop = "0";
      panel.style.paddingBottom = "0";
      panel.style.bottom = "6px";
      panel.style.alignItems = "center";
      panel.style.zIndex = "520";
      const arrow = Array.from(panel.querySelectorAll("button")).find((button) => (button.textContent || "").trim() === "↑");
      if (arrow instanceof HTMLElement) {
        arrow.style.width = "28px";
        arrow.style.height = "28px";
        arrow.style.minWidth = "28px";
      }
      const bars = Array.from(panel.querySelectorAll("span")).filter((span) => {
        const style = span.getAttribute("style") || "";
        return style.includes("height") && span.className.includes("bg-emerald");
      });
      for (const bar of bars) {
        if (bar instanceof HTMLElement) bar.style.maxHeight = "22px";
      }
    }

    // AI Help: move its speaker/wave row below the assistant's text instead of above it.
    const helperImage = document.querySelector('img[alt="Royal Command AI Helper"]');
    const helperPanel = helperImage?.closest("div.fixed") || helperImage?.parentElement?.parentElement?.parentElement;
    if (helperPanel instanceof HTMLElement) {
      const assistantText = Array.from(helperPanel.querySelectorAll("div")).find((el) => {
        const cls = String(el.className || "");
        return cls.includes("min-h-[72px]") && cls.includes("whitespace-pre-wrap");
      });
      const waveRow = Array.from(helperPanel.querySelectorAll("div")).find((el) => {
        if (el === assistantText) return false;
        const spans = el.querySelectorAll("span");
        const hasManyBars = spans.length >= 20;
        const hasRoundIcon = Boolean(el.querySelector("span.rounded-full"));
        return hasManyBars && hasRoundIcon;
      });
      if (assistantText && waveRow && assistantText.parentElement === waveRow.parentElement && assistantText.nextElementSibling !== waveRow) {
        assistantText.insertAdjacentElement("afterend", waveRow);
        if (waveRow instanceof HTMLElement) {
          waveRow.style.marginTop = "4px";
          waveRow.style.marginBottom = "2px";
        }
      }
    }
  }

  function runAll() {
    patch();
    patchVoiceLayout();
  }

  runAll();
  new MutationObserver(runAll).observe(document.documentElement, { childList: true, subtree: true });
})();
