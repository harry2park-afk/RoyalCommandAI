(() => {
  if (!/^\/rooms\//.test(window.location.pathname)) return;

  const ROW_TITLE_PREFIX = "Click: view conversation";
  const HANGUL = /[\u3131-\u318E\uAC00-\uD7A3]/;
  let scheduled = false;

  function rows() {
    const aside = document.querySelector("aside");
    if (!aside) return [];
    return Array.from(aside.querySelectorAll("button")).filter((button) => {
      const title = button.getAttribute("title") || "";
      return title.startsWith(ROW_TITLE_PREFIX);
    });
  }

  function cleanVisibleTitles() {
    const items = rows();
    items.forEach((button, index) => {
      const current = (button.textContent || "").trim();
      if (!current || !HANGUL.test(current)) return;

      const label = `Conversation ${items.length - index}`;
      button.textContent = label;
      button.setAttribute("aria-label", label);

      const row = button.parentElement;
      if (!row) return;
      const checkbox = row.querySelector('input[type="checkbox"]');
      if (checkbox instanceof HTMLInputElement) {
        checkbox.setAttribute("aria-label", `Select ${label}`);
      }
    });
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      cleanVisibleTitles();
    });
  }

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  schedule();
})();
