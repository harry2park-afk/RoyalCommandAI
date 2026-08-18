(() => {
  if (!/^\/rooms\//.test(window.location.pathname)) return;

  const NEW_CHAT_ID = "rc-new-chat-button";
  const GROUP_KEY = `royalcommand:chat-groups:${window.location.pathname}`;
  const USER_TITLES = new Set(["클릭하면 전체 내용을 봅니다", "Click to view full content"]);
  const SIDEBAR_TITLE_PREFIX = "Click: view conversation";

  let viewport = null;
  let activeRoot = "";
  let initialised = false;
  let knownTurns = new Set();
  let scheduled = false;

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
      const show = activeRoot && members.has(turn.key);
      for (const node of turn.nodes) {
        if (node instanceof HTMLElement) node.style.display = show ? "" : "none";
      }
    }

    if (activeRoot && viewport) {
      requestAnimationFrame(() => viewport?.scrollTo({ top: viewport.scrollHeight, behavior: "auto" }));
    }
  }

  function clearComposer() {
    const textarea = document.querySelector('textarea[placeholder^="Type or speak your order"]');
    if (!(textarea instanceof HTMLTextAreaElement)) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    if (setter) setter.call(textarea, ""); else textarea.value = "";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function startNewChat() {
    activeRoot = "";
    clearComposer();
    applyVisibility();
    const textarea = document.querySelector('textarea[placeholder^="Type or speak your order"]');
    if (textarea instanceof HTMLTextAreaElement) textarea.focus();
  }

  function findSidebarRows() {
    const aside = document.querySelector("aside");
    if (!aside) return [];
    return Array.from(aside.querySelectorAll("button")).filter((button) => {
      const title = button.getAttribute("title") || "";
      return title.startsWith(SIDEBAR_TITLE_PREFIX);
    });
  }

  function mapSidebarRows() {
    const turns = collectTurns();
    const rows = findSidebarRows();
    if (!turns.length || !rows.length) return;

    const newestTurns = [...turns].reverse();
    rows.forEach((button, index) => {
      const turn = newestTurns[index];
      if (!turn) return;
      const groups = readGroups();
      const root = rootForKey(turn.key, groups);
      button.dataset.rcTurnKey = turn.key;
      button.dataset.rcThreadRoot = root;
    });
  }

  function installNewChatButton() {
    if (document.getElementById(NEW_CHAT_ID)) return;
    const aside = document.querySelector("aside");
    if (!aside) return;
    const scroll = aside.querySelector("div.min-h-0.flex-1");
    if (!(scroll instanceof HTMLElement)) return;

    const button = document.createElement("button");
    button.id = NEW_CHAT_ID;
    button.type = "button";
    button.textContent = "+ New Chat";
    button.title = "Start a new blank conversation";
    button.className = "mb-2 flex h-9 w-full items-center justify-center rounded-lg border border-[#FFD700]/65 bg-[#0b1524] px-3 text-[12px] font-semibold text-[#FFD700] hover:bg-white/[0.05]";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      startNewChat();
    });
    scroll.insertBefore(button, scroll.firstChild);
  }

  function detectNewTurns() {
    const turns = collectTurns();
    if (!initialised) {
      knownTurns = new Set(turns.map((turn) => turn.key));
      initialised = true;
      startNewChat();
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
    installNewChatButton();
    mapSidebarRows();
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

  new MutationObserver(scheduleRefresh).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("pageshow", () => {
    activeRoot = "";
    scheduleRefresh();
  });

  scheduleRefresh();
})();
