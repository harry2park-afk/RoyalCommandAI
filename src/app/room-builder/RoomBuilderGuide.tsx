"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type GuideMessage = { role: "guide" | "user"; text: string };
type SpeechWindow = Window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };

const SELECTED_LANGUAGE_KEY = "royalcommand:selected-language";

function normalise(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isKorean(tag: string) {
  return tag.toLowerCase().startsWith("ko");
}

function selectedGlobalLanguage() {
  try {
    return window.localStorage.getItem(SELECTED_LANGUAGE_KEY) || "en-AU";
  } catch {
    return "en-AU";
  }
}

function findRoomLanguageSelect() {
  return Array.from(document.querySelectorAll<HTMLSelectElement>("select")).find((select) => {
    const texts = Array.from(select.options).map((option) => option.text.toLowerCase());
    return texts.some((text) => text.includes("english (australia)")) && texts.some((text) => text === "korean");
  }) || null;
}

function roomLanguageValue() {
  const select = findRoomLanguageSelect();
  if (!select?.value || select.value === "CUSTOM") return "";
  return select.value;
}

function findButton(text: string) {
  const wanted = normalise(text);
  return Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((button) => normalise(button.textContent || "") === wanted);
}

function clickFirst(labels: string[]) {
  for (const label of labels) {
    const button = findButton(label);
    if (button) {
      button.click();
      button.scrollIntoView({ behavior: "smooth", block: "center" });
      return label;
    }
  }
  return "";
}

function scrollToSection(number: number) {
  const sections = Array.from(document.querySelectorAll<HTMLElement>("section"));
  const target = sections.find((section) => normalise(section.textContent || "").startsWith(`${number}.`));
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function selectAustralia() {
  const selects = Array.from(document.querySelectorAll<HTMLSelectElement>("select"));
  for (const select of selects) {
    const option = Array.from(select.options).find((item) => /australia/i.test(item.text));
    if (!option) continue;
    select.value = option.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    select.scrollIntoView({ behavior: "smooth", block: "center" });
    return true;
  }
  return false;
}

function speak(text: string, languageTag: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = languageTag || "en-AU";
  utterance.rate = isKorean(languageTag) ? 0.92 : 0.98;
  window.speechSynthesis.speak(utterance);
}

function initialMessage(languageTag: string) {
  if (isKorean(languageTag)) {
    return "안녕하세요. 선택하신 한국어로 Room 만들기를 하나씩 도와드리겠습니다. 예를 들어 ‘상업법 Room을 만들고 싶어요’라고 말씀해 주세요.";
  }
  return "Hello. I can guide you through Room setup one step at a time. For example, say: I want a Commercial Legal Room.";
}

function answerQuestion(raw: string, languageTag: string) {
  const q = normalise(raw);
  const ko = isKorean(languageTag);
  const practiceMap: Array<[RegExp, string]> = [
    [/(상업|회사법|기업법|commercial|corporate)/, "Commercial"],
    [/(가족|이혼|family|divorce)/, "Family"],
    [/(부동산|property|real estate)/, "Property"],
    [/(보상|손해|compensation|damages)/, "Compensation"],
    [/(형사|criminal)/, "Criminal"],
    [/(이민|비자|immigration|visa)/, "Immigration"],
    [/(일반|general)/, "General"],
  ];

  for (const [pattern, label] of practiceMap) {
    if (pattern.test(q)) {
      const clicked = clickFirst([label]);
      if (ko) return clicked ? `${label} 분야를 선택했습니다. 다음으로 이 Room을 주로 몇 명이 사용할지 말씀해 주세요.` : `현재 화면에서 ${label} 항목을 찾지 못했습니다.`;
      return clicked ? `${label} selected. Next, choose how many professionals will normally use this Room.` : `I could not find the ${label} option on the current screen.`;
    }
  }

  if (/\b1\b|혼자|한 명|1명|나 혼자|alone|one person/.test(q)) {
    const clicked = clickFirst(["1"]);
    return ko ? (clicked ? "사용 인원을 1명으로 선택했습니다. AI와 도구는 우선 추천값을 그대로 사용하셔도 됩니다." : "1명 항목을 찾지 못했습니다.") : (clicked ? "One professional selected. You can keep the recommended AI and tools for now." : "I could not find the 1-person option.");
  }
  if (/2\s*[-~]\s*3|두세|2명|3명|two|three/.test(q)) {
    const clicked = clickFirst(["2-3"]);
    return ko ? (clicked ? "사용 인원을 2-3명으로 선택했습니다." : "2-3명 항목을 찾지 못했습니다.") : (clicked ? "2-3 professionals selected." : "I could not find the 2-3 option.");
  }
  if (/4\s*[-~]\s*10|4명|10명/.test(q)) {
    const clicked = clickFirst(["4-10"]);
    return ko ? (clicked ? "사용 인원을 4-10명으로 선택했습니다." : "4-10명 항목을 찾지 못했습니다.") : (clicked ? "4-10 professionals selected." : "I could not find the 4-10 option.");
  }
  if (/10\+|10명 이상|열 명 이상|more than 10|over 10/.test(q)) {
    const clicked = clickFirst(["10+"]);
    return ko ? (clicked ? "사용 인원을 10명 이상으로 선택했습니다." : "10명 이상 항목을 찾지 못했습니다.") : (clicked ? "10+ professionals selected." : "I could not find the 10+ option.");
  }

  if (/승인|사람이 확인|확인 후|approval|human review|review first/.test(q)) {
    scrollToSection(3);
    const clicked = clickFirst(["Run After Approval · Recommended"]);
    return ko ? (clicked ? "중요 작업은 사람의 승인 후 실행하도록 설정했습니다." : "Approval Rules로 이동했습니다. Run After Approval · Recommended를 선택해 주세요.") : (clicked ? "Important actions are now set to run only after human approval." : "Go to Approval Rules and choose Run After Approval · Recommended.");
  }

  if (/호주|australia|aud/.test(q)) {
    scrollToSection(4);
    const selected = selectAustralia();
    return ko ? (selected ? "Australia를 선택했습니다. Room Language는 현재 선택하신 언어를 그대로 유지합니다." : "Global Settings로 이동했습니다. Country / Region에서 Australia를 선택해 주세요.") : (selected ? "Australia selected. Your current Room Language is kept unchanged." : "Go to Global Settings and choose Australia.");
  }

  if (/ai|도구|tool|memory|메모리|재료|materials/.test(q)) {
    scrollToSection(2);
    return ko ? "AI + Tool + Memory Materials로 이동했습니다. 처음에는 추천된 항목을 그대로 두는 것이 가장 쉽습니다." : "I moved to AI + Tool + Memory Materials. The recommended set is a good starting point.";
  }

  if (/웹사이트|website/.test(q)) {
    scrollToSection(5);
    return ko ? "Website Builder Kit로 이동했습니다. 이 Room에 웹사이트 지원이 필요하면 ON으로 선택하세요." : "I moved to Website Builder Kit. Turn it on if this Room needs website support.";
  }

  if (/미리보기|preview|테스트|test/.test(q)) {
    scrollToSection(6);
    const preview = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((button) => /view preview/i.test(button.textContent || ""));
    preview?.click();
    return ko ? "Preview를 열었습니다. 설정을 확인한 뒤 준비가 되면 마지막 Create 버튼을 눌러 주세요." : "I opened Preview. Review the settings, then use the final create button when ready.";
  }

  if (/어떻게|뭐부터|처음|도와|쉽게|how|where do i start|help|first/.test(q)) {
    scrollToSection(1);
    return ko ? "Room Information부터 시작하겠습니다. 이 Room이 주로 어떤 일을 할 방인지 말씀해 주세요. 예: 상업법, 부동산법, 가족법." : "Start with Room Information. Tell me the main work this Room should handle, such as Commercial, Property, or Family law.";
  }

  if (/다음|next/.test(q)) return ko ? "좋습니다. 위에서부터 한 단계씩 진행하겠습니다. 이동하고 싶은 항목 이름을 말씀해 주세요." : "Continue from the top, one section at a time. Tell me the section name if you want me to move there.";

  return ko ? "원하시는 내용을 편하게 한국어로 말씀해 주세요. 예: ‘상업법’, ‘혼자 사용’, ‘승인 후 실행’, ‘호주 설정’, ‘AI 도구 설명’, ‘미리보기’." : "Tell me what you want to set, for example: Commercial, one professional, approval first, Australia, AI tools, or Preview.";
}

export default function RoomBuilderGuide() {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [languageTag, setLanguageTag] = useState("en-AU");
  const [messages, setMessages] = useState<GuideMessage[]>([{ role: "guide", text: initialMessage("en-AU") }]);
  const recognitionRef = useRef<any>(null);
  const lastGuide = useMemo(() => [...messages].reverse().find((item) => item.role === "guide")?.text || "", [messages]);
  const ko = isKorean(languageTag);

  useEffect(() => {
    let lastGlobal = selectedGlobalLanguage();
    let lastRoom = roomLanguageValue();
    let active = lastGlobal || lastRoom || "en-AU";

    const applyLanguage = (next: string) => {
      const safe = next || "en-AU";
      if (safe === active && safe === languageTag) return;
      active = safe;
      setLanguageTag(safe);
      setInput("");
      setMessages([{ role: "guide", text: initialMessage(safe) }]);
      recognitionRef.current?.stop?.();
      window.speechSynthesis?.cancel?.();
    };

    setLanguageTag(active);
    setMessages([{ role: "guide", text: initialMessage(active) }]);

    const timer = window.setInterval(() => {
      const nextGlobal = selectedGlobalLanguage();
      const nextRoom = roomLanguageValue();
      if (nextGlobal !== lastGlobal) {
        lastGlobal = nextGlobal;
        applyLanguage(nextGlobal);
        return;
      }
      if (nextRoom && nextRoom !== lastRoom) {
        lastRoom = nextRoom;
        applyLanguage(nextRoom);
      }
    }, 120);

    const onStorage = (event: StorageEvent) => {
      if (event.key === SELECTED_LANGUAGE_KEY && event.newValue) {
        lastGlobal = event.newValue;
        applyLanguage(event.newValue);
      }
    };

    window.addEventListener("storage", onStorage);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function submitText(text: string) {
    const clean = text.trim();
    if (!clean) return;
    const reply = answerQuestion(clean, languageTag);
    setMessages((current) => [...current, { role: "user", text: clean }, { role: "guide", text: reply }]);
    setInput("");
    speak(reply, languageTag);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    submitText(input);
  }

  function toggleMic() {
    if (listening) {
      recognitionRef.current?.stop?.();
      return;
    }
    const w = window as SpeechWindow;
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) {
      setMessages((current) => [...current, { role: "guide", text: ko ? "이 브라우저에서는 음성 입력을 사용할 수 없습니다. 아래 입력창에 글로 입력해 주세요." : "Voice input is not available in this browser. Please type in the box below." }]);
      return;
    }
    const recognition = new Recognition();
    recognition.lang = languageTag || "en-AU";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event: any) => submitText(event.results?.[0]?.[0]?.transcript || "");
    recognitionRef.current = recognition;
    recognition.start();
  }

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-[250] rounded-full border-2 border-[var(--gold)] bg-[#111827] px-5 py-3 text-sm font-semibold text-[var(--gold-soft)] shadow-2xl">💬 Room Guide</button>;
  }

  return (
    <aside className="fixed bottom-4 right-4 z-[250] flex h-[440px] w-[360px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border-2 border-[var(--gold)]/70 bg-[#0a0f19]/95 shadow-[0_20px_70px_rgba(0,0,0,.55)] backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <div className="font-semibold text-[var(--gold-soft)]">Royal Command Room Guide</div>
          <div className="text-[11px] text-[var(--muted)]">{ko ? "선택한 언어로 말하거나 글로 물어보세요" : "Ask by voice or text in your selected language"}</div>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => speak(lastGuide, languageTag)} className="rounded-lg px-2 py-1 text-sm" title="Replay guide">🔊</button>
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-sm" title="Close">✕</button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-5 ${message.role === "user" ? "bg-[#173b70] text-white" : "border border-[var(--gold)]/25 bg-black/35 text-[#f3efe6]"}`}>{message.text}</div>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="border-t border-white/10 p-3">
        <div className="flex gap-2">
          <input value={input} onChange={(event) => setInput(event.target.value)} className="rc-input min-w-0 flex-1" placeholder={ko ? "예: 상업법 Room을 만들고 싶어요" : "e.g. I want a Commercial Legal Room"} />
          <button type="button" onClick={toggleMic} className={`rounded-xl border px-3 ${listening ? "border-red-400 bg-red-500/20" : "border-[var(--gold)]/40 bg-black/30"}`} title="Ask by voice">{listening ? "●" : "🎤"}</button>
          <button type="submit" className="rounded-xl bg-[var(--gold)] px-3 font-semibold text-black" title="Send">➤</button>
        </div>
        <div className="mt-2 text-[10px] text-[var(--muted)]">{ko ? "최종 Room 생성은 고객이 직접 승인 버튼을 눌러 완료합니다." : "Final Room creation always requires the customer to press the approval button."}</div>
      </form>
    </aside>
  );
}
