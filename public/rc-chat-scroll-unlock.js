(() => {
  if (!/^\/rooms\//.test(window.location.pathname)) return;

  const PATCH_FLAG = "rcScrollUnlockPatched";
  const TOOLBOX_STYLE_ID = "rcToolboxLowerCompactStyle";

  function ensureToolboxLayoutStyle() {
    if (document.getElementById(TOOLBOX_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = TOOLBOX_STYLE_ID;
    style.textContent = `
      textarea[placeholder*="Type or speak your order"] {
        height: 101px !important;
        min-height: 101px !important;
        max-height: 101px !important;
      }

      [data-rc-chat-toolbox="true"] {
        height: 28px !important;
        min-height: 28px !important;
        max-height: 28px !important;
        margin-top: 0 !important;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
        gap: 6px !important;
        align-items: center !important;
      }

      [data-rc-chat-toolbox="true"] [data-rc-toolbox-slot="clip"],
      [data-rc-chat-toolbox="true"] [data-rc-toolbox-slot="mic"] {
        width: 28px !important;
        height: 24px !important;
        min-width: 28px !important;
        min-height: 24px !important;
        border-radius: 8px !important;
      }

      [data-rc-chat-toolbox="true"] [data-rc-toolbox-slot="clip"] button,
      [data-rc-chat-toolbox="true"] [data-rc-toolbox-slot="mic"] button {
        width: 28px !important;
        height: 24px !important;
        min-width: 28px !important;
        min-height: 24px !important;
        padding: 0 !important;
      }

      [data-rc-chat-toolbox="true"] [data-rc-toolbox-slot="clip"] svg,
      [data-rc-chat-toolbox="true"] [data-rc-toolbox-slot="mic"] svg {
        width: 15px !important;
        height: 15px !important;
      }

      [data-rc-chat-toolbox="true"] [data-rc-toolbox-slot="wave"] {
        height: 24px !important;
        min-height: 24px !important;
        max-height: 24px !important;
        width: 205px !important;
        border-radius: 8px !important;
      }

      [data-rc-chat-toolbox="true"] [data-rc-toolbox-slot="ai-help"] {
        height: 24px !important;
        min-height: 24px !important;
        max-height: 24px !important;
        border-radius: 8px !important;
      }

      button[title="AI Help"] {
        height: 30px !important;
        min-height: 30px !important;
        max-height: 30px !important;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
        transform: translateY(6px) !important;
      }

      [data-rc-chat-toolbox="true"] [data-rc-toolbox-slot="send"] button {
        position: static !important;
        width: auto !important;
        height: 24px !important;
        min-height: 24px !important;
        padding: 0 10px !important;
        border-radius: 8px !important;
        font-size: 10px !important;
        line-height: 1 !important;
      }

      [data-rc-chat-toolbox="true"] [data-rc-toolbox-slot="send"] button svg {
        width: 12px !important;
        height: 12px !important;
      }
    `;
    document.head.appendChild(style);
  }

  function findViewport() {
    return Array.from(document.querySelectorAll("div")).find((el) => {
      const cls = String(el.className || "");
      return cls.includes("overflow-y-auto") && cls.includes("overscroll-contain");
    }) || null;
  }

  function patchScroll() {
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
      ) return;
      nativeScrollTo(...args);
    };

    viewport.dataset[PATCH_FLAG] = "1";
  }

  function findMainComposer() {
    return Array.from(document.querySelectorAll("textarea")).find((textarea) => {
      const placeholder = textarea.getAttribute("placeholder") || "";
      return /type or speak your order|화면 캡처|order/i.test(placeholder);
    }) || null;
  }

  function findMainMicButton() {
    const textarea = findMainComposer();
    const root = textarea?.closest("form") || textarea?.parentElement?.parentElement || textarea?.parentElement;
    if (!root) return null;

    return Array.from(root.querySelectorAll("button"))
      .filter((button) => Boolean(button.querySelector("svg.lucide-mic")))
      .map((button) => ({ button, rect: button.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width > 8 && rect.height > 8 && rect.bottom > 0 && rect.right > 0)
      .sort((a, b) => (b.rect.top - a.rect.top) || (b.rect.left - a.rect.left))[0]?.button || null;
  }

  function findMainVoicePanel() {
    return Array.from(document.querySelectorAll("div.fixed")).find((panel) => {
      const hasTextArrow = Array.from(panel.querySelectorAll("button")).some((button) => (button.textContent || "").trim() === "↑");
      const text = (panel.textContent || "").trim();
      return hasTextArrow && /입력 준비됨|듣고 있습니다|말씀하세요|실시간 입력 중|계속 듣고 있습니다|마이크/.test(text);
    }) || null;
  }

  function compactPanel(panel) {
    if (!(panel instanceof HTMLElement)) return;
    panel.style.height = "30px";
    panel.style.minHeight = "30px";
    panel.style.maxHeight = "30px";
    panel.style.padding = "0 8px";
    panel.style.gap = "7px";
    panel.style.borderRadius = "10px";
    panel.style.alignItems = "center";
    panel.style.whiteSpace = "nowrap";
    panel.style.pointerEvents = "none";

    const wave = Array.from(panel.querySelectorAll("div")).find((el) => el.getAttribute("aria-label") === "Live microphone level");
    if (wave instanceof HTMLElement) {
      wave.style.height = "22px";
      wave.style.maxHeight = "22px";
      wave.style.gap = "2px";
      Array.from(wave.querySelectorAll("span")).forEach((bar) => {
        if (bar instanceof HTMLElement) {
          bar.style.width = "2px";
          bar.style.maxHeight = "20px";
        }
      });
    }

    Array.from(panel.querySelectorAll("button")).forEach((button) => {
      button.style.pointerEvents = "auto";
    });
  }

  function positionMainVoicePanel() {
    const mic = findMainMicButton();
    const panel = findMainVoicePanel();
    if (!(mic instanceof HTMLElement) || !(panel instanceof HTMLElement)) return;

    compactPanel(panel);

    const micRect = mic.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const gap = 18;
    const rightLeft = micRect.right + gap;
    const leftLeft = micRect.left - panelRect.width - gap;
    const left = rightLeft + panelRect.width <= window.innerWidth - 8
      ? rightLeft
      : Math.max(8, leftLeft);
    const top = Math.max(8, Math.min(window.innerHeight - 38, micRect.top + (micRect.height - 30) / 2));

    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.transform = "none";
  }

  function run() {
    ensureToolboxLayoutStyle();
    patchScroll();
    positionMainVoicePanel();
  }

  run();
  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("resize", positionMainVoicePanel);
  window.addEventListener("scroll", positionMainVoicePanel, true);
  window.setInterval(positionMainVoicePanel, 150);
})();
