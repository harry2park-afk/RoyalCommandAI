"use client";

import { useEffect } from "react";

const KO_TO_EN: Array<[string, string]> = [
  ["법률룸 Royal Command Legal 만들기", "Build Royal Command Legal Room"],
  ["법률룸 만들기", "Build Legal Room"],
  ["세계 공통 Core와 추천 재료를 자동으로 준비했습니다. 고객은 필요한 재료만 남기고 국가/언어를 선택한 뒤 Preview 후 Room을 만듭니다.", "The Global Core and recommended components are ready. Keep only what you need, confirm Australia and English (Australia), preview, then create the Room."],
  ["1. Room 기본정보", "1. Room Details"],
  ["Room 이름", "Room Name"],
  ["2. AI + Tool + Memory 재료", "2. AI + Tools + Memory"],
  ["목적에 맞는 재료가 자동 선택되어 있습니다. 필수 Core는 끌 수 없습니다.", "Recommended components are preselected for this Room. Required Core components cannot be disabled."],
  ["선택 ", "Selected "],
  ["3. 승인 규칙", "3. Approval Rules"],
  ["안전 모드", "Safe Mode"],
  ["조회와 초안 중심. 외부 실행은 잠금.", "Research and drafting only. External actions are locked."],
  ["승인 후 실행 · 권장", "Approval Before Action · Recommended"],
  ["중요 작업은 사람 승인 후 실행.", "Important actions run only after human approval."],
  ["자율 실행", "Autonomous Actions"],
  ["허용된 범위 안에서 자동 실행.", "Runs automatically only within the permissions granted."],
  ["하나의 Global Core를 세계 어느 나라에서도 사용합니다. 복사할 때는 구조만 복사하고 고객 데이터, Memory, API Key와 비밀정보는 복사하지 않습니다.", "Use one Global Core worldwide. Cloning copies structure only; customer data, Memory, API keys and secrets are never copied."],
  ["국가 / 지역", "Country / Region"],
  ["예: en-AU, ko-KR, ar-AE", "e.g. en-AU, ko-KR, ar-AE"],
  ["예: Australia/Sydney", "e.g. Australia/Sydney"],
  ["5. Website Builder Kit", "5. Website Builder Kit"],
  ["필요하면 AI가 웹 구조, 페이지, 폼, Room 연결, 모바일 대응과 배포 준비까지 돕습니다.", "When enabled, AI can assist with website structure, pages, forms, Room connections, mobile responsiveness and deployment preparation."],
  ["사용 안 함", "Disabled"],
  ["사용", "Enabled"],
  ["6. Preview & Test", "6. Preview & Test"],
  ["실제 생성 전에 구성과 세계화/복사 안전 설정을 확인합니다.", "Review the configuration, localisation and safe-copy settings before creating the Room."],
  ["Preview 닫기", "Close Preview"],
  ["Preview 보기", "Preview"],
  ["만드는 중…", "Creating…"],
  ["취소", "Cancel"],
  ["Room을 만들지 못했습니다.", "The Room could not be created."],
  ["말하거나 글로 물어보세요", "Ask by voice or text"],
  ["안녕하세요. Room 만들기를 제가 말로 하나씩 도와드릴게요. 예를 들어 ‘상업법 방으로 만들고 싶어요’라고 말씀해 보세요.", "Hello. I can guide you through building this Room one step at a time. Try saying, ‘I want a commercial law Room.’"],
  ["예: 상업법 방으로 만들고 싶어요", "e.g. I want a commercial law Room"],
  ["중요한 최종 생성은 고객이 직접 승인 버튼을 눌러 완료합니다.", "Final Room creation always requires the customer to press the approval button."],
  ["상업법", "Commercial law"],
  ["부동산", "Property law"],
  ["가족", "Family law"],
  ["형사", "Criminal law"],
  ["이민", "Immigration law"],
  ["일반", "General law"],
];

function translateText(value: string) {
  let next = value;
  for (const [ko, en] of KO_TO_EN) next = next.replaceAll(ko, en);
  return next;
}

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

export default function AustraliaLegalLocale() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("template") !== "legal") return;

    document.documentElement.lang = "en-AU";

    const roomNameInput = document.querySelector<HTMLInputElement>('input.rc-input');
    if (roomNameInput && /법률룸|legal/i.test(roomNameInput.value)) {
      setNativeInputValue(roomNameInput, "Royal Command Legal - Australia");
    }

    function applyEnglish(root: Node = document.body) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode() as Text | null;
      while (node) {
        const current = node.nodeValue || "";
        const translated = translateText(current);
        if (translated !== current) node.nodeValue = translated;
        node = walker.nextNode() as Text | null;
      }

      document.querySelectorAll<HTMLInputElement>("input[placeholder]").forEach((input) => {
        const translated = translateText(input.placeholder);
        if (translated !== input.placeholder) input.placeholder = translated;
      });
    }

    applyEnglish();
    const observer = new MutationObserver(() => applyEnglish());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
