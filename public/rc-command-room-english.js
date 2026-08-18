(() => {
  if (!/^\/rooms\//.test(window.location.pathname)) return;

  const TEXT = new Map([
    ["중요 대화 보관함", "Important Conversation Vault"],
    ["현재 대화 저장", "Save Current Conversation"],
    ["저장 중…", "Saving…"],
    ["저장됨", "Saved"],
    ["저장 실패", "Save failed"],
    ["삭제됨", "Deleted"],
    ["삭제 실패", "Delete failed"],
    ["전체 선택", "Select All"],
    ["아직 저장한 중요 대화가 없습니다.", "No important conversations saved yet."],
    ["중요 대화를 불러오는 중…", "Loading important conversations…"],
    ["아직 저장된 대화가 없습니다.", "No conversations yet."],
    ["대화를 불러오는 중…", "Loading conversations…"],
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
    ["제목 저장", "Save title"],
    ["제목 수정", "Edit title"],
    ["취소", "Cancel"],
    ["닫기", "Close"],
    ["채팅방 이름 저장", "Save room name"],
    ["채팅방 이름 수정", "Edit room name"],
    ["메뉴에서 빼기", "Remove from menu"],
    ["한국어", "Korean"],
    ["음성 읽기 끄기", "Turn voice reading off"],
    ["음성 읽기 켜기", "Turn voice reading on"],
    ["파일 첨부", "Attach file"],
    ["마이크", "Microphone"],
    ["AI 검색...", "Search AI..."],
    ["교체할 상단 슬롯을 고른 뒤 AI를 선택하세요.", "Choose a top slot, then select an AI to replace it."],
  ]);

  const PARTIAL = [
    ["화면 캡처는 Ctrl+V로 붙여넣기", "Paste screenshot with Ctrl+V"],
    ["현재 질문과 AI 답변을 중요 대화로 저장", "Save the current question and AI answers as an important conversation"],
    ["클릭하면 저장한 중요 대화 내용을 봅니다", "Click to view the saved important conversation"],
    ["저장한 중요 대화 삭제", "Delete saved important conversation"],
    ["왼쪽 중요 대화 보관함 열기", "Open Important Conversation Vault"],
    ["왼쪽 중요 대화 보관함 닫기", "Close Important Conversation Vault"],
    ["왼쪽 대화 목록 열기", "Open conversation list"],
    ["왼쪽 대화 목록 닫기", "Close conversation list"],
    ["선택한 대화 저장", "Save selected conversations"],
    ["선택한 대화 삭제", "Delete selected conversations"],
    ["전체 대화 선택", "Select all conversations"],
    ["한 번 클릭: 내용 보기 · 더블클릭: 제목 수정", "Click: view conversation · Double-click: edit title"],
    ["이 대화 삭제", "Delete this conversation"],
    ["클릭하면 전체 내용을 봅니다", "Click to view full content"],
    ["상단 사용중", "In top slots"],
    ["업로드 중…", "Uploading…"],
    ["업로드 완료", "Upload complete"],
    ["업로드 실패", "Upload failed"],
    ["답변만 복사", "answer only"],
    ["이 질문과 모든 AI 답변을 한 번에 복사", "Copy this question and all AI answers"],
  ];

  function translateString(raw) {
    if (!raw) return raw;
    const trimmed = raw.trim();
    const exact = TEXT.get(trimmed);
    if (exact && raw === trimmed) return exact;
    let next = exact ? raw.replace(trimmed, exact) : raw;
    for (const [from, to] of PARTIAL) next = next.replaceAll(from, to);
    return next;
  }

  function translateTextNode(node) {
    const raw = node.nodeValue;
    if (!raw) return;
    const next = translateString(raw);
    if (next !== raw) node.nodeValue = next;
  }

  function translateElement(element) {
    if (!(element instanceof HTMLElement)) return;

    for (const attr of ["placeholder", "title", "aria-label"]) {
      const raw = element.getAttribute(attr);
      if (!raw) continue;
      const next = translateString(raw);
      if (next !== raw) element.setAttribute(attr, next);
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
    attributeFilter: ["placeholder", "title", "aria-label"],
  });

  // The language selector controls chat/voice language only; Command Room chrome remains English.
  refresh();
})();
