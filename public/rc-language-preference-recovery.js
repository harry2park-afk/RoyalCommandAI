(() => {
  if (!/^\/rooms\//.test(window.location.pathname)) return;

  const LEGACY_ORDER_KEY = "royalcommand:language-order";
  const CURRENT_ORDER_KEY = "royalcommand:language-order-v3";
  const MIGRATION_KEY = "royalcommand:language-order-v3-legacy-migrated-v1";

  function validOrder(value) {
    return Array.isArray(value)
      ? value.filter((item) => typeof item === "string" && /^[a-z]{2,3}-[A-Z]{2}$/i.test(item))
      : [];
  }

  function migrateLegacyOrderOnce() {
    try {
      if (localStorage.getItem(MIGRATION_KEY) === "1") return;
      const legacyRaw = localStorage.getItem(LEGACY_ORDER_KEY);
      if (!legacyRaw) {
        localStorage.setItem(MIGRATION_KEY, "1");
        return;
      }
      const legacy = validOrder(JSON.parse(legacyRaw));
      if (legacy.length) localStorage.setItem(CURRENT_ORDER_KEY, JSON.stringify(legacy));
      localStorage.setItem(MIGRATION_KEY, "1");
    } catch {
      // Keep the existing picker usable even when older browser storage is malformed.
    }
  }

  function enhanceSearchAndRows() {
    const picker = document.querySelector(".rc-lang-picker");
    if (!(picker instanceof HTMLElement)) return;

    const menus = Array.from(document.body.children).filter((node) => {
      if (!(node instanceof HTMLElement)) return false;
      return Boolean(node.querySelector('input[placeholder^="Search country or language"]'));
    });

    for (const menu of menus) {
      const search = menu.querySelector('input[placeholder^="Search country or language"]');
      if (!(search instanceof HTMLInputElement)) continue;

      search.dataset.rcLanguageSearch = "true";
      search.placeholder = "Search country or language";
      search.setAttribute("aria-label", "Search country or language");
      search.setAttribute("autocomplete", "off");
      search.setAttribute("spellcheck", "false");
      search.style.height = "40px";
      search.style.fontSize = "14px";
      search.style.lineHeight = "20px";
      search.style.paddingLeft = "38px";
      search.style.paddingRight = "10px";
      search.style.backgroundImage = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='11' cy='11' r='6.5' fill='none' stroke='%23f3d36a' stroke-width='2'/%3E%3Cpath d='M16 16l5 5' fill='none' stroke='%23f3d36a' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E\")";
      search.style.backgroundRepeat = "no-repeat";
      search.style.backgroundPosition = "11px center";
      search.style.backgroundSize = "18px 18px";

      const hint = Array.from(menu.children).find((node) =>
        node instanceof HTMLElement && String(node.textContent || "").includes("Drag to reorder")
      );
      if (hint instanceof HTMLElement) {
        hint.style.fontSize = "12px";
        hint.style.lineHeight = "18px";
        hint.style.paddingTop = "9px";
      }

      const rows = Array.from(menu.querySelectorAll("div[data-value], div[draggable]"));
      rows.forEach((row) => {
        if (!(row instanceof HTMLElement)) return;
        row.style.fontSize = "14px";
        row.style.lineHeight = "20px";
        row.style.minHeight = "36px";
        const action = row.querySelector('button[data-hide]');
        if (action instanceof HTMLButtonElement) action.style.fontSize = "12px";
        const selected = Array.from(row.querySelectorAll("span")).find((span) => span.textContent === "SELECTED");
        if (selected instanceof HTMLElement) selected.style.fontSize = "11px";
      });
    }
  }

  migrateLegacyOrderOnce();
  enhanceSearchAndRows();

  const observer = new MutationObserver(() => enhanceSearchAndRows());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("storage", (event) => {
    if (event.key === LEGACY_ORDER_KEY || event.key === CURRENT_ORDER_KEY) enhanceSearchAndRows();
  });
})();
