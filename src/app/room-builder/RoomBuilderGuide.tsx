"use client";

import { FormEvent, useMemo, useRef, useState } from "react";

type GuideMessage = { role: "guide" | "user"; text: string };

type SpeechWindow = Window & {
  SpeechRecognition?: new () => any;
  webkitSpeechRecognition?: new () => any;
};

function normalise(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
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

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ko-KR";
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

function answerQuestion(raw: string) {
  const q = normalise(raw);

  const practiceMap: Array<[RegExp, string]> = [
    [/(상업|commercial|회사법|기업법)/, "Commercial"],
    [/(가족|family|이혼)/, "Family"],
    [/(부동산|property)/, "Property"],
    [/(보상|compensation|손해)/, "Compensation"],
    [/(형사|criminal)/, "Criminal"],
    [/(이민|비자|immigration)/, "Immigration"],
    [/(일반|general)/, "General"],
  ];
  for (const [pattern, label] of practiceMap) {
    if (pattern.test(q)) {
      const clicked = clickFirst([label]);
      return clicked
        ? `${label} 분야를 선택했습니다. 다음으로 이 Room을 주로 몇 명이 사용할지 말씀해 주세요.`
        : `${label} 분야를 선택하려고 했지만 현재 화면에서 항목을 찾지 못했습니다.`;
    }
  }

  if (/(혼자|한 명|1명|나 혼자)/.test(q)) {
    const clicked = clickFirst(["1"]);
    return clicked ? "사용 인원을 1명으로 선택했습니다. 이제 AI와 도구는 추천값을 그대로 사용해도 됩니다." : "1명 항목을 찾지 못했습니다.";
  }
  if (/(2\s*[-~]\s*3|두세|2명|3명)/.test(q)) {
    const clicked = clickFirst(["2-3"]);
    return clicked ? "사용 인원을 2-3명으로 선택했습니다." : "2-3명 항목을 찾지 못했습니다.";
  }
  if (/(4\s*[-~]\s*10|4명|10명)/.test(q)) {
    const clicked = clickFirst(["4-10"]);
    return clicked ? "사용 인원을 4-10명으로 선택했습니다." : "4-10명 항목을 찾지 못했습니다.";
  }
  if (/(10\+|10명 이상|열 명 이상)/.test(q)) {
    const clicked = clickFirst(["10+"]);
    return clicked ? "사용 인원을 10명 이상으로 선택했습니다." : "10명 이상 항목을 찾지 못했습니다.";
  }

  if (/(승인|사람이 확인|확인 후)/.test(q)) {
    scrollToSection(3);
    const clicked = clickFirst(["승인 후 실행 · 권장"]);
    return clicked ? "중요 작업은 사람 승인 후 실행하도록 설정했습니다. 가장 안전한 기본값입니다." : "승인 규칙으로 이동했습니다. ‘승인 후 실행 · 권장’을 선택해 주세요.";
  }

  if (/(호주|australia|aud)/.test(q)) {
    scrollToSection(4);
    return selectAustralia()
      ? "호주 설정을 선택했습니다. 언어 en-AU, Sydney 시간대, AUD 기준으로 맞춰집니다."
      : "Global Settings로 이동했습니다. 국가에서 Australia를 선택해 주세요.";
  }

  if (/(ai|도구|tool|memory|메모리|재료)/.test(q)) {
    scrollToSection(2);
    return "AI + Tool + Memory로 이동했습니다. 처음에는 추천된 항목을 그대로 두는 것이 가장 쉽습니다. 필요 없는 선택 재료만 나중에 끄면 됩니다.";
  }

  if (/(웹사이트|website)/.test(q)) {
    scrollToSection(5);
    return "Website Builder Kit로 이동했습니다. 웹사이트와 연결할 계획이 있으면 ON, 아니면 OFF 그대로 두세요.";
  }

  if (/(미리보기|preview|테스트)/.test(q)) {
    scrollToSection(6);
    const preview = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((button) => /preview 보기/i.test(button.textContent || ""));
    preview?.click();
    return "Preview로 이동했습니다. 설정을 확인한 뒤 마지막 생성 버튼을 직접 눌러 완료하세요.";
  }

  if (/(어떻게|뭐부터|처음|도와|쉽게)/.test(q)) {
    scrollToSection(1);
    return "제가 한 단계씩 도와드릴게요. 먼저 이 법률 Room이 어떤 일을 할 방인지 말씀해 주세요. 예: ‘상업법 방이요’ 또는 ‘부동산 법률방이요’.";
  }

  if (/(다음)/.test(q)) {
    return "좋습니다. 위에서부터 하나씩 진행하면 됩니다. 현재 선택을 마쳤다면 아래의 다음 번호로 내려가세요. 궁금한 항목 이름을 말하면 제가 그곳으로 이동해 드립니다.";
  }

  return "그 내용을 기준으로 도와드릴게요. ‘상업법’, ‘혼자 사용’, ‘승인 후 실행’, ‘호주 설정’, ‘AI 도구 설명’, ‘미리보기’처럼 편하게 말씀해 주세요.";
}

export default function RoomBuilderGuide() {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState<GuideMessage[]>([
    { role: "guide", text: "안녕하세요. Room 만들기를 제가 말로 하나씩 도와드릴게요. 예를 들어 ‘상업법 방으로 만들고 싶어요’라고 말씀해 보세요." },
  ]);
  const recognitionRef = useRef<any>(null);
  const lastGuide = useMemo(() => [...messages].reverse().find((item) => item.role === "guide")?.text || "", [messages]);

  function submitText(text: string) {
    const clean = text.trim();
    if (!clean) return;
    const reply = answerQuestion(clean);
    setMessages((current) => [...current, { role: "user", text: clean }, { role: "guide", text: reply }]);
    setInput("");
    speak(reply);
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
      const reply = "이 브라우저에서는 음성 입력을 사용할 수 없습니다. 아래 글씨창에 입력해 주세요.";
      setMessages((current) => [...current, { role: "guide", text: reply }]);
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      submitText(transcript);
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-[250] rounded-full border-2 border-[var(--gold)] bg-[#111827] px-5 py-3 text-sm font-semibold text-[var(--gold-soft)] shadow-2xl">
        💬 Room Guide
      </button>
    );
  }

  return (
    <aside className="fixed bottom-4 right-4 z-[250] flex h-[440px] w-[360px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border-2 border-[var(--gold)]/70 bg-[#0a0f19]/95 shadow-[0_20px_70px_rgba(0,0,0,.55)] backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <div className="font-semibold text-[var(--gold-soft)]">Royal Command Room Guide</div>
          <div className="text-[11px] text-[var(--muted)]">말하거나 글로 물어보세요</div>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => speak(lastGuide)} className="rounded-lg px-2 py-1 text-sm" title="안내 다시 듣기">🔊</button>
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-sm" title="닫기">✕</button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-5 ${message.role === "user" ? "bg-[#173b70] text-white" : "border border-[var(--gold)]/25 bg-black/35 text-[#f3efe6]"}`}>
              {message.text}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="border-t border-white/10 p-3">
        <div className="flex gap-2">
          <input value={input} onChange={(event) => setInput(event.target.value)} className="rc-input min-w-0 flex-1" placeholder="예: 상업법 방으로 만들고 싶어요" />
          <button type="button" onClick={toggleMic} className={`rounded-xl border px-3 ${listening ? "border-red-400 bg-red-500/20" : "border-[var(--gold)]/40 bg-black/30"}`} title="말로 질문">
            {listening ? "●" : "🎤"}
          </button>
          <button type="submit" className="rounded-xl bg-[var(--gold)] px-3 font-semibold text-black" title="보내기">➤</button>
        </div>
        <div className="mt-2 text-[10px] text-[var(--muted)]">중요한 최종 생성은 고객이 직접 승인 버튼을 눌러 완료합니다.</div>
      </form>
    </aside>
  );
}
