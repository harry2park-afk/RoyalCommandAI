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
        height: 30px !important;
        min-height: 30px !important;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
        padding-left: 6px !important;
        padding-right: 6px !important;
        border: 2px solid #ef4444 !important;
        border-radius: 6px !important;
        background: rgba(239,68,68,.04) !important;
        color: #fca5a5 !important;
        font-size: 10px !important;
        line-height: 1 !important;
        gap: 4px !important;
      }
      .rc-compact-action-row > button svg {
        width: 12px !important;
        height: 12px !important;
      }
    `;
    document.head.appendChild(style);
  }

  function arrange() {
    const aside = document.querySelector(".royal-room-layout > aside:first-child") || document.querySelector("aside");
    if (!(aside instanceof HTMLElement)) return;

    const select = aside.querySelector('input[aria-label="Select all conversations"]');
    const save = aside.querySelector('button[title="Save selected conversations"]');
    const del = aside.querySelector('button[title="Delete selected conversations"]');
    if (!(select instanceof HTMLInputElement) || !(save instanceof HTMLButtonElement) || !(del instanceof HTMLButtonElement)) return;

    const selectBox = select.closest("div.mb-1");
    const actionRow = save.parentElement;
    if (!(selectBox instanceof HTMLElement) || !(actionRow instanceof HTMLElement)) return;

    installStyle();
    actionRow.classList.add("rc-compact-action-row");
    selectBox.classList.add("rc-compact-select-wrap");

    if (actionRow.firstElementChild !== selectBox) {
      actionRow.insertBefore(selectBox, actionRow.firstChild);
    }
  }

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
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
