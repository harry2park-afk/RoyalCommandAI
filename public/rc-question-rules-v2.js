(() => {
  const USER_TITLE = "클릭하면 전체 내용을 봅니다";
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

  function userButtons() {
    return Array.from(document.querySelectorAll("button")).filter((button) => {
      const title = button.getAttribute("title") || "";
      return title === USER_TITLE || title === "Click to view full content";
    });
  }

  function nextNumber(date) {
    const escaped = date.replace(/\./g, "\\.");
    const re = new RegExp(`^(\\d+)-Time\\s+${escaped}\\s*\\/`);
    let max = 0;
    userButtons().forEach((button) => {
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

  function colorLatestQuestion() {
    if (!pendingProvider) return;
    const buttons = userButtons();
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
    const auto = raw.replace(/\s+/g, " ").slice(0, 80).trim();
    const { date, time } = stamp();
    const prefix = `${nextNumber(date)}-Time ${date} / ${time} / ${auto || "Question"}`;
    pendingProvider = selectedProvider();
    nativeSet(textarea, `${prefix}\n\n${raw}`);
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
      colorLatestQuestion();
    });
  }
  new MutationObserver(refresh).observe(document.documentElement, { childList: true, subtree: true });
  refresh();
})();
