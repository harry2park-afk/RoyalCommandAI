(() => {
  if (!/^\/rooms\//.test(window.location.pathname)) return;

  const TOOLS_ID = "rc-thread-tools";
  const NEW_CHAT_ID = "rc-new-chat-button";
  const VOICE_ID = "rc-voice-command-button";
  const STATUS_ID = "rc-thread-save-status";
  const PALETTE_ID = "rc-command-palette";
  const GROUP_KEY = `royalcommand:chat-groups:${window.location.pathname}`;
  const USER_TITLES = new Set(["클릭하면 전체 내용을 봅니다", "Click to view full content"]);
  const SIDEBAR_TITLE_PREFIX = "Click: view conversation";

  let viewport = null;
  let activeRoot = "";
  let baselineComplete = false;
  let knownTurns = new Set();
  let scheduled = false;
  let lastSidebarCount = null;
  let statusTimer = null;
  let voiceRecognition = null;

  function normalise(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function readGroups() {
    try {
      const parsed = JSON.parse(localStorage.getItem(GROUP_KEY) || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeGroups(groups) {
    try { localStorage.setItem(GROUP_KEY, JSON.stringify(groups)); } catch {}
  }

  function isUserButton(node) {
    if (!(node instanceof HTMLButtonElement)) return false;
    const title = node.getAttribute("title") || "";
    if (USER_TITLES.has(title)) return true;
    const cls = String(node.className || "");
    return cls.includes("border-[3px]") && cls.includes("border-[#FFD700]");
  }

  function findViewport() {
    return Array.from(document.querySelectorAll("div")).find((el) => {
      const cls = String(el.className || "");
      return cls.includes("overflow-y-auto") && cls.includes("overscroll-contain");
    }) || null;
  }

  function collectTurns() {
    viewport = viewport && document.contains(viewport) ? viewport : findViewport();
    if (!viewport) return [];
    const children = Array.from(viewport.children);
    const turns = [];
    let current = null;

    for (const child of children) {
      if (isUserButton(child)) {
        if (current) turns.push(current);
        current = { key: normalise(child.textContent), user: child, nodes: [child] };
      } else if (current) {
        current.nodes.push(child);
      }
    }
    if (current) turns.push(current);
    return turns.filter((turn) => turn.key);
  }

  function rootForKey(key, groups) {
    for (const [root, members] of Object.entries(groups)) {
      if (Array.isArray(members) && members.includes(key)) return root;
    }
    return key;
  }

  function ensureGroups(turns) {
    const groups = readGroups();
    let changed = false;
    for (const turn of turns) {
      const root = rootForKey(turn.key, groups);
      if (!Array.isArray(groups[root])) {
        groups[root] = [turn.key];
        changed = true;
      } else if (!groups[root].includes(turn.key)) {
        groups[root].push(turn.key);
        changed = true;
      }
    }
    if (changed) writeGroups(groups);
    return groups;
  }

  function applyVisibility() {
    const turns = collectTurns();
    const groups = ensureGroups(turns);
    const members = activeRoot && Array.isArray(groups[activeRoot]) ? new Set(groups[activeRoot]) : new Set();

    for (const turn of turns) {
      const show = Boolean(activeRoot && members.has(turn.key));
      for (const node of turn.nodes) {
        if (node instanceof HTMLElement) node.style.display = show ? "" : "none";
      }
    }

    if (activeRoot && viewport) {
      requestAnimationFrame(() => viewport?.scrollTo({ top: viewport.scrollHeight, behavior: "auto" }));
    }
  }

  function composer() {
    return document.querySelector('textarea[placeholder^="Type or speak your order"]');
  }

  function clearComposer() {
    const textarea = composer();
    if (!(textarea instanceof HTMLTextAreaElement)) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    if (setter) setter.call(textarea, ""); else textarea.value = "";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function showStatus(message, positive = true, duration = 1800) {
    const status = document.getElementById(STATUS_ID);
    if (!(status instanceof HTMLElement)) return;
    status.textContent = message;
    status.dataset.state = positive ? "ok" : "notice";
    status.className = positive
      ? "mt-1 min-h-4 px-1 text-[10px] font-medium text-emerald-300"
      : "mt-1 min-h-4 px-1 text-[10px] font-medium text-[#d7b64d]";
    if (statusTimer) clearTimeout(statusTimer);
    if (duration > 0) {
      statusTimer = setTimeout(() => {
        status.textContent = "";
      }, duration);
    }
  }

  function startNewChat() {
    activeRoot = "";
    clearComposer();
    applyVisibility();
    const textarea = composer();
    if (textarea instanceof HTMLTextAreaElement) textarea.focus();
    showStatus("New chat ready", true, 1200);
  }

  function findSidebarRows() {
    const aside = document.querySelector("aside");
    if (!aside) return [];
    return Array.from(aside.querySelectorAll("button")).filter((button) => {
      const title = button.getAttribute("title") || "";
      return title.startsWith(SIDEBAR_TITLE_PREFIX);
    });
  }

  function historyListSettled(turns) {
    const rows = findSidebarRows();
    if (turns.length > 0) return rows.length >= turns.length;
    const aside = document.querySelector("aside");
    return Boolean(aside && /No conversations yet\.|Loading conversations/.test(aside.textContent || ""));
  }

  function mapSidebarRows() {
    const turns = collectTurns();
    const rows = findSidebarRows();
    if (!turns.length || !rows.length) return;

    const newestTurns = [...turns].reverse();
    const groups = readGroups();
    rows.forEach((button, index) => {
      const turn = newestTurns[index];
      if (!turn) return;
      const root = rootForKey(turn.key, groups);
      button.dataset.rcTurnKey = turn.key;
      button.dataset.rcThreadRoot = root;
    });
  }

  function updateAutosaveState() {
    const rows = findSidebarRows();
    if (lastSidebarCount === null || !baselineComplete) {
      lastSidebarCount = rows.length;
      return;
    }
    if (rows.length > lastSidebarCount) {
      showStatus("✓ Auto-saved", true, 2200);
    }
    lastSidebarCount = rows.length;
  }

  function createToolButton(id, text, title) {
    const button = document.createElement("button");
    button.id = id;
    button.type = "button";
    button.textContent = text;
    button.title = title;
    button.className = "flex h-9 min-w-0 flex-1 items-center justify-center rounded-lg border border-[#FFD700]/55 bg-[#0b1524] px-2 text-[11px] font-semibold text-[#FFD700] hover:bg-white/[0.05]";
    return button;
  }

  function installSidebarTools() {
    if (document.getElementById(TOOLS_ID)) return;
    const aside = document.querySelector("aside");
    if (!aside) return;
    const scroll = aside.querySelector("div.min-h-0.flex-1");
    if (!(scroll instanceof HTMLElement)) return;

    const tools = document.createElement("div");
    tools.id = TOOLS_ID;
    tools.className = "mb-2 rounded-lg border border-white/10 bg-black/20 p-1.5";

    const row = document.createElement("div");
    row.className = "grid grid-cols-2 gap-1.5";

    const newChat = createToolButton(NEW_CHAT_ID, "+ New Chat", "Start a new blank conversation");
    newChat.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      startNewChat();
    });

    const voice = createToolButton(VOICE_ID, "🎙 Voice", "Voice Command");
    voice.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      startVoiceCommand();
    });

    const status = document.createElement("div");
    status.id = STATUS_ID;
    status.setAttribute("aria-live", "polite");
    status.className = "mt-1 min-h-4 px-1 text-[10px] font-medium text-emerald-300";

    row.append(newChat, voice);
    tools.append(row, status);
    scroll.insertBefore(tools, scroll.firstChild);
  }

  function closePalette() {
    document.getElementById(PALETTE_ID)?.remove();
  }

  function openThreadFromRow(row) {
    if (!(row instanceof HTMLButtonElement)) return;
    const root = row.dataset.rcThreadRoot;
    if (!root) return;
    activeRoot = root;
    clearComposer();
    applyVisibility();
  }

  function renderPaletteResults(container, query) {
    container.innerHTML = "";
    const q = normalise(query).toLowerCase();
    const rows = findSidebarRows();

    const commands = [
      { label: "+ New Chat", keywords: "new chat 새 대화", run: () => startNewChat() },
      { label: "Open recent conversation", keywords: "recent last previous 최근 지난 대화", run: () => rows[0] && openThreadFromRow(rows[0]) },
      { label: "Focus message input", keywords: "message input composer 메시지 입력 입력창", run: () => composer()?.focus() },
    ];

    const candidates = [];
    for (const command of commands) {
      if (!q || `${command.label} ${command.keywords}`.toLowerCase().includes(q)) {
        candidates.push({ label: command.label, run: command.run, kind: "Command" });
      }
    }

    for (const row of rows) {
      const label = normalise(row.textContent);
      if (!q || label.toLowerCase().includes(q)) {
        candidates.push({ label, run: () => openThreadFromRow(row), kind: "Conversation" });
      }
    }

    if (!candidates.length) {
      const empty = document.createElement("div");
      empty.className = "px-3 py-4 text-sm text-white/55";
      empty.textContent = "No matching Command Room item.";
      container.appendChild(empty);
      return;
    }

    candidates.slice(0, 12).forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "flex w-full items-center gap-3 border-b border-white/5 px-3 py-2.5 text-left hover:bg-white/[0.05]";
      const kind = document.createElement("span");
      kind.className = "w-20 shrink-0 text-[10px] uppercase tracking-wide text-[#d7b64d]";
      kind.textContent = item.kind;
      const label = document.createElement("span");
      label.className = "min-w-0 flex-1 truncate text-sm text-white/90";
      label.textContent = item.label;
      button.append(kind, label);
      button.addEventListener("click", () => {
        item.run();
        closePalette();
      });
      container.appendChild(button);
    });
  }

  function openPalette(initialQuery = "") {
    closePalette();

    const overlay = document.createElement("div");
    overlay.id = PALETTE_ID;
    overlay.className = "fixed inset-0 z-[320] flex items-start justify-center bg-black/55 px-4 pt-[16vh]";

    const panel = document.createElement("div");
    panel.className = "w-full max-w-xl overflow-hidden rounded-xl border border-[#FFD700]/55 bg-[#07101d] shadow-2xl";

    const input = document.createElement("input");
    input.type = "search";
    input.value = initialQuery;
    input.placeholder = "Search Command Room or type a command…";
    input.setAttribute("aria-label", "Search Command Room");
    input.className = "h-12 w-full border-b border-white/10 bg-[#0b1524] px-4 text-sm text-white outline-none placeholder:text-white/40";

    const results = document.createElement("div");
    results.className = "max-h-[52vh] overflow-y-auto";

    const hint = document.createElement("div");
    hint.className = "flex items-center justify-between border-t border-white/10 px-3 py-2 text-[10px] text-white/40";
    hint.innerHTML = "<span>Ctrl+K · conversations + commands</span><span>Esc to close</span>";

    input.addEventListener("input", () => renderPaletteResults(results, input.value));
    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePalette();
      }
      if (event.key === "Enter") {
        const first = results.querySelector("button");
        if (first instanceof HTMLButtonElement) {
          event.preventDefault();
          first.click();
        }
      }
    });
    overlay.addEventListener("mousedown", (event) => {
      if (event.target === overlay) closePalette();
    });

    panel.append(input, results, hint);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    renderPaletteResults(results, initialQuery);
    requestAnimationFrame(() => input.focus());
  }

  function currentVoiceLocale() {
    const select = document.querySelector('select[aria-label="Language"]');
    if (select instanceof HTMLSelectElement) {
      return select.value === "ko" ? "ko-KR" : select.value === "en" ? "en-AU" : select.value;
    }
    return "ko-KR";
  }

  function executeVoiceCommand(raw) {
    const spoken = normalise(raw);
    const lower = spoken.toLowerCase();

    if (/^(새\s*대화|새\s*채팅|new\s*chat|start\s*new\s*chat)/i.test(spoken)) {
      startNewChat();
      showStatus("Voice: New chat", true, 1800);
      return;
    }

    if (/(최근|마지막|지난)\s*(대화|채팅).*(열|보)|open\s*(recent|last|previous)\s*(chat|conversation)/i.test(spoken)) {
      const row = findSidebarRows()[0];
      if (row) {
        openThreadFromRow(row);
        showStatus("Voice: Recent conversation opened", true, 1800);
      } else {
        showStatus("No saved conversation yet", false, 1800);
      }
      return;
    }

    const searchMatch = spoken.match(/^(?:검색|찾아|search)\s+(.+)/i);
    if (searchMatch?.[1]) {
      openPalette(searchMatch[1]);
      showStatus(`Voice search: ${searchMatch[1]}`, true, 1600);
      return;
    }

    if (/(메시지|채팅)\s*(입력|쓰기)|입력창|message\s*input|focus\s*(message|composer)/i.test(spoken)) {
      const textarea = composer();
      if (textarea instanceof HTMLTextAreaElement) textarea.focus();
      showStatus("Voice: Message input", true, 1500);
      return;
    }

    openPalette(spoken);
    showStatus(`Voice search: ${spoken}`, true, 1600);
  }

  function startVoiceCommand() {
    const w = window;
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) {
      showStatus("Voice Command is not supported in this browser", false, 2400);
      return;
    }

    try { voiceRecognition?.abort?.(); } catch {}
    const recognition = new Recognition();
    voiceRecognition = recognition;
    recognition.lang = currentVoiceLocale();
    recognition.interimResults = false;
    recognition.continuous = false;

    const button = document.getElementById(VOICE_ID);
    recognition.onstart = () => {
      if (button) button.textContent = "● Listening";
      showStatus("Listening…", false, 0);
    };
    recognition.onerror = () => {
      if (button) button.textContent = "🎙 Voice";
      showStatus("Voice command could not start", false, 1800);
    };
    recognition.onend = () => {
      if (button) button.textContent = "🎙 Voice";
    };
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      if (transcript) executeVoiceCommand(transcript);
    };
    recognition.start();
  }

  function detectNewTurns() {
    const turns = collectTurns();

    if (!baselineComplete) {
      knownTurns = new Set(turns.map((turn) => turn.key));
      activeRoot = "";
      if (historyListSettled(turns)) baselineComplete = true;
      return;
    }

    const groups = readGroups();
    let changed = false;
    for (const turn of turns) {
      if (knownTurns.has(turn.key)) continue;
      knownTurns.add(turn.key);
      if (!activeRoot) activeRoot = turn.key;
      if (!Array.isArray(groups[activeRoot])) groups[activeRoot] = [activeRoot];
      if (!groups[activeRoot].includes(turn.key)) groups[activeRoot].push(turn.key);
      changed = true;
    }
    if (changed) writeGroups(groups);
  }

  function refresh() {
    detectNewTurns();
    installSidebarTools();
    mapSidebarRows();
    updateAutosaveState();
    applyVisibility();
  }

  function scheduleRefresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      refresh();
    });
  }

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("button") : null;
    if (!(target instanceof HTMLButtonElement)) return;
    const root = target.dataset.rcThreadRoot;
    if (!root) return;

    if (event.detail >= 2) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    activeRoot = root;
    clearComposer();
    applyVisibility();
  }, true);

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openPalette();
      return;
    }
    if (event.key === "Escape" && document.getElementById(PALETTE_ID)) {
      event.preventDefault();
      closePalette();
    }
  }, true);

  new MutationObserver(scheduleRefresh).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("pageshow", () => {
    activeRoot = "";
    baselineComplete = false;
    knownTurns = new Set();
    lastSidebarCount = null;
    clearComposer();
    scheduleRefresh();
  });

  scheduleRefresh();
})();
