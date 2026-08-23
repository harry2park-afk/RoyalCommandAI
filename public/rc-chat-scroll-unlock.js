(() => {
  if (!/^\/rooms\//.test(window.location.pathname)) return;

  const PATCH_FLAG = "rcScrollUnlockPatched";
  const POSITION_KEY = "rc:main-voice-panel-position";
  const LOCK_KEY = "rc:main-voice-panel-locked";
  const VERSION_KEY = "rc:main-voice-panel-layout-version";
  const VERSION = "2";
  let dragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let dragPointerId = null;

  function resetOldLayoutOnce() {
    try {
      if (localStorage.getItem(VERSION_KEY) !== VERSION) {
        localStorage.removeItem(POSITION_KEY);
        localStorage.removeItem(LOCK_KEY);
        localStorage.setItem(VERSION_KEY, VERSION);
      }
    } catch {}
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
      if (first && typeof first === "object" && first.behavior === "auto" && typeof first.top === "number" && first.top >= viewport.scrollHeight - 2) return;
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
      const hasArrow = Array.from(panel.querySelectorAll("button")).some((button) => (button.textContent || "").trim() === "↑");
      const text = (panel.textContent || "").trim();
      return hasArrow && /입력 준비됨|듣고 있습니다|말씀하세요|실시간 입력 중|계속 듣고 있습니다|마이크/.test(text);
    }) || null;
  }

  function readSavedPosition() {
    try {
      const raw = localStorage.getItem(POSITION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Number.isFinite(parsed?.left) || !Number.isFinite(parsed?.top)) return null;
      return { left: Number(parsed.left), top: Number(parsed.top) };
    } catch { return null; }
  }

  function savePosition(left, top) {
    try { localStorage.setItem(POSITION_KEY, JSON.stringify({ left: Math.round(left), top: Math.round(top) })); } catch {}
  }

  function isLocked() {
    try { return localStorage.getItem(LOCK_KEY) === "1"; } catch { return false; }
  }

  function setLocked(value) {
    try { localStorage.setItem(LOCK_KEY, value ? "1" : "0"); } catch {}
  }

  function clampPosition(left, top, panel) {
    const width = panel.offsetWidth || 250;
    const height = panel.offsetHeight || 30;
    return {
      left: Math.max(8, Math.min(window.innerWidth - width - 8, left)),
      top: Math.max(8, Math.min(window.innerHeight - height - 8, top)),
    };
  }

  function applyPanelPosition(panel, left, top) {
    const pos = clampPosition(left, top, panel);
    panel.style.left = `${Math.round(pos.left)}px`;
    panel.style.top = `${Math.round(pos.top)}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.transform = "none";
    return pos;
  }

  function overlaps(a, b, pad = 0) {
    return !(
      a.right + pad <= b.left ||
      a.left >= b.right + pad ||
      a.bottom + pad <= b.top ||
      a.top >= b.bottom + pad
    );
  }

  function ensureControls(panel) {
    let move = panel.querySelector('[data-rc-voice-move-handle="1"]');
    if (!(move instanceof HTMLButtonElement)) {
      move = document.createElement("button");
      move.type = "button";
      move.dataset.rcVoiceMoveHandle = "1";
      move.textContent = "✥ 이동";
      move.title = "잠금 해제 후 이 버튼을 잡고 끌어 이동하세요";
      Object.assign(move.style, {
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: "48px", minWidth: "48px", height: "26px", padding: "0 4px",
        borderRadius: "7px", border: "1px solid #d7b64d", color: "#f6d56b",
        background: "#5f1026", fontSize: "11px", fontWeight: "700",
        cursor: "grab", userSelect: "none", touchAction: "none", pointerEvents: "auto"
      });
      panel.insertBefore(move, panel.firstChild);
    }

    let lock = panel.querySelector('[data-rc-voice-lock="1"]');
    if (!(lock instanceof HTMLButtonElement)) {
      lock = document.createElement("button");
      lock.type = "button";
      lock.dataset.rcVoiceLock = "1";
      Object.assign(lock.style, {
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        minWidth: "46px", height: "26px", padding: "0 4px",
        borderRadius: "7px", border: "1px solid #d7b64d", color: "#f6d56b",
        background: "#123d2f", fontSize: "11px", fontWeight: "700",
        cursor: "pointer", userSelect: "none", pointerEvents: "auto"
      });
      move.insertAdjacentElement("afterend", lock);
    }

    const locked = isLocked();
    lock.textContent = locked ? "🔒 고정" : "🔓 이동";
    move.disabled = locked;
    move.style.opacity = locked ? "0.45" : "1";
    move.style.cursor = locked ? "not-allowed" : "grab";
    return { move, lock };
  }

  function compactPanel(panel) {
    Object.assign(panel.style, {
      height: "30px", minHeight: "30px", maxHeight: "30px",
      padding: "0 4px", gap: "4px", borderRadius: "10px",
      alignItems: "center", whiteSpace: "nowrap", userSelect: "none",
      zIndex: "510"
    });
    ensureControls(panel);

    const wave = Array.from(panel.querySelectorAll("div")).find((el) => el.getAttribute("aria-label") === "Live microphone level");
    if (wave instanceof HTMLElement) {
      wave.style.height = "22px";
      wave.style.maxHeight = "22px";
      wave.style.gap = "1px";
      Array.from(wave.querySelectorAll("span")).forEach((bar) => {
        if (bar instanceof HTMLElement) { bar.style.width = "2px"; bar.style.maxHeight = "20px"; }
      });
    }

    const arrow = Array.from(panel.querySelectorAll("button")).find((button) => (button.textContent || "").trim() === "↑");
    if (arrow instanceof HTMLElement) Object.assign(arrow.style, { width: "26px", height: "26px", minWidth: "26px", minHeight: "26px", fontSize: "15px" });
  }

  function placeDefault(panel, mic) {
    const micRect = mic.getBoundingClientRect();
    const panelWidth = panel.offsetWidth || 250;
    const gap = 18;
    const desiredTop = micRect.top + (micRect.height - 30) / 2;
    let desiredLeft = micRect.right + gap;
    if (desiredLeft + panelWidth > window.innerWidth - 8) desiredLeft = micRect.left - panelWidth - gap;
    const pos = applyPanelPosition(panel, desiredLeft, desiredTop);
    savePosition(pos.left, pos.top);
    return pos;
  }

  function keepClearOfMic(panel, mic) {
    const panelRect = panel.getBoundingClientRect();
    const micRect = mic.getBoundingClientRect();
    if (!overlaps(panelRect, micRect, 12)) return;

    const panelWidth = panel.offsetWidth || 250;
    const gap = 18;
    let left = micRect.right + gap;
    if (left + panelWidth > window.innerWidth - 8) left = micRect.left - panelWidth - gap;
    const top = micRect.top + (micRect.height - 30) / 2;
    const pos = applyPanelPosition(panel, left, top);
    savePosition(pos.left, pos.top);
  }

  function positionMainVoicePanel() {
    if (dragging) return;
    const panel = findMainVoicePanel();
    if (!(panel instanceof HTMLElement)) return;
    compactPanel(panel);

    const mic = findMainMicButton();
    const saved = readSavedPosition();
    if (saved) applyPanelPosition(panel, saved.left, saved.top);
    else if (mic instanceof HTMLElement) placeDefault(panel, mic);

    if (mic instanceof HTMLElement) keepClearOfMic(panel, mic);
  }

  function onPointerDown(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const handle = target.closest('[data-rc-voice-move-handle="1"]');
    if (!(handle instanceof HTMLButtonElement) || isLocked()) return;
    const panel = findMainVoicePanel();
    if (!(panel instanceof HTMLElement)) return;

    const rect = panel.getBoundingClientRect();
    dragging = true;
    dragPointerId = event.pointerId;
    dragOffsetX = event.clientX - rect.left;
    dragOffsetY = event.clientY - rect.top;
    panel.style.zIndex = "9999";
    panel.style.boxShadow = "0 0 0 2px rgba(215,182,77,.75), 0 12px 30px rgba(0,0,0,.45)";
    handle.textContent = "✥ 놓기";
    handle.style.cursor = "grabbing";
    try { handle.setPointerCapture(event.pointerId); } catch {}
    event.preventDefault();
    event.stopPropagation();
  }

  function onPointerMove(event) {
    if (!dragging || (dragPointerId !== null && event.pointerId !== dragPointerId)) return;
    const panel = findMainVoicePanel();
    if (!(panel instanceof HTMLElement)) return;
    applyPanelPosition(panel, event.clientX - dragOffsetX, event.clientY - dragOffsetY);
    event.preventDefault();
  }

  function finishDrag(event) {
    if (!dragging || (dragPointerId !== null && event.pointerId !== dragPointerId)) return;
    dragging = false;
    dragPointerId = null;
    const panel = findMainVoicePanel();
    if (!(panel instanceof HTMLElement)) return;
    const rect = panel.getBoundingClientRect();
    const pos = applyPanelPosition(panel, rect.left, rect.top);
    savePosition(pos.left, pos.top);
    setLocked(true);
    panel.style.zIndex = "510";
    panel.style.boxShadow = "";
    compactPanel(panel);
    const mic = findMainMicButton();
    if (mic instanceof HTMLElement) keepClearOfMic(panel, mic);
    event.preventDefault();
  }

  function onClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const lock = target.closest('[data-rc-voice-lock="1"]');
    if (!(lock instanceof HTMLButtonElement)) return;
    setLocked(!isLocked());
    const panel = findMainVoicePanel();
    if (panel instanceof HTMLElement) compactPanel(panel);
    event.preventDefault();
    event.stopPropagation();
  }

  function run() {
    patchScroll();
    positionMainVoicePanel();
  }

  resetOldLayoutOnce();
  run();
  new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("resize", positionMainVoicePanel);
  window.addEventListener("scroll", positionMainVoicePanel, true);
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("pointermove", onPointerMove, true);
  document.addEventListener("pointerup", finishDrag, true);
  document.addEventListener("pointercancel", finishDrag, true);
  document.addEventListener("click", onClick, true);
})();
