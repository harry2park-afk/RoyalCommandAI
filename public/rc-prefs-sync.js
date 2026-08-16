(() => {
  const RIGHT_KEY = "royalcommand:right-panel-apps";
  const LANG_KEY = "royalcommand:selected-language";
  const RELOAD_KEY = "royalcommand:prefs-restored-v1";
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

  function safeArray(raw) {
    try {
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  }

  function snapshot() {
    const key = selectedKey();
    return {
      selectedAi: key ? safeArray(localStorage.getItem(key)) : undefined,
      rightPanelApps: safeArray(localStorage.getItem(RIGHT_KEY)),
      language: localStorage.getItem(LANG_KEY) || undefined,
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
      const key = selectedKey();
      let changed = false;

      if (key && Array.isArray(prefs.selectedAi) && prefs.selectedAi.length) {
        const next = JSON.stringify(prefs.selectedAi);
        if (localStorage.getItem(key) !== next) {
          localStorage.setItem(key, next);
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
    if (key === RIGHT_KEY || key === LANG_KEY || key === selectedKey()) scheduleSave();
  };

  window.addEventListener("beforeunload", () => { void saveNow(); });
  window.addEventListener("storage", scheduleSave);
  void restore();
})();
