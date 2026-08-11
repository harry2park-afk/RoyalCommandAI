(() => {
  const MAX_SLOTS = 10;
  const DEFAULT_AI = [
    { id: "perplexity", name: "Perplexity", logo: "https://cdn.simpleicons.org/perplexity/ffffff", fallback: "P" },
    { id: "mistral", name: "Mistral", logo: "https://cdn.simpleicons.org/mistralai/FF7000", fallback: "M" },
    { id: "deepseek", name: "DeepSeek", logo: "https://cdn.simpleicons.org/deepseek/4D6BFE", fallback: "D" },
    { id: "meta", name: "Meta Llama", logo: "https://cdn.simpleicons.org/meta/0467DF", fallback: "∞" },
    { id: "openai", name: "ChatGPT", logo: "https://cdn.simpleicons.org/openai/74AA9C", fallback: "C" },
    { id: "anthropic", name: "Claude", logo: "https://cdn.simpleicons.org/anthropic/D97757", fallback: "C" },
    { id: "google", name: "Gemini", logo: "https://cdn.simpleicons.org/googlegemini/8E75B2", fallback: "G" },
    { id: "xai", name: "Grok", logo: "https://cdn.simpleicons.org/x/ffffff", fallback: "G" },
    { id: "qwen", name: "Qwen", logo: "https://cdn.simpleicons.org/alibabacloud/FF6A00", fallback: "Q" },
    { id: "cohere", name: "Cohere", logo: "https://cdn.simpleicons.org/cohere/39594D", fallback: "C" },
  ];

  const providerAliases = {
    openai: "ChatGPT",
    anthropic: "Claude",
    google: "Gemini",
    xai: "Grok",
    perplexity: "Perplexity",
    mistral: "Mistral",
    deepseek: "DeepSeek",
    meta: "Meta Llama",
    qwen: "Qwen",
    cohere: "Cohere",
  };

  function roomStorageKey(suffix) {
    const roomId = location.pathname.split("/").filter(Boolean).pop() || "room";
    return `royalcommand:room:${roomId}:${suffix}`;
  }

  function readStoredIds() {
    try {
      const raw = localStorage.getItem(roomStorageKey("ai-dock-order"));
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.length) return parsed.filter((x) => typeof x === "string").slice(0, MAX_SLOTS);
    } catch {}
    return DEFAULT_AI.map((x) => x.id);
  }

  function writeStoredIds(ids) {
    localStorage.setItem(roomStorageKey("ai-dock-order"), JSON.stringify(ids.slice(0, MAX_SLOTS)));
  }

  function readHiddenIds() {
    try {
      const raw = localStorage.getItem(roomStorageKey("ai-dock-hidden"));
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  }

  function writeHiddenIds(ids) {
    localStorage.setItem(roomStorageKey("ai-dock-hidden"), JSON.stringify(ids));
  }

  function findComposerBar() {
    const textarea = document.querySelector('textarea[placeholder*="Royal Command"]');
    if (!textarea) return null;
    const form = textarea.closest("form");
    if (!form) return null;
    return [...form.children].find((el) =>
      el instanceof HTMLElement &&
      el !== textarea &&
      el.querySelector("button") &&
      el.textContent?.includes("AI (")
    );
  }

  function findWarehouseButton(bar) {
    return [...bar.querySelectorAll("button")].find((b) => b.textContent?.includes("AI ("));
  }

  function nativeButtonFor(bar, name) {
    return [...bar.querySelectorAll("button")].find(
      (b) => !b.dataset.rcAiSlot && !b.dataset.rcWarehouseExtra && b.textContent?.trim().includes(name),
    );
  }

  function currentProviderCatalog() {
    const bar = findComposerBar();
    const result = [...DEFAULT_AI];
    if (!bar) return result;
    [...bar.querySelectorAll("button")].forEach((b) => {
      if (b.dataset.rcAiSlot || b.dataset.rcWarehouseExtra || b.textContent?.includes("AI (")) return;
      const text = b.textContent?.trim();
      if (!text) return;
      const known = Object.entries(providerAliases).find(([, name]) => text.includes(name));
      if (known && !result.some((x) => x.id === known[0])) {
        result.push({ id: known[0], name: known[1], logo: "", fallback: known[1].slice(0, 1) });
      }
    });
    return result;
  }

  function getAi(id) {
    return currentProviderCatalog().find((x) => x.id === id) || {
      id,
      name: providerAliases[id] || id,
      logo: "",
      fallback: (providerAliases[id] || id).slice(0, 1).toUpperCase(),
    };
  }

  function setSlotSelected(btn, selected) {
    btn.dataset.selected = selected ? "1" : "0";
    btn.style.background = selected ? "rgba(212,175,55,.10)" : "rgba(255,255,255,.025)";
    btn.style.borderColor = selected ? "rgba(212,175,55,.60)" : "rgba(255,255,255,.16)";
    btn.style.color = selected ? "#f0d78c" : "#e6e9ef";
  }

  function clickProviderThroughWarehouse(bar, ai) {
    const warehouse = findWarehouseButton(bar);
    if (!warehouse) return;
    warehouse.click();
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      const target = [...document.querySelectorAll("button")].find(
        (b) => !bar.contains(b) && b instanceof HTMLButtonElement && !b.disabled && b.textContent?.trim().includes(ai.name),
      );
      if (target) {
        clearInterval(timer);
        target.click();
      } else if (tries > 15) {
        clearInterval(timer);
      }
    }, 80);
  }

  function hideSlot(id) {
    const order = readStoredIds().filter((x) => x !== id);
    const hidden = [...new Set([...readHiddenIds(), id])];
    writeStoredIds(order);
    writeHiddenIds(hidden);
    styleAiBar();
  }

  function moveSlot(dragId, dropId) {
    if (!dragId || !dropId || dragId === dropId) return;
    const order = readStoredIds();
    const from = order.indexOf(dragId);
    const to = order.indexOf(dropId);
    if (from < 0 || to < 0) return;
    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    writeStoredIds(next);
    styleAiBar();
  }

  function createSlotButton(bar, ai, warehouse) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.draggable = true;
    btn.dataset.rcAiSlot = ai.id;
    btn.title = `${ai.name} — drag to move, × to hide`;
    btn.style.cssText = "display:flex;height:24px;min-height:24px;flex:0 0 auto;align-items:center;gap:4px;border-radius:6px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.025);padding:0 5px 0 6px;color:#e6e9ef;font-size:10px;font-weight:400;line-height:1;cursor:grab;white-space:nowrap";

    const logoWrap = document.createElement("span");
    logoWrap.style.cssText = "display:grid;width:14px;height:14px;min-width:14px;place-items:center;border-radius:4px;background:rgba(255,255,255,.06);overflow:hidden;font-size:9px;font-weight:600";
    if (ai.logo) {
      const img = document.createElement("img");
      img.src = ai.logo;
      img.alt = "";
      img.width = 12;
      img.height = 12;
      img.style.cssText = "display:block;width:12px;height:12px;object-fit:contain";
      img.onerror = () => { logoWrap.textContent = ai.fallback; };
      logoWrap.appendChild(img);
    } else {
      logoWrap.textContent = ai.fallback;
    }

    const label = document.createElement("span");
    label.textContent = ai.name;
    label.style.fontWeight = "400";

    const hide = document.createElement("span");
    hide.textContent = "×";
    hide.title = `Hide ${ai.name}`;
    hide.style.cssText = "display:grid;width:13px;height:13px;place-items:center;margin-left:1px;border-radius:4px;color:#8893a3;font-size:11px;cursor:pointer";
    hide.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      hideSlot(ai.id);
    });

    btn.append(logoWrap, label, hide);

    btn.addEventListener("click", (e) => {
      if (e.target === hide) return;
      const currentBar = findComposerBar();
      if (!(currentBar instanceof HTMLElement)) return;
      const nativeNow = nativeButtonFor(currentBar, ai.name);
      if (nativeNow instanceof HTMLButtonElement) nativeNow.click();
      else clickProviderThroughWarehouse(currentBar, ai);
    });

    btn.addEventListener("dragstart", (e) => {
      btn.style.opacity = ".45";
      e.dataTransfer?.setData("text/plain", ai.id);
      if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    });
    btn.addEventListener("dragend", () => { btn.style.opacity = "1"; });
    btn.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      btn.style.borderColor = "#f0d78c";
    });
    btn.addEventListener("dragleave", () => {
      const selected = nativeButtonFor(bar, ai.name) instanceof HTMLButtonElement;
      setSlotSelected(btn, selected);
    });
    btn.addEventListener("drop", (e) => {
      e.preventDefault();
      const dragId = e.dataTransfer?.getData("text/plain") || "";
      moveSlot(dragId, ai.id);
    });

    warehouse.insertAdjacentElement("beforebegin", btn);
    return btn;
  }

  function ensureWarehouseExtra(bar, warehouse) {
    let btn = bar.querySelector("[data-rc-warehouse-extra='1']");
    if (!(btn instanceof HTMLButtonElement)) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.rcWarehouseExtra = "1";
      btn.textContent = "AI Warehouse";
      btn.title = "Open AI Warehouse to add or replace AI boxes";
      btn.style.cssText = "height:24px;min-height:24px;flex:0 0 auto;border-radius:6px;border:1px solid rgba(212,175,55,.45);background:rgba(212,175,55,.07);padding:0 8px;color:#f0d78c;font-size:10px;font-weight:400;cursor:pointer;white-space:nowrap";
      btn.addEventListener("click", () => warehouse.click());
      warehouse.insertAdjacentElement("afterend", btn);
    }
  }

  function syncNewlySelectedProviders(bar) {
    const hidden = readHiddenIds();
    const order = readStoredIds();
    if (order.length >= MAX_SLOTS) return;

    const nativeNames = [...bar.querySelectorAll("button")]
      .filter((b) => !b.dataset.rcAiSlot && !b.dataset.rcWarehouseExtra && !b.textContent?.includes("AI ("))
      .map((b) => b.textContent?.trim() || "");

    const candidates = currentProviderCatalog().filter((ai) =>
      !order.includes(ai.id) && !hidden.includes(ai.id) && nativeNames.some((text) => text.includes(ai.name)),
    );

    if (!candidates.length) return;
    const next = [...order, ...candidates.map((x) => x.id)].slice(0, MAX_SLOTS);
    writeStoredIds(next);
  }

  function styleAiBar() {
    const bar = findComposerBar();
    if (!(bar instanceof HTMLElement)) return;
    const warehouse = findWarehouseButton(bar);
    if (!warehouse) return;

    syncNewlySelectedProviders(bar);

    currentProviderCatalog().forEach((ai) => {
      const native = nativeButtonFor(bar, ai.name);
      if (native instanceof HTMLElement) native.style.display = "none";
    });

    bar.querySelectorAll("[data-rc-ai-slot]").forEach((el) => el.remove());

    const order = readStoredIds().filter((id) => !readHiddenIds().includes(id)).slice(0, MAX_SLOTS);
    order.forEach((id) => {
      const ai = getAi(id);
      const btn = createSlotButton(bar, ai, warehouse);
      const selected = nativeButtonFor(bar, ai.name) instanceof HTMLButtonElement;
      setSlotSelected(btn, selected);
    });

    ensureWarehouseExtra(bar, warehouse);

    bar.querySelectorAll("button").forEach((button) => {
      button.style.fontWeight = "400";
      if (!button.dataset.rcAiSlot && !button.dataset.rcWarehouseExtra && !button.textContent?.includes("AI (")) {
        button.querySelectorAll("svg").forEach((svg) => {
          if (svg.parentElement === button) svg.style.display = "none";
        });
      }
    });
  }

  function styleLanguagePicker() {
    document.querySelectorAll(".rc-lang-picker").forEach((picker) => {
      if (picker instanceof HTMLElement) {
        picker.style.fontFamily = 'Georgia, "Noto Serif", "Times New Roman", serif';
        picker.style.fontWeight = "400";
      }
    });
    document.querySelectorAll('body > div[style*="z-index: 2147483647"], body > div[style*="z-index:2147483647"]').forEach((menu) => {
      if (menu instanceof HTMLElement) {
        menu.style.fontFamily = 'Georgia, "Noto Serif", "Times New Roman", serif';
        menu.style.fontWeight = "400";
        menu.querySelectorAll("button, input, span, strong").forEach((el) => {
          if (el instanceof HTMLElement) el.style.fontWeight = el.tagName === "STRONG" ? "500" : "400";
        });
      }
    });
  }

  function setupGrowingComposer() {
    const textarea = document.querySelector('textarea[placeholder*="Royal Command"]');
    if (!(textarea instanceof HTMLTextAreaElement)) return;
    const section = textarea.closest("section");
    if (section instanceof HTMLElement && window.innerWidth >= 900) {
      section.style.height = "calc(100vh - 112px)";
      section.style.maxHeight = "calc(100vh - 112px)";
    }
    if (textarea.dataset.rcAutoGrow !== "1") {
      textarea.dataset.rcAutoGrow = "1";
      textarea.style.resize = "none";
      textarea.style.overflowY = "hidden";
      textarea.style.maxHeight = "48vh";
      const resize = () => {
        const minimum = 176;
        const maximum = Math.max(minimum, Math.floor(window.innerHeight * 0.48));
        textarea.style.height = "auto";
        const next = Math.min(Math.max(textarea.scrollHeight, minimum), maximum);
        textarea.style.height = `${next}px`;
        textarea.style.overflowY = textarea.scrollHeight > maximum ? "auto" : "hidden";
      };
      textarea.addEventListener("input", resize);
      textarea.addEventListener("change", resize);
      window.addEventListener("resize", resize);
      resize();
    } else if (!textarea.value) {
      textarea.style.height = "176px";
      textarea.style.overflowY = "hidden";
    }
  }

  function setupCollapsibleUserMessages() {
    const textarea = document.querySelector('textarea[placeholder*="Royal Command"]');
    const section = textarea?.closest("section");
    if (!(section instanceof HTMLElement)) return;
    const messagePane = [...section.children].find(
      (el) => el instanceof HTMLElement && el.classList.contains("flex-1") && el.classList.contains("overflow-y-auto"),
    );
    if (!(messagePane instanceof HTMLElement)) return;

    [...messagePane.children].forEach((bubble) => {
      if (!(bubble instanceof HTMLElement)) return;
      const label = bubble.firstElementChild;
      if (!(label instanceof HTMLElement) || label.textContent?.trim().toLowerCase() !== "user") return;
      if (bubble.dataset.rcCollapsible === "1") return;
      bubble.dataset.rcCollapsible = "1";
      bubble.dataset.rcExpanded = "0";
      bubble.title = "Click to expand or collapse";
      bubble.style.cursor = "pointer";
      bubble.style.transition = "max-height .18s ease, padding .18s ease";
      const applyState = () => {
        const expanded = bubble.dataset.rcExpanded === "1";
        label.style.display = expanded ? "block" : "none";
        bubble.style.maxHeight = expanded ? "60vh" : "34px";
        bubble.style.overflow = expanded ? "auto" : "hidden";
        bubble.style.whiteSpace = expanded ? "pre-wrap" : "nowrap";
        bubble.style.textOverflow = expanded ? "clip" : "ellipsis";
        bubble.style.paddingTop = expanded ? "12px" : "7px";
        bubble.style.paddingBottom = expanded ? "12px" : "7px";
      };
      bubble.addEventListener("click", () => {
        bubble.dataset.rcExpanded = bubble.dataset.rcExpanded === "1" ? "0" : "1";
        applyState();
      });
      applyState();
    });
  }

  function apply() {
    styleAiBar();
    styleLanguagePicker();
    setupGrowingComposer();
    setupCollapsibleUserMessages();
  }

  apply();
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