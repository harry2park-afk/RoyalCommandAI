(() => {
  const BUTTON_ID = "rc-copy-question-thread";
  const WRAPPER_ID = "rc-copy-question-thread-wrap";
  const USER_TITLE = "클릭하면 전체 내용을 봅니다";
  const CARD_COPY_CLASS = "rc-ai-card-copy";

  const PROVIDER_STYLES = {
    chatgpt: { background: "#071A33", border: "#2F6DB2", label: "ChatGPT" },
    claude: { background: "#3B2418", border: "#8A5A3B", label: "Claude" },
    gemini: { background: "#2B2F36", border: "#6B7280", label: "Gemini" },
    grok: { background: "#0D3324", border: "#2F7A57", label: "Grok" },
    council: { background: "#111827", border: "#D7B64D", label: "AI Council Final Answer" },
  };

  function isRoomPage() {
    return /^\/rooms\//.test(window.location.pathname);
  }

  function getProviderKey(text) {
    const normalized = (text || "").trim();
    const firstLine = normalized.split("\n", 1)[0].replace(/^#+\s*/, "").trim().toLowerCase();
    if (firstLine.startsWith("royal command ai council final answer")) return "council";
    if (/royal command ai council final answer/i.test(normalized.slice(0, 220))) return "council";
    if (firstLine.startsWith("chatgpt")) return "chatgpt";
    if (firstLine.startsWith("claude")) return "claude";
    if (firstLine.startsWith("gemini")) return "gemini";
    if (firstLine.startsWith("grok")) return "grok";
    return "";
  }

  function cleanArticleText(article) {
    const clone = article.cloneNode(true);
    clone.querySelectorAll(`.${CARD_COPY_CLASS}`).forEach((node) => node.remove());
    return (clone.textContent || "").trim();
  }

  function getLatestQuestionThreadNodes() {
    const userButtons = Array.from(document.querySelectorAll(`button[title="${USER_TITLE}"]`));
    const userButton = userButtons[userButtons.length - 1];
    if (!userButton) return null;

    const answers = [];
    let node = userButton.nextElementSibling;

    while (node) {
      if (node.matches?.(`button[title="${USER_TITLE}"]`)) break;
      if (node.id === WRAPPER_ID) {
        node = node.nextElementSibling;
        continue;
      }
      if (node.tagName === "ARTICLE") answers.push(node);
      node = node.nextElementSibling;
    }

    return { userButton, answers };
  }

  function getLatestQuestionThread() {
    const thread = getLatestQuestionThreadNodes();
    if (!thread) return "";

    const question = (thread.userButton.textContent || "").trim();
    const answers = thread.answers.map(cleanArticleText).filter(Boolean);

    const parts = [];
    if (question) parts.push(`### 질문\n${question}`);
    if (answers.length) parts.push(answers.join("\n\n"));
    return parts.join("\n\n").trim();
  }

  async function writeClipboard(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  function makeCardCopyButton(article, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${CARD_COPY_CLASS} mt-3 ml-auto block rounded-md border border-[#d7b64d]/70 bg-black/20 px-2.5 py-1 text-[11px] font-semibold text-[#f4d66c]`;
    button.textContent = "📋 복사";
    button.title = `${label} 답변만 복사`;
    button.setAttribute("aria-label", `${label} 답변만 복사`);

    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      const text = cleanArticleText(article);
      if (!text) return;
      try {
        await writeClipboard(text);
        button.textContent = "✓ 복사됨";
      } catch {
        button.textContent = "복사 실패";
      }
      window.setTimeout(() => { button.textContent = "📋 복사"; }, 1400);
    });

    return button;
  }

  function decorateAnswerCards() {
    if (!isRoomPage()) return;
    const articles = Array.from(document.querySelectorAll("article"));

    for (const article of articles) {
      if (article.dataset.rcAiDecorated === "true") continue;
      const providerKey = getProviderKey(cleanArticleText(article));
      const provider = PROVIDER_STYLES[providerKey];
      if (!provider) continue;

      article.dataset.rcAiDecorated = "true";
      article.dataset.rcAiProvider = providerKey;
      article.style.backgroundColor = provider.background;
      article.style.borderColor = provider.border;
      article.style.position = "relative";
      article.appendChild(makeCardCopyButton(article, provider.label));
    }
  }

  function getOrCreateButton() {
    let button = document.getElementById(BUTTON_ID);
    if (button) return button;

    button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "📋 전체 복사";
    button.title = "이 질문과 모든 AI 답변을 한 번에 복사";
    button.setAttribute("aria-label", "이 질문과 모든 AI 답변 전체 복사");
    button.className = "rounded-md border border-[#d7b64d]/70 bg-[#0b1524] px-3 py-1.5 text-[11px] font-semibold text-[#f4d66c]";

    button.addEventListener("click", async () => {
      const text = getLatestQuestionThread();
      if (!text) {
        const original = button.textContent;
        button.textContent = "복사할 답변 없음";
        window.setTimeout(() => { button.textContent = original; }, 1400);
        return;
      }

      try {
        await writeClipboard(text);
        button.textContent = "✓ 전체 복사됨";
      } catch {
        button.textContent = "복사 실패";
      }
      window.setTimeout(() => { button.textContent = "📋 전체 복사"; }, 1400);
    });

    return button;
  }

  function placeButton() {
    if (!isRoomPage()) return;

    decorateAnswerCards();

    const thread = getLatestQuestionThreadNodes();
    const existingWrapper = document.getElementById(WRAPPER_ID);

    if (!thread || !thread.answers.length) {
      existingWrapper?.remove();
      return;
    }

    const lastAnswer = thread.answers[thread.answers.length - 1];
    const parent = lastAnswer.parentElement;
    if (!parent) return;

    let wrapper = existingWrapper;
    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.id = WRAPPER_ID;
      wrapper.className = "flex w-full justify-end pt-1 pb-1";
      wrapper.appendChild(getOrCreateButton());
    }

    if (lastAnswer.nextElementSibling !== wrapper) {
      parent.insertBefore(wrapper, lastAnswer.nextElementSibling);
    }
  }

  let scheduled = false;
  function schedulePlaceButton() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      placeButton();
    });
  }

  const observer = new MutationObserver(schedulePlaceButton);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  placeButton();
})();
