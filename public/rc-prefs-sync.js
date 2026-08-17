(() => {
  const RIGHT_KEY = "royalcommand:right-panel-apps";
  const LANG_KEY = "royalcommand:selected-language";
  const CHAT_WIDTH_KEY = "royalcommand:chat-sidebar-width";
  const CHAT_COLLAPSED_KEY = "royalcommand:chat-sidebar-collapsed";
  const RELOAD_KEY = "royalcommand:prefs-restored-v2";
  let lastSent = "";
  let restoring = true;
  let timer = null;

  function roomIdFromPath() {
    const match = location.pathname.match(/^\/rooms\/([^/]+)/);
    return match ? match[1] : "";
  }

  function selectedKey() {
    const roomId = roomIdFromPath();
    return roomId ? `royalcommand:room:${roomId}:selected-ai` : "";
  }

  function slotsKey() {
    const roomId = roomIdFromPath();
    return roomId ? `royalcommand:room:${roomId}:ai-slots-v2` : "";
  }

  function safeArray(raw) {
    try {
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  }

  function snapshot() {
    const selected = selectedKey();
    const slots = slotsKey();
    const widthRaw = Number(localStorage.getItem(CHAT_WIDTH_KEY));
    const collapsedRaw = localStorage.getItem(CHAT_COLLAPSED_KEY);
    return {
      selectedAi: selected ? safeArray(localStorage.getItem(selected)) : undefined,
      aiSlots: slots ? safeArray(localStorage.getItem(slots)) : undefined,
      rightPanelApps: safeArray(localStorage.getItem(RIGHT_KEY)),
      language: localStorage.getItem(LANG_KEY) || undefined,
      chatSidebarWidth: Number.isFinite(widthRaw) && widthRaw > 0 ? widthRaw : undefined,
      chatSidebarCollapsed: collapsedRaw === "1" ? true : collapsedRaw === "0" ? false : undefined,
    };
  }

  async function saveNow() {
    if (restoring) return;
    const data = snapshot();
    if (!data.selectedAi || !data.selectedAi.length || !data.rightPanelApps.length || !data.language) return;
    const serial = JSON.stringify(data);
    if (serial === lastSent) return;
    lastSent = serial;
    try {
      await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: serial,
        keepalive: true,
      });
    } catch {}
  }

  function scheduleSave() {
    clearTimeout(timer);
    timer = setTimeout(saveNow, 500);
  }

  function setIfDifferent(key, value) {
    if (value == null) return false;
    const next = String(value);
    if (localStorage.getItem(key) === next) return false;
    localStorage.setItem(key, next);
    return true;
  }

  async function restore() {
    if (!roomIdFromPath()) {
      restoring = false;
      return;
    }
    try {
      const res = await fetch("/api/user/preferences", { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) {
        restoring = false;
        return;
      }
      const data = await res.json();
      const prefs = data && data.preferences ? data.preferences : {};
      const selected = selectedKey();
      const slots = slotsKey();
      let changed = false;

      if (selected && Array.isArray(prefs.selectedAi) && prefs.selectedAi.length) {
        const next = JSON.stringify(prefs.selectedAi);
        if (localStorage.getItem(selected) !== next) {
          localStorage.setItem(selected, next);
          changed = true;
        }
      }
      if (slots && Array.isArray(prefs.aiSlots) && prefs.aiSlots.length) {
        const next = JSON.stringify(prefs.aiSlots);
        if (localStorage.getItem(slots) !== next) {
          localStorage.setItem(slots, next);
          changed = true;
        }
      }
      if (Array.isArray(prefs.rightPanelApps) && prefs.rightPanelApps.length) {
        const next = JSON.stringify(prefs.rightPanelApps);
        if (localStorage.getItem(RIGHT_KEY) !== next) {
          localStorage.setItem(RIGHT_KEY, next);
          changed = true;
        }
      }
      if (typeof prefs.language === "string" && prefs.language) {
        const lang = prefs.language === "ko" ? "ko-KR" : prefs.language === "en" ? "en-AU" : prefs.language;
        if (localStorage.getItem(LANG_KEY) !== lang) {
          localStorage.setItem(LANG_KEY, lang);
          changed = true;
        }
      }
      if (typeof prefs.chatSidebarWidth === "number") {
        changed = setIfDifferent(CHAT_WIDTH_KEY, prefs.chatSidebarWidth) || changed;
      }
      if (typeof prefs.chatSidebarCollapsed === "boolean") {
        changed = setIfDifferent(CHAT_COLLAPSED_KEY, prefs.chatSidebarCollapsed ? "1" : "0") || changed;
      }

      lastSent = JSON.stringify(snapshot());
      restoring = false;

      if (changed && sessionStorage.getItem(RELOAD_KEY) !== "1") {
        sessionStorage.setItem(RELOAD_KEY, "1");
        location.reload();
        return;
      }
      sessionStorage.removeItem(RELOAD_KEY);
    } catch {
      restoring = false;
    }
  }

  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(key, value) {
    originalSetItem(key, value);
    if (
      key === RIGHT_KEY ||
      key === LANG_KEY ||
      key === CHAT_WIDTH_KEY ||
      key === CHAT_COLLAPSED_KEY ||
      key === selectedKey() ||
      key === slotsKey()
    ) scheduleSave();
  };

  window.addEventListener("beforeunload", () => { void saveNow(); });
  window.addEventListener("storage", scheduleSave);
  void restore();
})();
