(() => {
  const RIGHT_KEY = "royalcommand:right-panel-apps";
  const LANG_KEY = "royalcommand:selected-language";
  const CHAT_WIDTH_KEY = "royalcommand:chat-sidebar-width";
  const CHAT_COLLAPSED_KEY = "royalcommand:chat-sidebar-collapsed";
  const RELOAD_KEY = "royalcommand:prefs-restored-v3";
  const SAVE_GRACE_MS = 1400;
  const AI_TITLES = {
    openai: "ChatGPT",
    anthropic: "Claude",
    google: "Gemini",
    xai: "Grok",
    deepseek: "DeepSeek",
    perplexity: "Perplexity",
    mistral: "Mistral",
    meta: "Meta Llama",
    qwen: "Qwen",
    cohere: "Cohere",
  };

  let lastSent = "";
  let restoring = true;
  let allowSave = false;
  let timer = null;
  let canonicalSelectedAi = null;

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
      selectedAi: selected ? safeArray(localStorage.getItem(selected)) : [],
      aiSlots: slots ? safeArray(localStorage.getItem(slots)) : [],
      rightPanelApps: safeArray(localStorage.getItem(RIGHT_KEY)),
      language: localStorage.getItem(LANG_KEY) || undefined,
      chatSidebarWidth: Number.isFinite(widthRaw) && widthRaw > 0 ? widthRaw : undefined,
      chatSidebarCollapsed: collapsedRaw === "1" ? true : collapsedRaw === "0" ? false : undefined,
    };
  }

  async function saveNow() {
    if (restoring || !allowSave || !roomIdFromPath()) return;
    const data = snapshot();
    const serial = JSON.stringify(data);
    if (serial === lastSent) return;
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: serial,
        keepalive: true,
      });
      if (res.ok) {
        lastSent = serial;
        canonicalSelectedAi = [...data.selectedAi];
      }
    } catch {}
  }

  function scheduleSave() {
    if (restoring || !allowSave) return;
    clearTimeout(timer);
    timer = setTimeout(saveNow, 500);
  }

  function setJsonArray(key, value) {
    if (!key || !Array.isArray(value)) return false;
    const next = JSON.stringify(value.filter((item) => typeof item === "string"));
    if (localStorage.getItem(key) === next) return false;
    localStorage.setItem(key, next);
    return true;
  }

  function setIfDifferent(key, value) {
    if (value == null) return false;
    const next = String(value);
    if (localStorage.getItem(key) === next) return false;
    localStorage.setItem(key, next);
    return true;
  }

  function findAiButton(title) {
    return Array.from(document.querySelectorAll("button")).find((button) => {
      const actual = button.getAttribute("title") || "";
      return actual === title || actual.startsWith(`${title} —`);
    });
  }

  function reconcileAiDom() {
    if (!Array.isArray(canonicalSelectedAi) || !roomIdFromPath()) return;
    const wanted = new Set(canonicalSelectedAi);
    for (const [id, title] of Object.entries(AI_TITLES)) {
      const button = findAiButton(title);
      if (!(button instanceof HTMLButtonElement) || button.disabled) continue;
      const active = String(button.className || "").includes("bg-[#7A0C2E]");
      const shouldBeActive = wanted.has(id);
      if (active !== shouldBeActive) button.click();
    }
  }

  async function restore() {
    if (!roomIdFromPath()) {
      restoring = false;
      allowSave = true;
      return;
    }

    let changed = false;
    try {
      const res = await fetch("/api/user/preferences", { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) return;
      const data = await res.json();
      const prefs = data && data.preferences ? data.preferences : {};
      const selected = selectedKey();
      const slots = slotsKey();

      if (Array.isArray(prefs.selectedAi)) {
        canonicalSelectedAi = prefs.selectedAi.filter((item) => typeof item === "string");
        changed = setJsonArray(selected, canonicalSelectedAi) || changed;
      }
      if (Array.isArray(prefs.aiSlots)) {
        changed = setJsonArray(slots, prefs.aiSlots) || changed;
      }
      if (Array.isArray(prefs.rightPanelApps)) {
        changed = setJsonArray(RIGHT_KEY, prefs.rightPanelApps) || changed;
      }
      if (typeof prefs.language === "string" && prefs.language) {
        const lang = prefs.language === "ko" ? "ko-KR" : prefs.language === "en" ? "en-AU" : prefs.language;
        changed = setIfDifferent(LANG_KEY, lang) || changed;
      }
      if (typeof prefs.chatSidebarWidth === "number") {
        changed = setIfDifferent(CHAT_WIDTH_KEY, prefs.chatSidebarWidth) || changed;
      }
      if (typeof prefs.chatSidebarCollapsed === "boolean") {
        changed = setIfDifferent(CHAT_COLLAPSED_KEY, prefs.chatSidebarCollapsed ? "1" : "0") || changed;
      }

      lastSent = JSON.stringify(snapshot());
    } catch {
      // Keep the current browser state if the account-backed preference service is unavailable.
    } finally {
      restoring = false;
    }

    if (changed && sessionStorage.getItem(RELOAD_KEY) !== "1") {
      sessionStorage.setItem(RELOAD_KEY, "1");
      location.reload();
      return;
    }

    sessionStorage.removeItem(RELOAD_KEY);
    requestAnimationFrame(reconcileAiDom);
    setTimeout(reconcileAiDom, 250);
    setTimeout(reconcileAiDom, 700);
    setTimeout(() => {
      reconcileAiDom();
      allowSave = true;
      lastSent = JSON.stringify(snapshot());
    }, SAVE_GRACE_MS);
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

  const observer = new MutationObserver(() => {
    if (!restoring && !allowSave) requestAnimationFrame(reconcileAiDom);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("beforeunload", () => { void saveNow(); });
  window.addEventListener("storage", scheduleSave);
  void restore();
})();
