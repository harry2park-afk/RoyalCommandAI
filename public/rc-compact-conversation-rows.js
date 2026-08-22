(() => {
  if (!/^\/rooms\//.test(window.location.pathname)) return;

  const STYLE_ID = "rc-compact-conversation-rows-style";
  const GROUP_KEY = `royalcommand:chat-groups:${window.location.pathname}`;
  const SIDEBAR_TITLE_PREFIX = "Click: open full conversation";
  const USER_TITLES = new Set(["클릭하면 전체 내용을 봅니다", "Click to view full content"]);

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      aside .space-y-1 > div.group.flex {
        height: 30px !important;
        min-height: 30px !important;
        max-height: 30px !important;
        border-radius: 6px !important;
      }

      aside button[title^="Click: open full conversation"] {
        min-height: 30px !important;
        height: 30px !important;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
        line-height: 30px !important;
        font-size: 10px !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }

      aside .space-y-1 > div.group.flex > input[type="checkbox"] {
        align-self: center !important;
      }

      aside .space-y-1 > div.group.flex input[type="text"],
      aside .space-y-1 > div.group.flex input:not([type]) {
        height: 24px !important;
        min-height: 24px !important;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
        font-size: 10px !important;
        line-height: 24px !important;
      }
    `;
    document.head.appendChild(style);
  }

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

  function rootForKey(key, groups) {
    for (const [root, members] of Object.entries(groups)) {
      if (Array.isArray(members) && members.includes(key)) return root;
    }
    return key;
  }

  function isUserTurn(node) {
    if (!(node instanceof HTMLButtonElement)) return false;
    const title = node.getAttribute("title") || "";
    if (USER_TITLES.has(title)) return true;
    const cls = String(node.className || "");
    return cls.includes("border-[3px]") && cls.includes("border-[#FFD700]");
  }

  function findViewport() {
    return Array.from(document.querySelectorAll("div")).find((element) => {
      const cls = String(element.className || "");
      return cls.includes("overflow-y-auto") && cls.includes("overscroll-contain");
    }) || null;
  }

  function collectTurnKeys() {
    const viewport = findViewport();
    if (!viewport) return [];
    return Array.from(viewport.children)
      .filter(isUserTurn)
      .map((node) => normalise(node.textContent))
      .filter(Boolean);
  }

  function sidebarRows() {
    const aside = document.querySelector("aside");
    if (!aside) return [];
    return Array.from(aside.querySelectorAll("button")).filter((button) => {
      const title = button.getAttribute("title") || "";
      return title.startsWith(SIDEBAR_TITLE_PREFIX);
    });
  }

  function rowContainer(button) {
    return button.closest("div.group.flex");
  }

  function applyConversationSessions() {
    const turnKeys = collectTurnKeys();
    const rows = sidebarRows();
    if (!turnKeys.length || !rows.length) return;

    const newestTurns = [...turnKeys].reverse();
    const groups = readGroups();
    const mapped = [];

    rows.forEach((button, index) => {
      const key = newestTurns[index];
      if (!key) return;
      const root = rootForKey(key, groups);
      button.dataset.rcTurnKey = key;
      button.dataset.rcThreadRoot = root;
      mapped.push({ button, key, root });
    });

    const representative = new Map();
    for (const item of mapped) {
      if (item.key === item.root) representative.set(item.root, item.button);
    }
    for (const item of mapped) {
      if (!representative.has(item.root)) representative.set(item.root, item.button);
    }

    for (const item of mapped) {
      const container = rowContainer(item.button);
      if (!(container instanceof HTMLElement)) continue;
      const keep = representative.get(item.root) === item.button;
      container.style.display = keep ? "" : "none";
      container.dataset.rcConversationSession = item.root;
      container.dataset.rcConversationMember = item.key;
    }
  }

  let timer = 0;
  function schedule() {
    window.clearTimeout(timer);
    timer = window.setTimeout(applyConversationSessions, 180);
  }

  schedule();
  window.setTimeout(applyConversationSessions, 700);
  window.setTimeout(applyConversationSessions, 1600);

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("pageshow", schedule);
  window.addEventListener("storage", (event) => {
    if (event.key === GROUP_KEY) schedule();
  });

  window.setInterval(applyConversationSessions, 1800);
})();
