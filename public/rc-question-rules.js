(() => {
  const USER_TITLE = "클릭하면 전체 내용을 봅니다";
  const TITLE_INPUT_ID = "rc-question-title-input";
  const SEARCH_WRAP_ID = "rc-question-search-wrap";
  const SEARCH_INPUT_ID = "rc-question-search-input";
  const PREFIX_RE = /^\d+-Time\s+\d{2}\.\d{2}\.\d{4}\s*\/\s*\d{6}\s*\/\s*.+/;

  const PROVIDER_STYLES = {
    ChatGPT: { key: "chatgpt", background: "#071A33", border: "#2F6DB2" },
    Claude: { key: "claude", background: "#3B2418", border: "#8A5A3B" },
    Gemini: { key: "gemini", background: "#2B2F36", border: "#6B7280" },
    Grok: { key: "grok", background: "#0D3324", border: "#2F7A57" },
  };

  let resubmitting = false;
  let pendingQuestionProvider = "";

  function isRoomPage() {
    return /^\/rooms\//.test(window.location.pathname);
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function localDateParts(now = new Date()) {
    const dd = pad2(now.getDate());
    const mm = pad2(now.getMonth() + 1);
    const yyyy = now.getFullYear();
    const hh = pad2(now.getHours());
    const mi = pad2(now.getMinutes());
    const ss = pad2(now.getSeconds());
    return { date: `${dd}.${mm}.${yyyy}`, time: `${hh}${mi}${ss}` };
  }

  function nextDailyNumber(date) {
    let max = 0;
    const re = new RegExp(`^(\\d+)-Time\\s+${date.replace(/\./g, "\\.")}\\s*\\/`);
    const buttons = Array.from(document.querySelectorAll(`button[title="${USER_TITLE}"]`));
    for (const button of buttons) {
      const match = (button.textContent || "").trim().match(re);
      if (match) max = Math.max(max, Number(match[1]) || 0);
    }
    return max + 1;
  }

  function getSelectedSingleProvider() {
    const candidates = Object.keys(PROVIDER_STYLES);
    const selected = candidates.filter((name) => {
      const button = Array.from(document.querySelectorAll("button")).find((el) => {
        const title = el.getAttribute("title") || "";
        return title === name || title.startsWith(`${name} —`);
      });
      return button && String(button.className).includes("bg-[#7A0C2E]");
    });
    return selected.length === 1 ? selected[0] : "";
  }

  function setNativeTextareaValue(textarea, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    if (setter) setter.call(textarea, value);
    else textarea.value = value;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function installTitleInput() {
    if (!isRoomPage() || document.getElementById(TITLE_INPUT_ID)) return;
    const textarea = document.querySelector('textarea[placeholder^="Type or speak your order"]');
    if (!textarea?.parentElement) return;

    const input = document.createElement("input");
    input.id = TITLE_INPUT_ID;
    input.type = "text";
    input.maxLength = 120;
    input.placeholder = "질문 제목 (수정 가능)";
    input.autocomplete = "off";
    input.className = "mb-1 block h-8 w-full rounded-md border border-[#d7b64d]/30 bg-[#0b1524] px-3 text-[12px] text-[#f4f0e7] outline-none placeholder:text-[#7C8BC4]";
    textarea.parentElement.insertBefore(input, textarea);
  }

  function installSearch() {
    if (!isRoomPage() || document.getElementById(SEARCH_WRAP_ID)) return;
    const viewport = Array.from(document.querySelectorAll("div")).find((el) => {
      const cls = String(el.className || "");
      return cls.includes("overflow-y-auto") && cls.includes("overscroll-contain");
    });
    if (!viewport) return;

    const wrap = document.createElement("div");
    wrap.id = SEARCH_WRAP_ID;
    wrap.className = "sticky top-0 z-20 mb-2 flex justify-end pointer-events-none";

    const input = document.createElement("input");
    input.id = SEARCH_INPUT_ID;
    input.type = "search";
    input.placeholder = "번호·날짜·제목 검색";
    input.className = "pointer-events-auto h-8 w-[210px] rounded-md border border-[#d7b64d]/35 bg-[#07101d]/95 px-3 text-[11px] text-[#f4f0e7] outline-none placeholder:text-[#7C8BC4]";
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      const query = input.value.trim().toLowerCase();
      if (!query) return;
      const buttons = Array.from(document.querySelectorAll(`button[title="${USER_TITLE}"]`));
      const match = buttons.find((button) => (button.textContent || "").toLowerCase().includes(query));
      if (!match) {
        input.value = "";
        input.placeholder = "검색 결과 없음";
        setTimeout(() => { input.placeholder = "번호·날짜·제목 검색"; }, 1400);
        return;
      }
      match.scrollIntoView({ behavior: "smooth", block: "center" });
      const old = match.style.boxShadow;
      match.style.boxShadow = "0 0 0 3px #FFD700";
      setTimeout(() => { match.style.boxShadow = old; }, 1800);
    });

    wrap.appendChild(input);
    viewport.insertBefore(wrap, viewport.firstChild);
  }

  function decorateLatestQuestion() {
    const buttons = Array.from(document.querySelectorAll(`button[title="${USER_TITLE}"]`));
    const button = buttons[buttons.length - 1];
    if (!button || button.dataset.rcQuestionRules === "true") return;
    button.dataset.rcQuestionRules = "true";

    if (pendingQuestionProvider && PROVIDER_STYLES[pendingQuestionProvider]) {
      const style = PROVIDER_STYLES[pendingQuestionProvider];
      button.dataset.rcQuestionProvider = style.key;
      button.style.backgroundColor = style.background;
      button.style.borderColor = style.border;
    }
    pendingQuestionProvider = "";
  }

  function interceptSubmit(event) {
    if (!isRoomPage() || resubmitting) return;
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const textarea = form.querySelector('textarea[placeholder^="Type or speak your order"]');
    if (!(textarea instanceof HTMLTextAreaElement)) return;

    const raw = textarea.value.trim();
    if (!raw || PREFIX_RE.test(raw)) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const titleInput = document.getElementById(TITLE_INPUT_ID);
    const typedTitle = titleInput instanceof HTMLInputElement ? titleInput.value.trim() : "";
    const autoTitle = raw.replace(/\s+/g, " ").slice(0, 80).trim();
    const title = typedTitle || autoTitle || "질문";
    const parts = localDateParts();
    const sequence = nextDailyNumber(parts.date);
    const prefix = `${sequence}-Time ${parts.date} / ${parts.time} / ${title}`;
    const numbered = `${prefix}\n\n${raw}`;

    pendingQuestionProvider = getSelectedSingleProvider();
    setNativeTextareaValue(textarea, numbered);
    if (titleInput instanceof HTMLInputElement) titleInput.value = "";

    resubmitting = true;
    window.setTimeout(() => {
      try { form.requestSubmit(); } finally { resubmitting = false; }
    }, 0);
  }

  document.addEventListener("submit", interceptSubmit, true);

  let scheduled = false;
  function refresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      installTitleInput();
      installSearch();
      decorateLatestQuestion();
    });
  }

  const observer = new MutationObserver(refresh);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  refresh();
})();
