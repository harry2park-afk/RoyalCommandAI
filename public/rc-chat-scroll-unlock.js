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
        overflow: hidden !important;
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

  function findMainVoicePanel() {
    return Array.from(document.querySelectorAll("div.fixed")).find((panel) => {
      const hasTextArrow = Array.from(panel.querySelectorAll("button")).some((button) => (button.textContent || "").trim() === "↑");
      const text = (panel.textContent || "").trim();
      return hasTextArrow && /입력 준비됨|듣고 있습니다|말씀하세요|실시간 입력 중|계속 듣고 있습니다|마이크/.test(text);
    }) || null;
  }

  function dockMainVoicePanel() {
    const slot = document.getElementById("rc-main-wave-slot");
    const panel = findMainVoicePanel();
    if (!(slot instanceof HTMLElement) || !(panel instanceof HTMLElement)) return;

    if (panel.parentElement !== slot) slot.appendChild(panel);

    panel.style.position = "static";
    panel.style.left = "auto";
    panel.style.top = "auto";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.transform = "none";
    panel.style.width = "100%";
    panel.style.maxWidth = "100%";
    panel.style.height = "24px";
    panel.style.minHeight = "24px";
    panel.style.maxHeight = "24px";
    panel.style.padding = "0 4px";
    panel.style.margin = "0";
    panel.style.gap = "4px";
    panel.style.border = "0";
    panel.style.borderRadius = "8px";
    panel.style.background = "transparent";
    panel.style.boxShadow = "none";
    panel.style.backdropFilter = "none";
    panel.style.zIndex = "auto";
    panel.style.alignItems = "center";
    panel.style.overflow = "hidden";
    panel.style.pointerEvents = "none";

    const wave = Array.from(panel.querySelectorAll("div")).find((el) => el.getAttribute("aria-label") === "Live microphone level");
    if (wave instanceof HTMLElement) {
      wave.style.height = "20px";
      wave.style.minHeight = "20px";
      wave.style.maxHeight = "20px";
      wave.style.gap = "2px";
      wave.style.flexShrink = "0";
      Array.from(wave.querySelectorAll("span")).forEach((bar) => {
        if (bar instanceof HTMLElement) {
          bar.style.width = "2px";
          bar.style.maxHeight = "18px";
        }
      });
    }

    Array.from(panel.querySelectorAll("span")).forEach((label) => {
      if (label.closest('[aria-label="Live microphone level"]')) return;
      if (!(label instanceof HTMLElement)) return;
      label.style.fontSize = "9px";
      label.style.lineHeight = "1";
      label.style.overflow = "hidden";
      label.style.textOverflow = "ellipsis";
      label.style.whiteSpace = "nowrap";
      label.style.minWidth = "0";
      label.style.flex = "1 1 auto";
    });

    Array.from(panel.querySelectorAll("button")).forEach((button) => {
      button.style.display = "none";
    });
  }

  function run() {
    ensureToolboxLayoutStyle();
    patchScroll();
    dockMainVoicePanel();
  }

  run();
  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
