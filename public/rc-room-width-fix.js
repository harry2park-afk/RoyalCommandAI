(() => {
  const BTN_ID = "rc-room-right-master-toggle";
  let collapsed = false;

  function getLayout() {
    const textarea = document.querySelector('textarea[placeholder*="Royal Command"]');
    if (!(textarea instanceof HTMLTextAreaElement)) return {};
    const form = textarea.closest("form");
    const section = textarea.closest("section");
    const grid = section?.parentElement;
    const main = textarea.closest("main");
    const aside = grid instanceof HTMLElement
      ? [...grid.children].find((el) => el instanceof HTMLElement && el.tagName === "ASIDE")
      : null;
    return { textarea, form, section, grid, main, aside };
  }

  function hideConflictingRightButtons() {
    const old = document.getElementById("rc-right-edge-toggle");
    if (old instanceof HTMLElement) old.style.setProperty("display", "none", "important");

    [...document.querySelectorAll("button")].forEach((button) => {
      if (!(button instanceof HTMLButtonElement) || button.id === BTN_ID) return;
      const r = button.getBoundingClientRect();
      if (r.right > window.innerWidth - 45 && r.top > window.innerHeight * 0.3 && r.bottom < window.innerHeight * 0.7 && r.height >= 45) {
        button.style.setProperty("display", "none", "important");
      }
    });
  }

  function expandToViewport(main) {
    if (!(main instanceof HTMLElement)) return;
    const left = main.getBoundingClientRect().left;
    const width = Math.max(320, window.innerWidth - left);
    main.style.setProperty("width", `${width}px`, "important");
    main.style.setProperty("max-width", "none", "important");
    main.style.setProperty("min-width", "0", "important");
    main.style.setProperty("margin-right", "0", "important");
    main.style.setProperty("padding-right", "0", "important");

    let parent = main.parentElement;
    for (let i = 0; i < 4 && parent && parent !== document.body; i++, parent = parent.parentElement) {
      parent.style.setProperty("max-width", "none", "important");
      parent.style.setProperty("overflow-x", "visible", "important");
    }
  }

  function applyCollapsed() {
    const { textarea, form, section, grid, main, aside } = getLayout();
    if (!(textarea instanceof HTMLTextAreaElement) || !(section instanceof HTMLElement)) return;

    expandToViewport(main);

    if (grid instanceof HTMLElement) {
      grid.style.setProperty("display", "grid", "important");
      grid.style.setProperty("grid-template-columns", "minmax(0,1fr)", "important");
      grid.style.setProperty("gap", "0", "important");
      grid.style.setProperty("width", "100%", "important");
      grid.style.setProperty("max-width", "none", "important");
      grid.style.setProperty("min-width", "0", "important");
    }

    if (aside instanceof HTMLElement) {
      aside.style.setProperty("display", "none", "important");
    }

    section.style.setProperty("width", "100%", "important");
    section.style.setProperty("max-width", "none", "important");
    section.style.setProperty("min-width", "0", "important");

    if (form instanceof HTMLElement) {
      form.style.setProperty("width", "100%", "important");
      form.style.setProperty("max-width", "none", "important");
      form.style.setProperty("min-width", "0", "important");
    }

    textarea.style.setProperty("width", "100%", "important");
    textarea.style.setProperty("max-width", "none", "important");
    textarea.style.setProperty("min-width", "0", "important");
  }

  function applyOpen() {
    const { textarea, form, section, grid, main, aside } = getLayout();
    if (main instanceof HTMLElement) {
      ["width", "max-width", "min-width", "margin-right", "padding-right"].forEach((p) => main.style.removeProperty(p));
    }
    if (grid instanceof HTMLElement) {
      ["display", "grid-template-columns", "gap", "width", "max-width", "min-width"].forEach((p) => grid.style.removeProperty(p));
    }
    if (aside instanceof HTMLElement) aside.style.removeProperty("display");
    if (section instanceof HTMLElement) ["width", "max-width", "min-width"].forEach((p) => section.style.removeProperty(p));
    if (form instanceof HTMLElement) ["width", "max-width", "min-width"].forEach((p) => form.style.removeProperty(p));
    if (textarea instanceof HTMLElement) ["width", "max-width", "min-width"].forEach((p) => textarea.style.removeProperty(p));
  }

  function updateButton() {
    const button = document.getElementById(BTN_ID);
    if (!(button instanceof HTMLButtonElement)) return;
    button.textContent = collapsed ? "‹" : "›";
    button.title = collapsed ? "오른쪽 패널 열기" : "오른쪽 패널 완전히 접기";
  }

  function toggle() {
    collapsed = !collapsed;
    if (collapsed) applyCollapsed(); else applyOpen();
    updateButton();
    setTimeout(() => collapsed && applyCollapsed(), 50);
    setTimeout(() => collapsed && applyCollapsed(), 250);
  }

  function ensureButton() {
    hideConflictingRightButtons();
    let button = document.getElementById(BTN_ID);
    if (!(button instanceof HTMLButtonElement)) {
      button = document.createElement("button");
      button.id = BTN_ID;
      button.type = "button";
      button.style.cssText = "position:fixed;right:0;top:50%;transform:translateY(-50%);z-index:2147483647;width:38px;height:68px;border:1px solid rgba(212,175,55,.65);border-right:0;border-radius:10px 0 0 10px;background:#050a12;color:#f2cf5b;font-size:30px;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer";
      button.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); toggle(); });
      button.addEventListener("dblclick", (e) => { e.preventDefault(); e.stopPropagation(); if (!collapsed) toggle(); });
      document.body.appendChild(button);
    }
    updateButton();
  }

  function apply() {
    ensureButton();
    if (collapsed) applyCollapsed();
  }

  apply();
  window.addEventListener("resize", () => collapsed && applyCollapsed());
  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      apply();
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();