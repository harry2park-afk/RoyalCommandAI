(() => {
  const BUTTON_ID = "rc-copy-question-thread";
  const WRAPPER_ID = "rc-copy-question-thread-wrap";
  const USER_TITLE = "클릭하면 전체 내용을 봅니다";

  function isRoomPage() {
    return /^\/rooms\//.test(window.location.pathname);
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
    const answers = thread.answers
      .map((article) => (article.textContent || "").trim())
      .filter(Boolean);

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

  function getOrCreateButton() {
    let button = document.getElementById(BUTTON_ID);
    if (button) return button;

    button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "📋 전체 복사";
    button.title = "이 질문과 모든 AI 답변을 한 번에 복사";
    button.setAttribute("aria-label", "이 질문과 모든 AI 답변 전체 복사");
    button.className = "rounded-md border border-[#d7b64d]/60 bg-[#0b1524] px-3 py-1.5 text-[11px] font-semibold text-[#f4d66c]";

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
        button.textContent = "✓ 복사됨";
      } catch {
        button.textContent = "복사 실패";
      }
      window.setTimeout(() => { button.textContent = "📋 전체 복사"; }, 1400);
    });

    return button;
  }

  function placeButton() {
    if (!isRoomPage()) return;

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
