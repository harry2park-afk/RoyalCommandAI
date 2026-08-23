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

  function patchMainVoiceLayout() {
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
        return style.includes("height") && String(span.className).includes("bg-emerald");
      });
      for (const bar of bars) {
        if (bar instanceof HTMLElement) bar.style.maxHeight = "22px";
      }
    }
  }

  function ensureHelperBottomWave(form, inputRow, helperPanel) {
    let wave = form.querySelector('[data-rc-helper-bottom-wave="1"]');
    if (!(wave instanceof HTMLElement)) {
      wave = document.createElement("div");
      wave.dataset.rcHelperBottomWave = "1";
      wave.style.position = "absolute";
      wave.style.left = "48px";
      wave.style.right = "48px";
      wave.style.bottom = "3px";
      wave.style.height = "34px";
      wave.style.display = "flex";
      wave.style.alignItems = "center";
      wave.style.justifyContent = "center";
      wave.style.gap = "3px";
      wave.style.pointerEvents = "none";
      for (let i = 0; i < 24; i += 1) {
        const bar = document.createElement("span");
        bar.style.display = "block";
        bar.style.width = "2px";
        bar.style.height = `${8 + ((i * 7) % 20)}px`;
        bar.style.borderRadius = "999px";
        bar.style.background = "#d7b64d";
        bar.style.opacity = "0.5";
        bar.style.transformOrigin = "center";
        bar.style.transition = "transform 90ms linear, opacity 90ms linear";
        wave.appendChild(bar);
      }
      form.appendChild(wave);
    }

    const status = (helperPanel.textContent || "").toLowerCase();
    const live = /듣고 있습니다|말씀을 듣고|실시간 입력|listening|hearing/.test(status);
    const bars = Array.from(wave.querySelectorAll("span"));
    const tick = Math.floor(Date.now() / 90);
    bars.forEach((bar, index) => {
      if (!(bar instanceof HTMLElement)) return;
      const phase = ((tick + index * 3) % 9) / 8;
      const scale = live ? 0.55 + Math.abs(Math.sin(phase * Math.PI * 2)) * 0.75 : 0.55;
      bar.style.transform = `scaleY(${scale})`;
      bar.style.opacity = live ? "0.95" : "0.45";
    });

    inputRow.style.position = "relative";
    inputRow.style.paddingBottom = "42px";
    inputRow.style.minHeight = "82px";
  }

  function patchHelperLayout() {
    const helperImage = document.querySelector('img[alt="Royal Command AI Helper"]');
    const helperPanel = helperImage?.closest("div.fixed") || helperImage?.parentElement?.parentElement?.parentElement;
    if (!(helperPanel instanceof HTMLElement)) return;

    const assistantText = Array.from(helperPanel.querySelectorAll("div")).find((el) => {
      const cls = String(el.className || "");
      return cls.includes("min-h-[72px]") && cls.includes("whitespace-pre-wrap");
    });

    const oldWaveRow = Array.from(helperPanel.querySelectorAll("div")).find((el) => {
      const spans = el.querySelectorAll("span");
      const hasManyBars = spans.length >= 20;
      const hasSpeaker = Boolean(el.querySelector('button[title*="speaker"]'));
      return hasManyBars && hasSpeaker;
    });

    // Keep the independent AI Help speaker visible, but hide the old waveform beside it.
    if (oldWaveRow instanceof HTMLElement) {
      oldWaveRow.style.height = "34px";
      oldWaveRow.style.marginTop = "2px";
      oldWaveRow.style.marginBottom = "0";
      const speaker = oldWaveRow.querySelector('button[title*="speaker"]');
      const children = Array.from(oldWaveRow.children);
      for (const child of children) {
        if (child === speaker) continue;
        if (child instanceof HTMLElement) child.style.display = "none";
      }
      if (assistantText && assistantText.parentElement === oldWaveRow.parentElement && assistantText.nextElementSibling !== oldWaveRow) {
        assistantText.insertAdjacentElement("afterend", oldWaveRow);
      }
    }

    const form = helperPanel.querySelector("form");
    if (!(form instanceof HTMLFormElement)) return;
    const inputRow = form.firstElementChild;
    if (!(inputRow instanceof HTMLElement)) return;

    form.style.position = "relative";
    form.style.paddingBottom = "0";
    inputRow.style.position = "relative";

    const micButton = Array.from(inputRow.querySelectorAll("button")).find((button) => /microphone/i.test(button.title || ""));
    const sendButton = Array.from(inputRow.querySelectorAll("button")).find((button) => /send/i.test(button.title || ""));
    const textarea = inputRow.querySelector("textarea");

    if (textarea instanceof HTMLElement) {
      textarea.style.width = "100%";
      textarea.style.paddingRight = "4px";
      textarea.style.paddingBottom = "4px";
      textarea.style.minHeight = "42px";
    }

    if (micButton instanceof HTMLElement) {
      micButton.style.position = "absolute";
      micButton.style.left = "2px";
      micButton.style.bottom = "2px";
      micButton.style.width = "36px";
      micButton.style.height = "36px";
      micButton.style.zIndex = "4";
    }

    if (sendButton instanceof HTMLElement) {
      sendButton.style.position = "absolute";
      sendButton.style.right = "2px";
      sendButton.style.bottom = "2px";
      sendButton.style.width = "36px";
      sendButton.style.height = "36px";
      sendButton.style.zIndex = "4";
    }

    ensureHelperBottomWave(form, inputRow, helperPanel);
  }

  function runAll() {
    patch();
    patchMainVoiceLayout();
    patchHelperLayout();
  }

  runAll();
  const observer = new MutationObserver(runAll);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setInterval(() => {
    patchHelperLayout();
  }, 120);
})();
