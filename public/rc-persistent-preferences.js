(() => {
  const RIGHT_PANEL_KEY = "royalcommand:right-panel-apps";
  const LANGUAGE_KEY = "royalcommand:selected-language";
  const RELOAD_GUARD = "royalcommand:prefs-bootstrap-reloaded";
  const originalSetItem = Storage.prototype.setItem;
  let applyingServerState = false;
  let pendingPatch = {};
  let patchTimer = null;

  const normaliseLanguage = (value) => value === "ko" ? "ko-KR" : value === "en" ? "en-AU" : value;

  function sameJson(a, b) {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
  }

  function queuePatch(patch) {
    pendingPatch = { ...pendingPatch, ...patch };
    clearTimeout(patchTimer);
    patchTimer = setTimeout(async () => {
      const body = pendingPatch;
      pendingPatch = {};
      try {
        await fetch("/api/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          credentials: "same-origin",
        });
      } catch {}
    }, 250);
  }

  Storage.prototype.setItem = function(key, value) {
    originalSetItem.call(this, key, value);
    if (applyingServerState || this !== window.localStorage) return;

    try {
      if (key === RIGHT_PANEL_KEY) {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) queuePatch({ rightPanelApps: parsed });
        return;
      }
      if (key === LANGUAGE_KEY) {
        queuePatch({ language: normaliseLanguage(value) });
        return;
      }
      if (/^royalcommand:room:[^:]+:selected-ai$/.test(key)) {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) queuePatch({ selectedAi: parsed });
      }
    } catch {}
  };

  async function bootstrap() {
    try {
      const res = await fetch("/api/preferences", { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) return;
      const data = await res.json();
      const prefs = data && data.preferences ? data.preferences : {};
      let changed = false;
      applyingServerState = true;

      if (Array.isArray(prefs.rightPanelApps)) {
        let current = [];
        try { current = JSON.parse(localStorage.getItem(RIGHT_PANEL_KEY) || "[]"); } catch {}
        if (!sameJson(current, prefs.rightPanelApps)) {
          originalSetItem.call(localStorage, RIGHT_PANEL_KEY, JSON.stringify(prefs.rightPanelApps));
          changed = true;
        }
      }

      const language = normaliseLanguage(typeof prefs.language === "string" ? prefs.language : "");
      if (language && localStorage.getItem(LANGUAGE_KEY) !== language) {
        originalSetItem.call(localStorage, LANGUAGE_KEY, language);
        changed = true;
      }

      if (Array.isArray(prefs.selectedAi)) {
        const match = location.pathname.match(/^\/rooms\/([^/]+)/);
        if (match) {
          const key = `royalcommand:room:${match[1]}:selected-ai`;
          let current = [];
          try { current = JSON.parse(localStorage.getItem(key) || "[]"); } catch {}
          if (!sameJson(current, prefs.selectedAi)) {
            originalSetItem.call(localStorage, key, JSON.stringify(prefs.selectedAi));
            changed = true;
          }
        }
      }

      applyingServerState = false;

      if (changed && sessionStorage.getItem(RELOAD_GUARD) !== "1") {
        sessionStorage.setItem(RELOAD_GUARD, "1");
        location.reload();
        return;
      }
      sessionStorage.removeItem(RELOAD_GUARD);
    } catch {
      applyingServerState = false;
    }
  }

  void bootstrap();
})();
