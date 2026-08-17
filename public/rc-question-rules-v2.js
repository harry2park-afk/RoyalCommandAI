(() => {
  const USER_TITLE = "클릭하면 전체 내용을 봅니다";
  const TITLE_INPUT_ID = "rc-question-title-input";
  const SEARCH_WRAP_ID = "rc-question-search-wrap";
  const PREFIX_RE = /^\d+-Time\s+\d{2}\.\d{2}\.\d{4}\s*\/\s*\d{6}\s*\/\s*.+/;
  const STYLES = {
    ChatGPT: { background: "#071A33", border: "#2F6DB2" },
    Claude: { background: "#3B2418", border: "#8A5A3B" },
    Gemini: { background: "#2B2F36", border: "#6B7280" },
    Grok: { background: "#0D3324", border: "#2F7A57" },
  };
  let resubmitting = false;
  let pendingProvider = "";

  const roomPage = () => /^\/rooms\//.test(location.pathname);
  const pad = (n) => String(n).padStart(2, "0");

  function stamp() {
    const d = new Date();
    return {
      date: `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`,
      time: `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`,
    };
  }

  function nextNumber(date) {
    const escaped = date.replace(/\./g, "\\.");
    const re = new RegExp(`^(\\d+)-Time\\s+${escaped}\\s*\\/`);
    let max = 0;
    document.querySelectorAll(`button[title="${USER_TITLE}"]`).forEach((button) => {
      const match = (button.textContent || "").trim().match(re);
      if (match) max = Math.max(max, Number(match[1]) || 0);
    });
    return max + 1;
  }

  function selectedProvider() {
    const selected = Object.keys(STYLES).filter((name) => {
      const button = Array.from(document.querySelectorAll("button")).find((b) => {
        const title = b.getAttribute("title") || "";
        return title === name || title.startsWith(`${name} —`);
      });
      return button && String(button.className).includes("bg-[#7A0C2E]");
    });
    return selected.length === 1 ? selected[0] : "";
  }

  function nativeSet(textarea, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    if (setter) setter.call(textarea, value); else textarea.value = value;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function installTitleInput() {
    if (!roomPage() || document.getElementById(TITLE_INPUT_ID)) return;
    const textarea = document.querySelector('textarea[placeholder^="Type or speak your order"]');
    if (!textarea?.parentElement) return;
    const input = document.createElement("input");
    input.id = TITLE_INPUT_ID;
    input.type = "text";
    input.maxLength = 120;
    input.placeholder = "질문 제목 (수정 가능)";
    input.className = "mb-1 block h-8 w-full rounded-md border border-[#d7b64d]/30 bg-[#0b1524] px-3 text-[12px] text-[#f4f0e7] outline-none placeholder:text-[#7C8BC4]";
    textarea.parentElement.insertBefore(input, textarea);
  }

  function installSearch() {
    if (!roomPage() || document.getElementById(SEARCH_WRAP_ID)) return;
    const viewport = Array.from(document.querySelectorAll("div")).find((el) => {
      const c = String(el.className || "");
      return c.includes("overflow-y-auto") && c.includes("overscroll-contain");
    });
    if (!viewport) return;
    const wrap = document.createElement("div");
    wrap.id = SEARCH_WRAP_ID;
    wrap.className = "sticky top-0 z-20 mb-2 flex justify-end pointer-events-none";
    const input = document.createElement("input");
    input.type = "search";
    input.placeholder = "번호·날짜·제목 검색";
    input.className = "pointer-events-auto h-8 w-[210px] rounded-md border border-[#d7b64d]/35 bg-[#07101d]/95 px-3 text-[11px] text-[#f4f0e7] outline-none placeholder:text-[#7C8BC4]";
    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const q = input.value.trim().toLowerCase();
      if (!q) return;
      const match = Array.from(document.querySelectorAll(`button[title="${USER_TITLE}"]`))
        .find((b) => (b.textContent || "").toLowerCase().includes(q));
      if (!match) {
        input.value = "";
        input.placeholder = "검색 결과 없음";
        setTimeout(() => input.placeholder = "번호·날짜·제목 검색", 1400);
        return;
      }
      match.scrollIntoView({ behavior: "smooth", block: "center" });
      const old = match.style.boxShadow;
      match.style.boxShadow = "0 0 0 3px #FFD700";
      setTimeout(() => match.style.boxShadow = old, 1800);
    });
    wrap.appendChild(input);
    viewport.insertBefore(wrap, viewport.firstChild);
  }

  function colorLatestQuestion() {
    if (!pendingProvider) return;
    const buttons = Array.from(document.querySelectorAll(`button[title="${USER_TITLE}"]`));
    const button = buttons[buttons.length - 1];
    const style = STYLES[pendingProvider];
    if (!button || !style || button.dataset.rcQuestionProvider) return;
    button.dataset.rcQuestionProvider = pendingProvider.toLowerCase();
    button.style.backgroundColor = style.background;
    button.style.borderColor = style.border;
    pendingProvider = "";
  }

  function onSubmit(event) {
    if (!roomPage() || resubmitting) return;
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const textarea = form.querySelector('textarea[placeholder^="Type or speak your order"]');
    if (!(textarea instanceof HTMLTextAreaElement)) return;
    const raw = textarea.value.trim();
    if (!raw || PREFIX_RE.test(raw)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    const titleInput = document.getElementById(TITLE_INPUT_ID);
    const typed = titleInput instanceof HTMLInputElement ? titleInput.value.trim() : "";
    const auto = raw.replace(/\s+/g, " ").slice(0, 80).trim();
    const { date, time } = stamp();
    const prefix = `${nextNumber(date)}-Time ${date} / ${time} / ${typed || auto || "질문"}`;
    pendingProvider = selectedProvider();
    nativeSet(textarea, `${prefix}\n\n${raw}`);
    if (titleInput instanceof HTMLInputElement) titleInput.value = "";
    resubmitting = true;
    setTimeout(() => {
      try { form.requestSubmit(); } finally { resubmitting = false; }
    }, 0);
  }

  document.addEventListener("submit", onSubmit, true);
  let scheduled = false;
  function refresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      installTitleInput();
      installSearch();
      colorLatestQuestion();
    });
  }
  new MutationObserver(refresh).observe(document.documentElement, { childList: true, subtree: true });
  refresh();
})();
