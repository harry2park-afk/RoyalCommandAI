(() => {
  if (!/^\/rooms\//.test(window.location.pathname)) return;

  const PATCH_FLAG = "rcScrollUnlockPatched";
  const POSITION_KEY = "rc:main-voice-panel-position";
  const LOCK_KEY = "rc:main-voice-panel-locked";
  let dragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let dragPointerId = null;

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
    const visibleMics = Array.from(root.querySelectorAll("button"))
      .filter((button) => Boolean(button.querySelector("svg.lucide-mic")))
      .map((button) => ({ button, rect: button.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width > 8 && rect.height > 8 && rect.bottom > 0 && rect.right > 0)
      .sort((a, b) => (b.rect.top - a.rect.top) || (b.rect.left - a.rect.left));
    return visibleMics[0]?.button || null;
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
    const width = panel.offsetWidth || 260;
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
        width: "54px", minWidth: "54px", height: "28px", padding: "0 5px",
        borderRadius: "8px", border: "1px solid #d7b64d", color: "#f6d56b",
        background: "#5f1026", fontSize: "12px", fontWeight: "700",
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
        minWidth: "54px", height: "28px", padding: "0 6px",
        borderRadius: "8px", border: "1px solid #d7b64d", color: "#f6d56b",
        background: "#123d2f", fontSize: "12px", fontWeight: "700",
        cursor: "pointer", userSelect: "none", pointerEvents: "auto"
      });
      move.insertAdjacentElement("afterend", lock);
    }

    const locked = isLocked();
    lock.textContent = locked ? "🔒 고정" : "🔓 이동";
    lock.title = locked ? "현재 위치 고정됨 — 클릭하면 이동 가능" : "현재 이동 가능 — 클릭하면 이 위치 고정";
    move.disabled = locked;
    move.style.opacity = locked ? "0.45" : "1";
    move.style.cursor = locked ? "not-allowed" : "grab";
    return { move, lock };
  }

  function compactPanel(panel) {
    Object.assign(panel.style, {
      height: "30px", minHeight: "30px", maxHeight: "30px",
      padding: "0 4px", gap: "4px", borderRadius: "10px",
      alignItems: "center", whiteSpace: "nowrap", userSelect: "none"
    });
    ensureControls(panel);

    const wave = Array.from(panel.querySelectorAll("div")).find((el) => el.getAttribute("aria-label") === "Live microphone level");
    if (wave instanceof HTMLElement) {
      wave.style.height = "24px";
      wave.style.maxHeight = "24px";
      wave.style.gap = "2px";
      Array.from(wave.querySelectorAll("span")).forEach((bar) => {
        if (bar instanceof HTMLElement) { bar.style.width = "2px"; bar.style.maxHeight = "22px"; }
      });
    }
    const arrow = Array.from(panel.querySelectorAll("button")).find((button) => (button.textContent || "").trim() === "↑");
    if (arrow instanceof HTMLElement) Object.assign(arrow.style, { width: "28px", height: "28px", minWidth: "28px", minHeight: "28px", fontSize: "16px" });
  }

  function placeDefault(panel, mic) {
    const micRect = mic.getBoundingClientRect();
    const panelWidth = panel.offsetWidth || 260;
    const gap = 28;
    const right = micRect.right + gap;
    const left = right + panelWidth <= window.innerWidth - 8 ? right : Math.max(8, micRect.left - panelWidth - gap);
    const top = micRect.top + (micRect.height - 30) / 2;
    return applyPanelPosition(panel, left, top);
  }

  function positionMainVoicePanel() {
    if (dragging) return;
    const panel = findMainVoicePanel();
    if (!(panel instanceof HTMLElement)) return;
    compactPanel(panel);

    const saved = readSavedPosition();
    if (saved) {
      applyPanelPosition(panel, saved.left, saved.top);
      return;
    }

    const mic = findMainMicButton();
    if (mic instanceof HTMLElement) placeDefault(panel, mic);
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
    event.preventDefault();
  }

  function onClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const lock = target.closest('[data-rc-voice-lock="1"]');
    if (!(lock instanceof HTMLButtonElement)) return;
    const panel = findMainVoicePanel();
    if (!(panel instanceof HTMLElement)) return;
    setLocked(!isLocked());
    compactPanel(panel);
    event.preventDefault();
    event.stopPropagation();
  }

  function onKeyDown(event) {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest('[data-rc-voice-move-handle="1"]') || isLocked()) return;
    const panel = findMainVoicePanel();
    if (!(panel instanceof HTMLElement)) return;
    const step = event.shiftKey ? 20 : 5;
    const rect = panel.getBoundingClientRect();
    let left = rect.left, top = rect.top;
    if (event.key === "ArrowLeft") left -= step;
    else if (event.key === "ArrowRight") left += step;
    else if (event.key === "ArrowUp") top -= step;
    else if (event.key === "ArrowDown") top += step;
    else return;
    const pos = applyPanelPosition(panel, left, top);
    savePosition(pos.left, pos.top);
    event.preventDefault();
  }

  function run() { patchScroll(); positionMainVoicePanel(); }
  run();
  new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("resize", positionMainVoicePanel);
  window.addEventListener("scroll", positionMainVoicePanel, true);
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("pointermove", onPointerMove, true);
  document.addEventListener("pointerup", finishDrag, true);
  document.addEventListener("pointercancel", finishDrag, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKeyDown, true);
  window.setInterval(positionMainVoicePanel, 250);
})();
