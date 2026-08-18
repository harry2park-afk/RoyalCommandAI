(() => {
  if (!/^\/rooms\//.test(window.location.pathname)) return;

  const STORAGE_KEY = `royalcommand:room:${window.location.pathname}:room-title`;
  const WRAP_ID = "rc-room-title-wrap";
  const LABEL_ID = "rc-room-customer-title";
  const INPUT_ID = "rc-room-customer-title-input";
  let scheduled = false;

  function topHeaderRow() {
    const bar = Array.from(document.querySelectorAll("div")).find((el) => {
      const cls = String(el.className || "");
      return cls.includes("fixed") && cls.includes("h-[92px]") && cls.includes("z-[170]");
    });
    if (!bar) return null;
    return Array.from(bar.children).find((child) => {
      const cls = String(child.className || "");
      return cls.includes("h-[42px]") && cls.includes("items-center");
    }) || null;
  }

  function savedTitle() {
    try { return (localStorage.getItem(STORAGE_KEY) || "").trim(); } catch { return ""; }
  }

  function saveTitle(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch {}
  }

  function inferDefault(displayText) {
    const clean = String(displayText || "").replace(/\s+/g, " ").trim();
    if (!clean || clean.toLowerCase() === "user") return "My Room";
    const first = clean.split(" ")[0].replace(/[^A-Za-z0-9'’-]/g, "");
    return first ? `${first}'s Room` : "My Room";
  }

  function beginEdit(label) {
    if (!(label instanceof HTMLButtonElement)) return;
    const wrap = label.parentElement;
    if (!(wrap instanceof HTMLElement) || document.getElementById(INPUT_ID)) return;

    const input = document.createElement("input");
    input.id = INPUT_ID;
    input.type = "text";
    input.maxLength = 60;
    input.value = label.textContent || "";
    input.setAttribute("aria-label", "Room name");
    input.style.cssText = "width:180px;max-width:36vw;height:18px;padding:0 5px;border:1px solid rgba(212,175,55,.65);border-radius:4px;background:#07101d;color:#f4f0e7;font:600 11px/18px 'Times New Roman',serif;outline:none;text-align:left;";

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
    const row = topHeaderRow();
    if (!(row instanceof HTMLElement)) return;

    const h1 = row.querySelector("h1");
    if (!(h1 instanceof HTMLElement)) return;

    const titleText = (h1.textContent || "").trim();
    if (titleText === "Command Room" || titleText === "Royal Command AI" || !titleText) {
      h1.textContent = "Royal Command AI";
    }

    let wrap = document.getElementById(WRAP_ID);
    if (!(wrap instanceof HTMLElement)) {
      wrap = document.createElement("div");
      wrap.id = WRAP_ID;
      wrap.style.cssText = "display:flex;flex:0 0 auto;min-width:210px;flex-direction:column;align-items:flex-start;justify-content:center;margin-left:32px;line-height:1;";
      row.insertBefore(wrap, h1);
      wrap.appendChild(h1);
    }

    h1.className = "shrink-0 text-[18px] font-semibold leading-none";
    h1.style.marginLeft = "0";

    let display = Array.from(row.children).find((child) => {
      if (!(child instanceof HTMLElement) || child === wrap) return false;
      const cls = String(child.className || "");
      return cls.includes("flex-1") && cls.includes("text-center") && cls.includes("font-semibold");
    });

    const displayText = display instanceof HTMLElement ? (display.textContent || "").trim() : "";
    if (display instanceof HTMLElement) display.style.display = "none";

    let label = document.getElementById(LABEL_ID);
    if (!(label instanceof HTMLButtonElement)) {
      label = document.createElement("button");
      label.id = LABEL_ID;
      label.type = "button";
      label.title = "Click to rename this Room";
      label.setAttribute("aria-label", "Rename Room");
      label.style.cssText = "margin-top:3px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:0;background:transparent;padding:0;color:#d7b64d;font:600 11px/14px 'Times New Roman',serif;cursor:text;text-align:left;";
      label.addEventListener("click", () => beginEdit(label));
      wrap.appendChild(label);
    }

    if (!label.textContent) {
      label.textContent = savedTitle() || inferDefault(displayText);
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
