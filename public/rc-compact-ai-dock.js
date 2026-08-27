(() => {
  if (!/^\/rooms\//.test(window.location.pathname)) return;

  const STORAGE_KEY = `royalcommand:room:${window.location.pathname}:compact-ai-dock`;
  const WAREHOUSE_LABEL = "AI Warehouse";
  const COUNCIL_ID = "rc-council-mode-toggle";
  let seeded = false;
  let scheduled = false;
  let pendingWarehouseName = "";
  let preferencesReady = false;

  function cleanNames(value) {
    return Array.isArray(value)
      ? Array.from(new Set(value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim())))
      : [];
  }

  function readVisible() {
    try {
      return cleanNames(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
    } catch {
      return [];
    }
  }

  function saveToAccount(names) {
    const clean = cleanNames(names);
    if (!clean.length) return;
    void fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ compactAiDock: clean }),
      keepalive: true,
    }).catch(() => undefined);
  }

  function writeVisible(names, syncAccount = true) {
    const clean = cleanNames(names);
    if (!clean.length) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(clean)); } catch {}
    if (syncAccount) saveToAccount(clean);
  }

  async function restorePreference() {
    const local = readVisible();
    try {
      const res = await fetch("/api/user/preferences", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const account = cleanNames(data?.preferences?.compactAiDock);
        if (local.length) {
          if (JSON.stringify(local) !== JSON.stringify(account)) saveToAccount(local);
        } else if (account.length) {
          writeVisible(account, false);
        }
      }
    } catch {}
    preferencesReady = true;
    schedule();
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
    return Array.from(dock.querySelectorAll(":scope > button")).filter((button) => button !== warehouse && button.id !== COUNCIL_ID);
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
    if (seeded || !preferencesReady) return;
    let visible = readVisible();
    if (!visible.length) {
      visible = buttons.filter(isActive).map(shortName).filter(Boolean);
      if (!visible.length) return;
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

  function styleDock() {
    const dock = topDock();
    if (!(dock instanceof HTMLElement)) return;
    const buttons = aiButtons();
    if (!buttons.length) return;

    const bar = dock.parentElement;
    if (bar instanceof HTMLElement) {
      bar.style.height = "92px";
      const topRow = bar.firstElementChild;
      if (topRow instanceof HTMLElement && topRow !== dock) {
        topRow.style.height = "57px";
        topRow.style.minHeight = "57px";
        topRow.style.maxHeight = "57px";
      }
    }

    dock.style.height = "35px";
    dock.style.minHeight = "35px";
    dock.style.maxHeight = "35px";
    dock.style.paddingTop = "2px";
    dock.style.paddingBottom = "2px";

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
    if (window.location.pathname === "/rooms/rca") {
      dock.style.setProperty("overflow", "visible", "important");
    } else {
      dock.style.overflowX = "auto";
      dock.style.overflowY = "hidden";
    }
    dock.style.whiteSpace = "nowrap";
    dock.style.justifyContent = "flex-start";
    dock.style.paddingLeft = "10px";
    dock.style.paddingRight = "10px";

    const warehouse = warehouseButton(dock);
    if (warehouse instanceof HTMLButtonElement) {
      warehouse.style.order = "-1";
      warehouse.style.marginLeft = "0";
      warehouse.style.marginRight = "0";
      warehouse.style.height = "30px";
      warehouse.style.minWidth = "116px";
      warehouse.style.padding = "2px 8px";
      warehouse.style.borderWidth = "1px";
      warehouse.style.flex = "0 0 auto";

      const council = document.getElementById(COUNCIL_ID);
      if (council instanceof HTMLButtonElement) council.style.order = "0";
    }

    buttons.forEach((button) => styleButton(button, visibleNames));
  }

  function warehouseChoiceName(button) {
    const blocks = Array.from(button.querySelectorAll("span.block"));
    const first = blocks[0];
    const name = (first?.textContent || "").trim();
    return name || "";
  }

  document.addEventListener("click", (event) => {
    if (window.location.pathname === "/rooms/rca" && event.isTrusted) {
      const host = document.getElementById("rc-synthesis-host");
      const synthesisButton = host?.querySelector("button");
      if (host instanceof HTMLElement && synthesisButton instanceof HTMLButtonElement) {
        const rect = host.getBoundingClientRect();
        const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
        if (inside) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          synthesisButton.click();
          return;
        }
      }
    }

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
  void restorePreference();
  schedule();
})();