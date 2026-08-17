(() => {
  const BUTTON_ID = "rc-copy-question-thread";
  const USER_TITLE = "클릭하면 전체 내용을 봅니다";

  function isRoomPage() {
    return /^\/rooms\//.test(window.location.pathname);
  }

  function getLatestQuestionThread() {
    const userButtons = Array.from(document.querySelectorAll(`button[title="${USER_TITLE}"]`));
    const userButton = userButtons[userButtons.length - 1];
    if (!userButton) return "";

    const question = (userButton.textContent || "").trim();
    const answers = [];
    let node = userButton.nextElementSibling;

    while (node) {
      if (node.matches?.(`button[title="${USER_TITLE}"]`)) break;
      if (node.tagName === "ARTICLE") {
        const text = (node.textContent || "").trim();
        if (text) answers.push(text);
      }
      node = node.nextElementSibling;
    }

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

  function installButton() {
    if (!isRoomPage() || document.getElementById(BUTTON_ID)) return;

    const speaker = document.querySelector('button[data-speaker-control="true"]');
    if (!speaker?.parentElement) return;

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "📋 전체 복사";
    button.title = "최근 질문과 모든 AI 답변을 한 번에 복사";
    button.setAttribute("aria-label", "최근 질문과 모든 AI 답변 전체 복사");
    button.className = "h-7 shrink-0 rounded-md border border-[#d7b64d]/60 bg-[#0b1524] px-2 text-[11px] font-semibold text-[#f4d66c]";

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

    speaker.parentElement.insertBefore(button, speaker);
  }

  const observer = new MutationObserver(installButton);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  installButton();
})();
