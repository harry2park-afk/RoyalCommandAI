(() => {
  if (!/^\/rooms\//.test(window.location.pathname)) return;

  const PATCH_FLAG = "rcScrollUnlockPatched";

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
      ) {
        return;
      }
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

    const visibleMics = Array.from(root.querySelectorAll("button"))
      .filter((button) => Boolean(button.querySelector("svg.lucide-mic")))
      .map((button) => ({ button, rect: button.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width > 8 && rect.height > 8 && rect.bottom > 0 && rect.right > 0)
      .sort((a, b) => (b.rect.top - a.rect.top) || (b.rect.left - a.rect.left));

    return visibleMics[0]?.button || null;
  }

  function findMainVoicePanel() {
    return Array.from(document.querySelectorAll("div.fixed")).find((panel) => {
      const hasTextArrow = Array.from(panel.querySelectorAll("button")).some((button) => (button.textContent || "").trim() === "↑");
      const text = (panel.textContent || "").trim();
      return hasTextArrow && /입력 준비됨|듣고 있습니다|말씀하세요|실시간 입력 중|계속 듣고 있습니다|마이크/.test(text);
    }) || null;
  }

  function compactMainVoicePanel(panel) {
    if (!(panel instanceof HTMLElement)) return;
    panel.style.height = "30px";
    panel.style.minHeight = "30px";
    panel.style.maxHeight = "30px";
    panel.style.padding = "0 8px";
    panel.style.gap = "7px";
    panel.style.borderRadius = "10px";
    panel.style.alignItems = "center";
    panel.style.whiteSpace = "nowrap";

    const wave = Array.from(panel.querySelectorAll("div")).find((el) => el.getAttribute("aria-label") === "Live microphone level");
    if (wave instanceof HTMLElement) {
      wave.style.height = "24px";
      wave.style.maxHeight = "24px";
      wave.style.gap = "2px";
      Array.from(wave.querySelectorAll("span")).forEach((bar) => {
        if (bar instanceof HTMLElement) {
          bar.style.width = "2px";
          bar.style.maxHeight = "22px";
        }
      });
    }

    const arrow = Array.from(panel.querySelectorAll("button")).find((button) => (button.textContent || "").trim() === "↑");
    if (arrow instanceof HTMLElement) {
      arrow.style.width = "28px";
      arrow.style.height = "28px";
      arrow.style.minWidth = "28px";
      arrow.style.minHeight = "28px";
      arrow.style.fontSize = "16px";
    }
  }

  function positionMainVoicePanel() {
    const mic = findMainMicButton();
    const panel = findMainVoicePanel();
    if (!(mic instanceof HTMLElement) || !(panel instanceof HTMLElement)) return;

    compactMainVoicePanel(panel);

    const micRect = mic.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const gap = 14;
    const left = Math.max(micRect.right + gap, Math.min(window.innerWidth - panelRect.width - 8, micRect.right + gap));
    const top = Math.max(8, Math.min(window.innerHeight - 38, micRect.top + (micRect.height - 30) / 2));

    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.transform = "none";
  }

  function run() {
    patchScroll();
    positionMainVoicePanel();
  }

  run();
  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("resize", positionMainVoicePanel);
  window.addEventListener("scroll", positionMainVoicePanel, true);
  window.setInterval(positionMainVoicePanel, 120);
})();
