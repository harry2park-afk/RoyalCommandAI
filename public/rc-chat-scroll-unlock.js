(() => {
  if (!/^\/rooms\//.test(window.location.pathname)) return;

  const PATCH_FLAG = "rcScrollUnlockPatched";
  const POSITION_KEY = "rc:main-voice-panel-position";
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

  function clearSavedPosition() {
    try { localStorage.removeItem(POSITION_KEY); } catch {}
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
    return !(a.right + pad <= b.left || a.left >= b.right + pad || a.bottom + pad <= b.top || a.top >= b.bottom + pad);
  }

  function ensureMoveHandle(panel) {
    let handle = panel.querySelector('[data-rc-voice-move-handle="1"]');
    if (handle instanceof HTMLButtonElement) return handle;

    handle = document.createElement("button");
    handle.type = "button";
    handle.dataset.rcVoiceMoveHandle = "1";
    handle.textContent = "✥ 이동";
    handle.title = "이 버튼을 잡고 원하는 위치로 끌어 놓으세요. 놓으면 자동 저장됩니다.";
    handle.setAttribute("aria-label", "웨이브 창 이동");
    Object.assign(handle.style, {
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: "54px", minWidth: "54px", height: "28px", padding: "0 5px",
      borderRadius: "8px", border: "1px solid #d7b64d", color: "#f6d56b",
      background: "#5f1026", fontSize: "12px", fontWeight: "700",
      cursor: "grab", userSelect: "none", touchAction: "none", pointerEvents: "auto"
    });
    panel.insertBefore(handle, panel.firstChild);
    return handle;
  }

  function compactPanel(panel) {
    Object.assign(panel.style, {
      height: "30px", minHeight: "30px", maxHeight: "30px",
      padding: "0 5px", gap: "5px", borderRadius: "10px",
      alignItems: "center", whiteSpace: "nowrap", userSelect: "none"
    });
    ensureMoveHandle(panel);

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
    if (arrow instanceof HTMLElement) {
      Object.assign(arrow.style, { width: "28px", height: "28px", minWidth: "28px", minHeight: "28px", fontSize: "16px" });
    }
  }

  function placeDefault(panel, mic) {
    const micRect = mic.getBoundingClientRect();
    const panelWidth = panel.offsetWidth || 250;
    const gap = 18;
    const rightCandidate = micRect.right + gap;
    const leftCandidate = micRect.left - panelWidth - gap;
    const left = rightCandidate + panelWidth <= window.innerWidth - 8 ? rightCandidate : Math.max(8, leftCandidate);
    const top = micRect.top + (micRect.height - 30) / 2;
    return applyPanelPosition(panel, left, top);
  }

  function positionMainVoicePanel() {
    if (dragging) return;
    const mic = findMainMicButton();
    const panel = findMainVoicePanel();
    if (!(mic instanceof HTMLElement) || !(panel instanceof HTMLElement)) return;
    compactPanel(panel);

    const saved = readSavedPosition();
    if (saved) {
      applyPanelPosition(panel, saved.left, saved.top);
      const panelRect = panel.getBoundingClientRect();
      const micRect = mic.getBoundingClientRect();
      if (!overlaps(panelRect, micRect, 10)) return;
      clearSavedPosition();
    }
    placeDefault(panel, mic);
  }

  function startDrag(event, handle) {
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

  function onPointerDown(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const handle = target.closest('[data-rc-voice-move-handle="1"]');
    if (!(handle instanceof HTMLButtonElement)) return;
    startDrag(event, handle);
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
    panel.style.zIndex = "510";
    panel.style.boxShadow = "";
    const handle = panel.querySelector('[data-rc-voice-move-handle="1"]');
    if (handle instanceof HTMLButtonElement) { handle.textContent = "✥ 이동"; handle.style.cursor = "grab"; }
    event.preventDefault();
  }

  function onKeyDown(event) {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest('[data-rc-voice-move-handle="1"]')) return;
    const panel = findMainVoicePanel();
    if (!(panel instanceof HTMLElement)) return;
    const step = event.shiftKey ? 20 : 5;
    const rect = panel.getBoundingClientRect();
    let left = rect.left;
    let top = rect.top;
    if (event.key === "ArrowLeft") left -= step;
    else if (event.key === "ArrowRight") left += step;
    else if (event.key === "ArrowUp") top -= step;
    else if (event.key === "ArrowDown") top += step;
    else if (event.key === "Home") {
      clearSavedPosition();
      const mic = findMainMicButton();
      if (mic instanceof HTMLElement) placeDefault(panel, mic);
      event.preventDefault();
      return;
    } else return;
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
  document.addEventListener("keydown", onKeyDown, true);
  window.setInterval(positionMainVoicePanel, 250);
})();
