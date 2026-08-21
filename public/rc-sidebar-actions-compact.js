(() => {
  if (!/^\/rooms\//.test(window.location.pathname)) return;

  const STYLE_ID = "rc-sidebar-actions-compact-style";

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .rc-compact-action-row {
        display: grid !important;
        grid-template-columns: 32px minmax(0,1fr) minmax(0,1fr) !important;
        gap: 6px !important;
        margin-bottom: 8px !important;
        align-items: center !important;
      }
      .rc-compact-select-wrap {
        width: 32px !important;
        height: 30px !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
        border-radius: 6px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      .rc-compact-select-wrap label {
        width: 32px !important;
        height: 30px !important;
        padding: 0 !important;
        margin: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 0 !important;
      }
      .rc-compact-select-wrap label > span {
        display: none !important;
      }
      .rc-compact-select-wrap input[type="checkbox"] {
        width: 18px !important;
        height: 18px !important;
        margin: 0 !important;
        flex: 0 0 18px !important;
        background: #ffffff !important;
        border: 2px solid #2A3B6E !important;
        accent-color: #2A3B6E !important;
        box-shadow: 0 0 0 1px rgba(42,59,110,.15) !important;
      }
      .rc-compact-action-row > button {
        height: 25px !important;
        min-height: 25px !important;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
        padding-left: 6px !important;
        padding-right: 6px !important;
        border-radius: 6px !important;
        font-size: 10px !important;
        line-height: 1 !important;
        gap: 4px !important;
        opacity: 1 !important;
        cursor: pointer !important;
      }
      .rc-compact-action-row > button:first-of-type {
        border: 3px solid #00e85a !important;
        background: rgba(0,232,90,.08) !important;
        color: #50ff8f !important;
        box-shadow: 0 0 7px rgba(0,232,90,.60) !important;
      }
      .rc-compact-action-row > button:last-of-type {
        border: 3px solid #ff0000 !important;
        background: rgba(255,0,0,.08) !important;
        color: #ff4d4d !important;
        box-shadow: 0 0 7px rgba(255,0,0,.65) !important;
      }
      .rc-compact-action-row > button:disabled {
        opacity: 1 !important;
        cursor: pointer !important;
      }
      .rc-compact-action-row > button svg {
        width: 12px !important;
        height: 12px !important;
      }
    `;
    document.head.appendChild(style);
  }

  function findActionButtons(aside, selectBox) {
    const nearbyRow = selectBox?.nextElementSibling;
    const rows = [nearbyRow, ...Array.from(aside.querySelectorAll("div.grid"))]
      .filter((element) => element instanceof HTMLElement);

    for (const row of rows) {
      const buttons = Array.from(row.querySelectorAll(":scope > button"));
      const save = buttons.find((button) => (button.textContent || "").trim().toUpperCase().includes("SAVE"));
      const del = buttons.find((button) => (button.textContent || "").trim().toUpperCase().includes("DELETE"));
      if (save instanceof HTMLButtonElement && del instanceof HTMLButtonElement) {
        return { actionRow: row, save, del };
      }
    }

    return null;
  }

  function arrange() {
    const aside = document.querySelector(".royal-room-layout > aside:first-child") || document.querySelector("aside");
    if (!(aside instanceof HTMLElement)) return;

    const select = aside.querySelector('input[aria-label="Select all conversations"]');
    if (!(select instanceof HTMLInputElement)) return;

    const selectBox = select.closest("div.mb-1");
    if (!(selectBox instanceof HTMLElement)) return;

    const actionParts = findActionButtons(aside, selectBox);
    if (!actionParts) return;
    const { actionRow, save, del } = actionParts;

    installStyle();
    actionRow.classList.add("rc-compact-action-row");
    selectBox.classList.add("rc-compact-select-wrap");

    if (actionRow.firstElementChild !== selectBox) {
      actionRow.insertBefore(selectBox, actionRow.firstChild);
    }

    // Keep buttons visually and physically clickable. Their React handlers
    // still decide whether there is a selected conversation to process.
    if (save.disabled) save.disabled = false;
    if (del.disabled) del.disabled = false;
  }

  // Owner-approved behavior: selected conversations are deleted immediately,
  // without showing the browser confirmation dialog.
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest("button");
    if (!(button instanceof HTMLButtonElement)) return;
    if (!(button.textContent || "").trim().toUpperCase().includes("DELETE")) return;

    const originalConfirm = window.confirm;
    window.confirm = () => true;
    setTimeout(() => {
      window.confirm = originalConfirm;
    }, 0);
  }, true);

  arrange();
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      arrange();
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled"] });
})();
