(() => {
  if (!/^\/rooms\//.test(window.location.pathname)) return;

  const STYLE_ID = "rc-compact-conversation-rows-style";
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    aside .space-y-1 > div.group.flex {
      height: 30px !important;
      min-height: 30px !important;
      max-height: 30px !important;
      border-radius: 6px !important;
    }

    aside button[title^="Click: view conversation"] {
      min-height: 30px !important;
      height: 30px !important;
      padding-top: 0 !important;
      padding-bottom: 0 !important;
      line-height: 30px !important;
      font-size: 12px !important;
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
      font-size: 12px !important;
      line-height: 24px !important;
    }
  `;
  document.head.appendChild(style);
})();
