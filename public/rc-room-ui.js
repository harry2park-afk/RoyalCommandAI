(() => {
  const EXTRA_AI = [
    ["P", "Perplexity"],
    ["M", "Mistral"],
    ["D", "DeepSeek"],
    ["L", "Meta Llama"],
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

  function styleAiBar() {
    const bar = findComposerBar();
    if (!(bar instanceof HTMLElement)) return;

    bar.querySelectorAll("button").forEach((button) => {
      button.style.fontWeight = "400";
      button.querySelectorAll("span").forEach((span) => {
        span.style.fontWeight = "400";
      });
    });

    const warehouse = [...bar.querySelectorAll("button")].find((b) => b.textContent?.includes("AI ("));
    if (!warehouse) return;

    EXTRA_AI.forEach(([letter, name]) => {
      if (bar.querySelector(`[data-rc-featured-ai="${name}"]`)) return;
      if ([...bar.querySelectorAll("button")].some((b) => b.textContent?.trim().includes(name))) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.rcFeaturedAi = name;
      btn.title = `${name} — open AI Warehouse to connect or select`;
      btn.style.cssText = "display:flex;height:24px;flex:0 0 auto;align-items:center;gap:4px;border-radius:6px;border:1px solid rgba(212,175,55,.55);background:rgba(212,175,55,.06);padding:0 7px;color:#f0d78c;font-size:10px;font-weight:400;line-height:1;cursor:pointer";
      btn.innerHTML = `<span style="display:grid;width:14px;height:14px;place-items:center;border-radius:999px;background:rgba(255,255,255,.08);font-size:7px;font-weight:500">${letter}</span><span style="font-weight:400">${name}</span>`;
      btn.addEventListener("click", () => warehouse.click());
      warehouse.insertAdjacentElement("beforebegin", btn);
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

  function apply() {
    styleAiBar();
    styleLanguagePicker();
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