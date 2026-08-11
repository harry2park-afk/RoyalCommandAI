(() => {
  const FEATURED_AI = [
    { id: "perplexity", name: "Perplexity", icon: "P", color: "#b06cff" },
    { id: "mistral", name: "Mistral", icon: "M", color: "#ff9a3d" },
    { id: "deepseek", name: "DeepSeek", icon: "◌", color: "#6ea8ff" },
    { id: "meta", name: "Meta Llama", icon: "∞", color: "#4aa3ff" },
    { id: "openai", name: "ChatGPT", icon: "◉", color: "#55c997" },
    { id: "anthropic", name: "Claude", icon: "✦", color: "#e68b57" },
    { id: "google", name: "Gemini", icon: "✦", color: "#65a8ff" },
    { id: "xai", name: "Grok", icon: "◎", color: "#e7e7e7" },
  ];

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
      (b) => !b.dataset.rcFeaturedAi && b.textContent?.trim().includes(name),
    );
  }

  function setFeaturedSelected(btn, selected) {
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
      const candidates = [...document.querySelectorAll("button")].filter(
        (b) => !bar.contains(b) && b.textContent?.trim().includes(ai.name),
      );
      const target = candidates.find((b) => b instanceof HTMLButtonElement && !b.disabled);
      if (target) {
        clearInterval(timer);
        target.click();
      } else if (tries > 12) {
        clearInterval(timer);
      }
    }, 80);
  }

  function styleAiBar() {
    const bar = findComposerBar();
    if (!(bar instanceof HTMLElement)) return;

    const warehouse = findWarehouseButton(bar);
    if (!warehouse) return;

    FEATURED_AI.forEach((ai) => {
      const native = nativeButtonFor(bar, ai.name);
      if (native instanceof HTMLElement) native.style.display = "none";
    });

    FEATURED_AI.forEach((ai) => {
      let btn = bar.querySelector(`[data-rc-featured-ai="${ai.id}"]`);
      if (!(btn instanceof HTMLButtonElement)) {
        btn = document.createElement("button");
        btn.type = "button";
        btn.dataset.rcFeaturedAi = ai.id;
        btn.title = ai.name;
        btn.style.cssText = "display:flex;height:24px;min-height:24px;flex:0 0 auto;align-items:center;gap:4px;border-radius:6px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.025);padding:0 7px;color:#e6e9ef;font-size:10px;font-weight:400;line-height:1;cursor:pointer;white-space:nowrap";
        btn.innerHTML = `<span data-rc-ai-logo style="display:grid;width:14px;height:14px;min-width:14px;place-items:center;border-radius:4px;background:rgba(255,255,255,.06);font-size:10px;font-weight:600;color:${ai.color}">${ai.icon}</span><span style="font-weight:400">${ai.name}</span>`;
        btn.addEventListener("click", () => {
          const currentBar = findComposerBar();
          if (!(currentBar instanceof HTMLElement)) return;
          const nativeNow = nativeButtonFor(currentBar, ai.name);
          if (nativeNow instanceof HTMLButtonElement) nativeNow.click();
          else clickProviderThroughWarehouse(currentBar, ai);
        });
        warehouse.insertAdjacentElement("beforebegin", btn);
      }

      const selected = nativeButtonFor(bar, ai.name) instanceof HTMLButtonElement;
      setFeaturedSelected(btn, selected);
    });

    bar.querySelectorAll("button").forEach((button) => {
      button.style.fontWeight = "400";
      button.querySelectorAll("span").forEach((span) => {
        span.style.fontWeight = span.hasAttribute("data-rc-ai-logo") ? "600" : "400";
      });
      if (!button.dataset.rcFeaturedAi && !button.textContent?.includes("AI (")) {
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