(() => {
  if (!/^\/rooms\//.test(window.location.pathname)) return;

  const ROW_TITLE_PREFIX = "Click: view conversation";
  const HANGUL = /[\u3131-\u318E\uAC00-\uD7A3]/;
  const STYLE_ID = "rc-conversation-title-edit-style";
  let scheduled = false;

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .rc-title-edit-button {
        order: 3 !important;
        width: 24px !important;
        height: 24px !important;
        min-width: 24px !important;
        margin-right: 4px !important;
        display: grid !important;
        place-items: center !important;
        border: 0 !important;
        background: transparent !important;
        color: #FFD700 !important;
        font-size: 15px !important;
        line-height: 1 !important;
        cursor: pointer !important;
      }
      .rc-title-edit-button:hover {
        background: rgba(255,215,0,.08) !important;
        border-radius: 4px !important;
      }
    `;
    document.head.appendChild(style);
  }

  function sidebar() {
    return document.querySelector(".royal-room-layout > aside:first-child") || document.querySelector("aside");
  }

  function conversationRows() {
    const aside = sidebar();
    if (!aside) return [];
    return Array.from(aside.querySelectorAll(".space-y-1 > div.group.flex"));
  }

  function titleButtons() {
    const aside = sidebar();
    if (!aside) return [];
    return Array.from(aside.querySelectorAll("button")).filter((button) => {
      const title = button.getAttribute("title") || "";
      return title.startsWith(ROW_TITLE_PREFIX);
    });
  }

  function setReactInputValue(input, value) {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    if (descriptor?.set) descriptor.set.call(input, value);
    else input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function fallbackForRow(row, allRows) {
    const index = allRows.indexOf(row);
    return `Conversation ${index >= 0 ? index + 1 : 1}`;
  }

  function normalizeEditingRows() {
    const allRows = conversationRows();
    allRows.forEach((row) => {
      const input = Array.from(row.querySelectorAll("input")).find((item) => item.type !== "checkbox");
      if (!(input instanceof HTMLInputElement)) return;
      const current = (input.value || "").trim();
      if (!HANGUL.test(current)) return;
      setReactInputValue(input, fallbackForRow(row, allRows));
    });
  }

  function cleanVisibleTitles() {
    installStyle();
    const allRows = conversationRows();
    const items = titleButtons();

    items.forEach((button) => {
      const row = button.parentElement;
      if (!(row instanceof HTMLElement)) return;

      let visible = (button.textContent || "").trim();
      if (!visible || HANGUL.test(visible)) {
        visible = fallbackForRow(row, allRows);
        if ((button.textContent || "").trim() !== visible) button.textContent = visible;
      }

      button.setAttribute("aria-label", visible);
      button.dataset.rcEnglishTitle = visible;

      const checkbox = row.querySelector('input[type="checkbox"]');
      if (checkbox instanceof HTMLInputElement) {
        checkbox.setAttribute("aria-label", `Select ${visible}`);
      }

      if (!row.querySelector(".rc-title-edit-button")) {
        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "rc-title-edit-button";
        edit.textContent = "✎";
        edit.title = "Edit conversation title";
        edit.setAttribute("aria-label", `Edit ${visible}`);
        edit.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          button.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true, view: window }));
          requestAnimationFrame(normalizeEditingRows);
        });
        row.appendChild(edit);
      }
    });

    normalizeEditingRows();

    document.querySelectorAll(".fixed.inset-0").forEach((modal) => {
      const heading = modal.querySelector(".font-semibold");
      if (!(heading instanceof HTMLElement)) return;
      const text = (heading.textContent || "").trim();
      if (HANGUL.test(text)) heading.textContent = "Conversation";
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
