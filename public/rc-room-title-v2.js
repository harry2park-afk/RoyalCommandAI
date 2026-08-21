(() => {
  if (!/^\/rooms\//.test(window.location.pathname)) return;

  const STORAGE_KEY = `royalcommand:room:${window.location.pathname}:room-title`;
  const LABEL_ID = "rc-room-customer-title-v2";
  const INPUT_ID = "rc-room-customer-title-input-v2";
  let scheduled = false;

  function topBar() {
    return Array.from(document.querySelectorAll("div")).find((el) => {
      const cls = String(el.className || "");
      return cls.includes("fixed") && cls.includes("h-[92px]") && cls.includes("z-[170]");
    }) || null;
  }

  function headerRow() {
    const bar = topBar();
    if (!(bar instanceof HTMLElement)) return null;
    return Array.from(bar.children).find((child) => {
      const cls = String(child.className || "");
      return cls.includes("h-[42px]") && cls.includes("items-center");
    }) || null;
  }

  function dockRow() {
    const bar = topBar();
    if (!(bar instanceof HTMLElement)) return null;
    return Array.from(bar.children).find((child) => {
      const cls = String(child.className || "");
      return cls.includes("h-[50px]") && cls.includes("items-center");
    }) || null;
  }

  function savedTitle() {
    try { return (localStorage.getItem(STORAGE_KEY) || "").trim(); } catch { return ""; }
  }

  function saveTitle(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch {}
  }

  function customerName(row) {
    if (!(row instanceof HTMLElement)) return "";
    const candidate = Array.from(row.children).find((child) => {
      if (!(child instanceof HTMLElement)) return false;
      const cls = String(child.className || "");
      return cls.includes("flex-1") && cls.includes("text-center") && cls.includes("font-semibold");
    });
    return candidate instanceof HTMLElement ? (candidate.textContent || "").trim() : "";
  }

  function inferDefault(name) {
    const clean = String(name || "").replace(/\s+/g, " ").trim();
    if (!clean || clean.toLowerCase() === "user") return "My Room";
    const first = clean.split(" ")[0].replace(/[^A-Za-z0-9'’-]/g, "");
    return first ? `${first}'s Room` : "My Room";
  }

  function findGrokButton(dock) {
    if (!(dock instanceof HTMLElement)) return null;
    return Array.from(dock.querySelectorAll(":scope > button")).find((button) => {
      const text = (button.textContent || "").replace(/✓/g, "").trim();
      const title = (button.getAttribute("title") || "").trim();
      return /^Grok\b/i.test(text) || /^Grok\b/i.test(title);
    }) || null;
  }

  function beginEdit(label) {
    if (!(label instanceof HTMLButtonElement) || document.getElementById(INPUT_ID)) return;
    const input = document.createElement("input");
    input.id = INPUT_ID;
    input.type = "text";
    input.maxLength = 60;
    input.value = label.textContent || "";
    input.setAttribute("aria-label", "Room name");
    input.style.cssText = "width:130px;max-width:20vw;height:26px;padding:0 5px;border:1px solid rgba(212,175,55,.65);border-radius:4px;background:#07101d;color:#f4f0e7;font:600 11px/26px 'Times New Roman',serif;outline:none;text-align:center;";

    function finish(cancel = false) {
      const next = cancel ? (label.textContent || "") : input.value.trim();
      const finalValue = next || "My Room";
      if (!cancel) saveTitle(finalValue);
      label.textContent = finalValue;
      input.replaceWith(label);
    }

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") { event.preventDefault(); finish(false); }
      if (event.key === "Escape") { event.preventDefault(); finish(true); }
    });
    input.addEventListener("blur", () => finish(false), { once: true });
    label.replaceWith(input);
    requestAnimationFrame(() => { input.focus(); input.select(); });
  }

  function install() {
    const header = headerRow();
    const dock = dockRow();
    if (!(header instanceof HTMLElement) || !(dock instanceof HTMLElement)) return;

    const h1 = header.querySelector("h1");
    if (h1 instanceof HTMLElement) {
      h1.textContent = "Royal Command AI";
      h1.className = "ml-8 shrink-0 text-[22px] font-semibold leading-none";
      h1.style.marginTop = "0";
    }

    // Remove legacy title wrapper / duplicate My Room from v1.
    const legacyWrap = document.getElementById("rc-room-title-wrap");
    if (legacyWrap instanceof HTMLElement) {
      if (h1 && legacyWrap.contains(h1)) header.insertBefore(h1, legacyWrap);
      legacyWrap.remove();
    }
    document.getElementById("rc-room-customer-title")?.remove();
    document.getElementById("rc-room-customer-title-input")?.remove();

    const name = customerName(header);
    const display = Array.from(header.children).find((child) => {
      if (!(child instanceof HTMLElement)) return false;
      const cls = String(child.className || "");
      return cls.includes("flex-1") && cls.includes("text-center") && cls.includes("font-semibold");
    });
    if (display instanceof HTMLElement) display.style.display = "none";

    let label = document.getElementById(LABEL_ID);
    if (!(label instanceof HTMLButtonElement)) {
      label = document.createElement("button");
      label.id = LABEL_ID;
      label.type = "button";
      label.title = "Click to rename this Room";
      label.setAttribute("aria-label", "Rename Room");
      label.style.cssText = "flex:0 0 auto;height:28px;padding:0 7px;border:0;background:transparent;color:#d7b64d;font:600 11px/28px 'Times New Roman',serif;cursor:text;white-space:nowrap;text-align:center;";
      label.addEventListener("click", () => beginEdit(label));
      label.textContent = savedTitle() || inferDefault(name);
    }

    // Keep it immediately before Grok in the AI dock.
    const grok = findGrokButton(dock);
    if (grok) {
      if (label.parentElement !== dock || label.nextElementSibling !== grok) dock.insertBefore(label, grok);
    } else if (label.parentElement !== dock) {
      dock.appendChild(label);
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      install();
    });
  }

  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("resize", schedule);
  schedule();
})();
