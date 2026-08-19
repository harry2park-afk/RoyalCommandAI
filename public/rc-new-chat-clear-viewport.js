(() => {
  if (!/^\/rooms\//.test(window.location.pathname)) return;

  const NEW_CHAT_ID = "rc-new-chat-button";
  const SIDEBAR_TITLE_PREFIX = "Click: view conversation";
  const HIDDEN_ATTR = "data-rc-new-chat-standalone-hidden";
  const USER_TITLES = new Set(["클릭하면 전체 내용을 봅니다", "Click to view full content"]);

  function findViewport() {
    return Array.from(document.querySelectorAll("div")).find((el) => {
      const cls = String(el.className || "");
      return cls.includes("overflow-y-auto") && cls.includes("overscroll-contain");
    }) || null;
  }

  function isUserTurn(node) {
    if (!(node instanceof HTMLButtonElement)) return false;
    const title = node.getAttribute("title") || "";
    if (USER_TITLES.has(title)) return true;
    const cls = String(node.className || "");
    return cls.includes("border-[3px]") && cls.includes("border-[#FFD700]");
  }

  function clearStandaloneCardsForNewChat() {
    const viewport = findViewport();
    if (!viewport) return;

    let insideThread = false;
    for (const child of Array.from(viewport.children)) {
      if (isUserTurn(child)) insideThread = true;
      if (insideThread) continue;
      if (!(child instanceof HTMLElement)) continue;

      child.setAttribute(HIDDEN_ATTR, "1");
      child.style.display = "none";
    }
  }

  function restoreStandaloneCards() {
    const viewport = findViewport();
    if (!viewport) return;
    for (const child of Array.from(viewport.children)) {
      if (!(child instanceof HTMLElement)) continue;
      if (child.getAttribute(HIDDEN_ATTR) !== "1") continue;
      child.removeAttribute(HIDDEN_ATTR);
      child.style.display = "";
    }
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const newChat = target.closest(`#${NEW_CHAT_ID}`);
    if (newChat) {
      window.setTimeout(clearStandaloneCardsForNewChat, 0);
      window.setTimeout(clearStandaloneCardsForNewChat, 120);
      return;
    }

    const historyButton = target.closest('aside button[title^="Click: view conversation"]');
    if (historyButton) {
      restoreStandaloneCards();
    }
  }, true);
})();
