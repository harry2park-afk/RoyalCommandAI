(() => {
  if (!/^\/rooms\//.test(window.location.pathname)) return;

  const TEXT = new Map([
    ["중요 대화 보관함", "Important Conversation Vault"],
    ["현재 대화 저장", "Save Current Conversation"],
    ["저장 중…", "Saving…"],
    ["저장됨", "Saved"],
    ["아직 저장한 중요 대화가 없습니다.", "No important conversations saved yet."],
    ["중요 대화를 불러오는 중…", "Loading important conversations…"],
    ["채팅방", "Chat Rooms"],
    ["저장된 중요 대화", "Saved Important Conversation"],
    ["질문 제목 (수정 가능)", "Question Title (editable)"],
    ["번호·날짜·제목 검색", "Search by No. · Date · Title"],
    ["검색 결과 없음", "No search results"],
    ["복사", "Copy"],
    ["복사됨", "Copied"],
    ["전체 복사", "Copy All"],
    ["전체 복사됨", "All Copied"],
    ["복사 실패", "Copy failed"],
    ["복사할 답변 없음", "No answer to copy"],
    ["앱, 파일, AI 찾기", "Search apps, files, AI"],
    ["찾는 항목이 없습니다.", "No matching items."],
  ]);

  const PARTIAL = [
    ["화면 캡처는 Ctrl+V로 붙여넣기", "Paste screenshot with Ctrl+V"],
  ];

  function translateTextNode(node) {
    const raw = node.nodeValue;
    if (!raw) return;
    const trimmed = raw.trim();
    if (!trimmed) return;
    const exact = TEXT.get(trimmed);
    if (exact) {
      node.nodeValue = raw.replace(trimmed, exact);
      return;
    }
    let next = raw;
    for (const [from, to] of PARTIAL) next = next.replaceAll(from, to);
    if (next !== raw) node.nodeValue = next;
  }

  function translateElement(element) {
    if (!(element instanceof HTMLElement)) return;
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const placeholder = element.getAttribute("placeholder");
      if (placeholder) {
        let next = TEXT.get(placeholder) || placeholder;
        for (const [from, to] of PARTIAL) next = next.replaceAll(from, to);
        if (next !== placeholder) element.setAttribute("placeholder", next);
      }
    }
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      translateTextNode(node);
      node = walker.nextNode();
    }
  }

  function refresh(root = document.body) {
    if (!root) return;
    translateElement(root);
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
        else if (node instanceof HTMLElement) translateElement(node);
      });
      if (mutation.type === "attributes" && mutation.target instanceof HTMLElement) {
        translateElement(mutation.target);
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["placeholder"],
  });

  refresh();
})();
