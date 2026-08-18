(() => {
  if (!/^\/rooms\//.test(window.location.pathname)) return;

  const STORAGE_KEY = `royalcommand:room:${window.location.pathname}:compact-ai-dock`;
  const WAREHOUSE_LABEL = "AI Warehouse";
  let seeded = false;
  let scheduled = false;
  let pendingWarehouseName = "";

  function readVisible() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string" && item.trim()) : [];
    } catch {
      return [];
    }
  }

  function writeVisible(names) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(new Set(names)))); } catch {}
  }

  function topDock() {
    const bar = Array.from(document.querySelectorAll("div")).find((el) => {
      const cls = String(el.className || "");
      return cls.includes("fixed") && cls.includes("h-[92px]") && cls.includes("z-[170]");
    });
    if (!bar) return null;
    return Array.from(bar.children).find((child) => {
      const cls = String(child.className || "");
      return cls.includes("h-[50px]") && cls.includes("items-center");
    }) || null;
  }

  function warehouseButton(dock) {
    if (!(dock instanceof HTMLElement)) return null;
    return Array.from(dock.querySelectorAll("button")).find((button) => {
      const title = button.getAttribute("title") || "";
      return title.includes(WAREHOUSE_LABEL) || (button.textContent || "").includes(WAREHOUSE_LABEL);
    }) || null;
  }

  function aiButtons() {
    const dock = topDock();
    if (!(dock instanceof HTMLElement)) return [];
    const warehouse = warehouseButton(dock);
    return Array.from(dock.querySelectorAll(":scope > button")).filter((button) => button !== warehouse);
  }

  function shortName(button) {
    const spans = Array.from(button.querySelectorAll("span"));
    const textSpan = spans.find((span) => {
      const text = (span.textContent || "").trim();
      return text && text.length > 1 && !span.dataset.rcAiTick;
    });
    if (textSpan) return (textSpan.textContent || "").trim();
    const title = (button.getAttribute("title") || "").replace(/\s+—.*$/, "").trim();
    return title || (button.textContent || "").trim();
  }

  function isActive(button) {
    return String(button.className || "").includes("bg-[#7A0C2E]");
  }

  function seedVisible(buttons) {
    if (seeded) return;
    let visible = readVisible();
    if (!visible.length) {
      visible = buttons.filter(isActive).map(shortName).filter(Boolean);
      writeVisible(visible);
    }
    seeded = true;
  }

  function ensureTick(button, active) {
    let tick = button.querySelector('[data-rc-ai-tick="1"]');
    if (!(tick instanceof HTMLSpanElement)) {
      tick = document.createElement("span");
      tick.dataset.rcAiTick = "1";
      tick.textContent = "✓";
      tick.setAttribute("aria-hidden", "true");
      button.appendChild(tick);
    }
    tick.style.marginLeft = "2px";
    tick.style.fontSize = "12px";
    tick.style.fontWeight = "700";
    tick.style.lineHeight = "1";
    tick.style.color = active ? "#22c55e" : "rgba(148,163,184,.35)";
    tick.style.textShadow = active ? "0 0 7px rgba(34,197,94,.55)" : "none";
  }

  function styleButton(button, visibleNames) {
    const name = shortName(button);
    const show = visibleNames.includes(name);
    button.style.display = show ? "inline-flex" : "none";
    if (!show) return;

    button.style.flex = "0 0 auto";
    button.style.width = "auto";
    button.style.minWidth = "0";
    button.style.height = "30px";
    button.style.padding = "2px 6px";
    button.style.gap = "5px";
    button.style.border = "0";
    button.style.borderRadius = "0";
    button.style.background = "transparent";
    button.style.boxShadow = "none";
    button.style.color = "#f4f0e7";
    button.style.whiteSpace = "nowrap";
    button.style.opacity = button.disabled ? ".38" : "1";

    const logoWrap = button.querySelector("span.relative");
    if (logoWrap instanceof HTMLElement) {
      logoWrap.style.background = "transparent";
      logoWrap.style.width = "22px";
      logoWrap.style.height = "22px";
      logoWrap.style.borderRadius = "0";
    }

    const spans = Array.from(button.querySelectorAll("span"));
    const label = spans.find((span) => {
      const text = (span.textContent || "").trim();
      return text === name && !span.dataset.rcAiTick;
    });
    if (label instanceof HTMLElement) {
      label.style.transform = "none";
      label.style.fontFamily = "Times New Roman, serif";
      label.style.fontSize = "12px";
      label.style.fontWeight = "400";
      label.style.color = "#f4f0e7";
      label.style.overflow = "visible";
      label.style.textOverflow = "clip";
    }

    ensureTick(button, isActive(button));
  }

  function moveLanguageToDock(dock) {
    const language = document.querySelector('select[aria-label="Language"]');
    if (!(language instanceof HTMLSelectElement)) return;
    if (dock.lastElementChild !== language) dock.appendChild(language);
    language.style.flex = "0 0 auto";
    language.style.marginLeft = "auto";
    language.style.height = "30px";
    language.style.minWidth = "116px";
    language.style.padding = "2px 8px";
    language.style.alignSelf = "center";
  }

  function styleDock() {
    const dock = topDock();
    if (!(dock instanceof HTMLElement)) return;
    const buttons = aiButtons();
    if (!buttons.length) return;

    seedVisible(buttons);
    let visibleNames = readVisible();

    if (pendingWarehouseName) {
      const match = buttons.find((button) => shortName(button) === pendingWarehouseName);
      if (match && !visibleNames.includes(pendingWarehouseName)) {
        visibleNames = [...visibleNames, pendingWarehouseName];
        writeVisible(visibleNames);
      }
      if (match) pendingWarehouseName = "";
    }

    dock.style.gap = "10px";
    dock.style.overflowX = "auto";
    dock.style.overflowY = "hidden";
    dock.style.whiteSpace = "nowrap";
    dock.style.justifyContent = "flex-start";
    dock.style.paddingLeft = "10px";
    dock.style.paddingRight = "10px";

    const warehouse = warehouseButton(dock);
    if (warehouse instanceof HTMLButtonElement) {
      if (dock.firstElementChild !== warehouse) dock.insertBefore(warehouse, dock.firstElementChild);
      warehouse.style.marginLeft = "0";
      warehouse.style.height = "30px";
      warehouse.style.minWidth = "116px";
      warehouse.style.padding = "2px 8px";
      warehouse.style.borderWidth = "1px";
      warehouse.style.flex = "0 0 auto";
    }

    buttons.forEach((button) => styleButton(button, visibleNames));
    moveLanguageToDock(dock);
  }

  function warehouseChoiceName(button) {
    const blocks = Array.from(button.querySelectorAll("span.block"));
    const first = blocks[0];
    const name = (first?.textContent || "").trim();
    return name || "";
  }

  document.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest("button") : null;
    if (!(button instanceof HTMLButtonElement)) return;

    const modal = button.closest('[role="presentation"]');
    if (modal && (modal.textContent || "").includes(WAREHOUSE_LABEL)) {
      const name = warehouseChoiceName(button);
      if (name && name !== WAREHOUSE_LABEL) pendingWarehouseName = name;
      return;
    }

    if (aiButtons().includes(button)) {
      requestAnimationFrame(styleDock);
      setTimeout(styleDock, 40);
    }
  }, true);

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      styleDock();
    });
  }

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "disabled"],
  });
  window.addEventListener("resize", schedule);
  schedule();
})();
