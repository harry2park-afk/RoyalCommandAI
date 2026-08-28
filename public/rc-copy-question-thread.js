(() => {
  const BUTTON_ID = "rc-copy-question-thread";
  const WRAPPER_ID = "rc-copy-question-thread-wrap";
  const USER_TITLE = "클릭하면 전체 내용을 봅니다";
  const CARD_COPY_CLASS = "rc-ai-card-copy";
  const STATUS_STYLE_ID = "rc-integrated-answer-status-style";

  const PROVIDER_STYLES = {
    chatgpt: { background: "#071A33", border: "#2F6DB2", label: "ChatGPT" },
    claude: { background: "#3B2418", border: "#8A5A3B", label: "Claude" },
    gemini: { background: "#2B2F36", border: "#6B7280", label: "Gemini" },
    grok: { background: "#0D3324", border: "#2F7A57", label: "Grok" },
    integrated: { background: "#161B29", border: "#D7B64D", label: "Integrated Answer" },
  };

  const INTEGRATOR_NAMES = {
    "openai:gpt-5.6-sol": "GPT-5.6 Sol",
    "google:gemini-3.7-flash": "Gemini 3.7 Flash",
    "xai:grok-4.5": "Grok 4.5",
  };

  function isRoomPage() {
    return /^\/rooms\//.test(window.location.pathname);
  }

  function getProviderKey(text) {
    const lines = (text || "")
      .split("\n")
      .map((line) => line.replace(/^#+\s*/, "").trim().toLowerCase())
      .filter(Boolean);
    if (lines.some((line) => line.startsWith("integrated answer"))) return "integrated";
    if (lines.some((line) => line === "chatgpt")) return "chatgpt";
    if (lines.some((line) => line === "claude")) return "claude";
    if (lines.some((line) => line === "gemini")) return "gemini";
    if (lines.some((line) => line === "grok")) return "grok";
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

  function ensureStatusStyle() {
    if (document.getElementById(STATUS_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STATUS_STYLE_ID;
    style.textContent = `
      @keyframes rcThinkingSweep {
        0% { background-position: 180% 50%; }
        100% { background-position: -80% 50%; }
      }
      .rc-integrator-thinking {
        background-image: linear-gradient(90deg, #f4d66c 0%, #ffffff 42%, #f4d66c 58%, #f4d66c 100%);
        background-size: 220% 100%;
        background-clip: text;
        -webkit-background-clip: text;
        color: transparent !important;
        -webkit-text-fill-color: transparent;
        animation: rcThinkingSweep 1.15s linear infinite;
      }
    `;
    document.head.appendChild(style);
  }

  function findIntegratorRow(modelName) {
    return Array.from(document.querySelectorAll("button")).find((button) => {
      const text = (button.textContent || "").replace(/\s+/g, " ").trim();
      return text.includes(modelName) && (text.includes("Connected") || text.includes("Working") || text.includes("Completed") || text.includes("Failed"));
    });
  }

  function setIntegratorVisual(modelId, state) {
    const modelName = INTEGRATOR_NAMES[modelId];
    if (!modelName) return;
    ensureStatusStyle();
    window.requestAnimationFrame(() => {
      const row = findIntegratorRow(modelName);
      if (!(row instanceof HTMLButtonElement)) return;
      const spans = Array.from(row.querySelectorAll("span"));
      const nameSpan = spans.find((span) => (span.textContent || "").trim() === modelName);
      const statusSpan = spans[spans.length - 1];
      if (nameSpan instanceof HTMLElement) {
        nameSpan.classList.toggle("rc-integrator-thinking", state === "running");
      }
      if (statusSpan instanceof HTMLElement) {
        if (state === "running") statusSpan.textContent = "Working…";
        if (state === "success") statusSpan.textContent = "✓ Completed";
        if (state === "error") statusSpan.textContent = "Failed";
      }
    });
  }

  function installIntegratedAnswerFetchStatus() {
    if (window.__rcIntegratedAnswerFetchWrapped) return;
    window.__rcIntegratedAnswerFetchWrapped = true;
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : "";
      const method = (init?.method || (input instanceof Request ? input.method : "GET") || "GET").toUpperCase();
      let modelId = "";
      const integratedRequest = method === "POST" && url.includes("/api/ai/integrated-answer");

      if (integratedRequest && typeof init?.body === "string") {
        try {
          const body = JSON.parse(init.body);
          if (typeof body?.modelId === "string") modelId = body.modelId;
        } catch {}
      }

      if (modelId) setIntegratorVisual(modelId, "running");

      try {
        const response = await originalFetch(input, init);
        if (modelId) setIntegratorVisual(modelId, response.ok ? "success" : "error");
        return response;
      } catch (error) {
        if (modelId) setIntegratorVisual(modelId, "error");
        throw error;
      }
    };
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

  installIntegratedAnswerFetchStatus();
  const observer = new MutationObserver(schedulePlaceButton);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  placeButton();
})();
