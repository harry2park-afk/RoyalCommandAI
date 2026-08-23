"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Message = { role: "assistant" | "user"; text: string };
type SpeechWindow = Window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };

const SELECTED_LANGUAGE_KEY = "royalcommand:selected-language";

function normalise(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function currentLanguageTag() {
  try {
    return window.localStorage.getItem(SELECTED_LANGUAGE_KEY) || "en-AU";
  } catch {
    return "en-AU";
  }
}

function isKorean(tag: string) {
  return tag.toLowerCase().startsWith("ko");
}

function setReactInput(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function setReactSelect(select: HTMLSelectElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  descriptor?.set?.call(select, value);
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function findControlByLabel(labelText: string) {
  const wanted = normalise(labelText);
  for (const label of Array.from(document.querySelectorAll<HTMLLabelElement>("label"))) {
    if (!normalise(label.textContent || "").includes(wanted)) continue;
    if (label.htmlFor) {
      const target = document.getElementById(label.htmlFor);
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return target;
    }
    const parent = label.parentElement;
    const target = parent?.querySelector("input, textarea, select");
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return target;
  }
  return null;
}

function fillRoomName(name: string) {
  const control = findControlByLabel("Room Name");
  if (!(control instanceof HTMLInputElement)) return false;
  setReactInput(control, name.slice(0, 120));
  control.scrollIntoView({ behavior: "smooth", block: "center" });
  return true;
}

function clickExact(text: string) {
  const wanted = normalise(text);
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((item) => normalise(item.textContent || "") === wanted);
  if (!button) return false;
  button.click();
  button.scrollIntoView({ behavior: "smooth", block: "center" });
  return true;
}

function selectOptionByText(labelText: string, optionPatterns: RegExp[]) {
  const control = findControlByLabel(labelText);
  if (!(control instanceof HTMLSelectElement)) return false;
  const option = Array.from(control.options).find((item) => optionPatterns.some((pattern) => pattern.test(item.text)));
  if (!option) return false;
  setReactSelect(control, option.value);
  control.scrollIntoView({ behavior: "smooth", block: "center" });
  return true;
}

function scrollToSection(number: number) {
  const section = Array.from(document.querySelectorAll<HTMLElement>("section")).find((item) => normalise(item.textContent || "").startsWith(`${number}.`));
  section?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openPreview() {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((item) => /view preview|preview/i.test(item.textContent || ""));
  if (!button) return false;
  button.click();
  return true;
}

function speak(text: string, languageTag: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = languageTag || "en-AU";
  utterance.rate = isKorean(languageTag) ? 0.94 : 1;
  window.speechSynthesis.speak(utterance);
}

function initialText(ko: boolean) {
  return ko
    ? "안녕하세요. Room 작성 도우미입니다. 말이나 글로 원하는 내용을 알려주시면 해당 폼을 직접 선택하거나 입력해 드립니다. 예: ‘이름은 Family Legal, 가족법, 2-3명, 호주, 한국어, 승인 후 실행’."
    : "Hello. I am your Room form assistant. Tell me what you want by voice or text and I will fill or select the matching form fields for you.";
}

function applyRequest(raw: string, ko: boolean) {
  const q = normalise(raw);
  const actions: string[] = [];

  const roomNameMatch = raw.match(/(?:room\s*name|룸\s*이름|방\s*이름|이름)\s*(?:은|는|:|=)?\s*["“']?([^,.;\n"”']{2,80})/i);
  if (roomNameMatch?.[1]) {
    const cleaned = roomNameMatch[1].trim().replace(/\s+(가족법|상업법|부동산|형사|이민|보상|commercial|family|property|criminal|immigration|compensation).*$/i, "").trim();
    if (cleaned && fillRoomName(cleaned)) actions.push(ko ? `Room 이름: ${cleaned}` : `Room name: ${cleaned}`);
  }

  const practiceMap: Array<[RegExp, string]> = [
    [/(상업|회사법|기업법|commercial|corporate)/i, "Commercial"],
    [/(가족|이혼|family|divorce)/i, "Family"],
    [/(부동산|property|real estate)/i, "Property"],
    [/(보상|손해|compensation|damages)/i, "Compensation"],
    [/(형사|criminal)/i, "Criminal"],
    [/(이민|비자|immigration|visa)/i, "Immigration"],
    [/(일반|general)/i, "General"],
  ];
  for (const [pattern, label] of practiceMap) {
    if (pattern.test(q) && clickExact(label)) {
      actions.push(ko ? `분야: ${label}` : `Practice area: ${label}`);
      break;
    }
  }

  const professionalMap: Array<[RegExp, string]> = [
    [/(10\+|10명\s*이상|열\s*명\s*이상|over\s*10|more\s*than\s*10)/i, "10+"],
    [/(4\s*[-~]\s*10|4명|5명|6명|7명|8명|9명|10명)/i, "4-10"],
    [/(2\s*[-~]\s*3|2명|3명|두\s*명|세\s*명|two|three)/i, "2-3"],
    [/(혼자|1명|한\s*명|alone|one\s*person|\b1\b)/i, "1"],
  ];
  for (const [pattern, label] of professionalMap) {
    if (pattern.test(q) && clickExact(label)) {
      actions.push(ko ? `사용 인원: ${label}` : `Professionals: ${label}`);
      break;
    }
  }

  if (/승인\s*후|사람.*승인|human\s*approval|review\s*first|run\s*after\s*approval/i.test(q) && clickExact("Run After Approval · Recommended")) {
    actions.push(ko ? "승인 방식: 승인 후 실행" : "Approval: Run After Approval");
  } else if (/safe\s*mode|안전\s*모드/i.test(q) && clickExact("Safe Mode")) {
    actions.push(ko ? "승인 방식: Safe Mode" : "Approval: Safe Mode");
  } else if (/autonomous|자동\s*실행/i.test(q) && clickExact("Autonomous Mode")) {
    actions.push(ko ? "승인 방식: Autonomous Mode" : "Approval: Autonomous Mode");
  }

  const countries: Array<[RegExp, RegExp[]]> = [
    [/(호주|australia)/i, [/australia/i]],
    [/(한국|south korea|korea)/i, [/south korea|korea/i]],
    [/(미국|united states|usa|u\.s\.)/i, [/united states/i]],
    [/(영국|united kingdom|uk)/i, [/united kingdom/i]],
    [/(일본|japan)/i, [/japan/i]],
    [/(싱가포르|singapore)/i, [/singapore/i]],
  ];
  for (const [pattern, optionPatterns] of countries) {
    if (pattern.test(q) && selectOptionByText("Country / Region", optionPatterns)) {
      actions.push(ko ? "국가 설정 완료" : "Country selected");
      break;
    }
  }

  const languages: Array<[RegExp, RegExp[]]> = [
    [/(한국어|korean)/i, [/^korean$/i]],
    [/(영어\s*호주|english\s*australia)/i, [/english \(australia\)/i]],
    [/(영어\s*미국|english\s*us|english\s*united states)/i, [/english \(united states\)/i]],
    [/(영어\s*영국|english\s*uk|english\s*united kingdom)/i, [/english \(united kingdom\)/i]],
    [/(일본어|japanese)/i, [/^japanese$/i]],
    [/(중국어|chinese)/i, [/chinese/i]],
  ];
  for (const [pattern, optionPatterns] of languages) {
    if (pattern.test(q) && selectOptionByText("Room Language", optionPatterns)) {
      actions.push(ko ? "Room 언어 설정 완료" : "Room language selected");
      break;
    }
  }

  if (/ai|도구|tool|memory|메모리|materials|재료/i.test(q)) {
    scrollToSection(2);
    if (!actions.length) return ko ? "AI + Tool + Memory Materials로 이동했습니다. 기본 추천값은 그대로 두고 필요한 항목만 바꾸시면 됩니다." : "I moved to AI + Tool + Memory Materials. Keeping the recommended defaults is the safest starting point.";
  }

  if (/미리보기|preview|검토/i.test(q) && openPreview()) actions.push(ko ? "Preview 열기" : "Preview opened");

  if (/어떻게|뭐부터|처음|도와|help|where do i start|first/i.test(q) && !actions.length) {
    scrollToSection(1);
    return ko
      ? "Room Information부터 시작합니다. 한 문장으로 ‘Room 이름, 업무 분야, 사용 인원, 국가, 언어, 승인 방식’을 말씀해 주세요. 제가 해당 항목을 직접 채우겠습니다."
      : "Start with Room Information. Tell me the Room name, practice area, number of professionals, country, language and approval mode in one sentence.";
  }

  if (/다음|next/i.test(q) && !actions.length) {
    scrollToSection(2);
    return ko ? "다음 단계인 AI + Tool + Memory Materials로 이동했습니다." : "I moved to the next section, AI + Tool + Memory Materials.";
  }

  if (actions.length) {
    return ko ? `입력했습니다: ${actions.join(" · ")}. 나머지도 말씀해 주세요.` : `Updated: ${actions.join(" · ")}. Tell me the remaining choices.`;
  }

  return ko
    ? "이 폼에서 직접 도와드릴 수 있습니다. 예: ‘Room 이름은 Property Legal, 부동산, 1명, 호주, 한국어, 승인 후 실행’처럼 말씀해 주세요."
    : "I can fill this form directly. For example: ‘Room name Property Legal, Property, one professional, Australia, Korean, run after approval.’";
}

export default function RoomBuilderAIFormAssistant() {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [languageTag, setLanguageTag] = useState("en-AU");
  const [messages, setMessages] = useState<Message[]>([]);
  const recognitionRef = useRef<any>(null);
  const ko = isKorean(languageTag);
  const lastAssistant = useMemo(() => [...messages].reverse().find((message) => message.role === "assistant")?.text || initialText(ko), [messages, ko]);

  useEffect(() => {
    const sync = () => {
      const next = currentLanguageTag();
      setLanguageTag(next);
      setMessages((current) => current.length ? current : [{ role: "assistant", text: initialText(isKorean(next)) }]);
    };
    sync();
    const timer = window.setInterval(sync, 600);
    return () => window.clearInterval(timer);
  }, []);

  function reply(text: string) {
    const answer = applyRequest(text, ko);
    setMessages((current) => [...current, { role: "user", text }, { role: "assistant", text: answer }]);
    setInput("");
    if (speakerEnabled) speak(answer, languageTag);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const clean = input.trim();
    if (clean) reply(clean);
  }

  function toggleMic() {
    if (listening) {
      recognitionRef.current?.stop?.();
      return;
    }
    const w = window as SpeechWindow;
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) {
      const text = ko ? "이 브라우저에서는 음성 입력을 사용할 수 없습니다. 아래 입력창에 글로 입력해 주세요." : "Voice input is unavailable in this browser. Please type below.";
      setMessages((current) => [...current, { role: "assistant", text }]);
      return;
    }
    const recognition = new Recognition();
    recognition.lang = languageTag || "en-AU";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event: any) => {
      const text = String(event.results?.[0]?.[0]?.transcript || "").trim();
      if (text) reply(text);
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-[260] rounded-full border-2 border-[var(--gold)] bg-[#7A0C2E] px-5 py-3 text-sm font-semibold text-[var(--gold-soft)] shadow-2xl">
        🤖 Room Help
      </button>
    );
  }

  return (
    <aside className="fixed bottom-4 right-4 top-4 z-[260] flex w-[465px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border-2 border-[var(--gold)]/70 bg-[#07111f]/97 shadow-[0_20px_70px_rgba(0,0,0,.6)] backdrop-blur-md">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--gold)]/60 bg-[#7A0C2E]">🤖</div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[var(--gold-soft)]">Royal Command Room Guide</div>
          <div className="text-[11px] text-[var(--muted)]">{ko ? "말하거나 입력하면 폼을 직접 작성합니다" : "Speak or type and I will fill the form"}</div>
        </div>
        <button type="button" onClick={() => setSpeakerEnabled((value) => !value)} className={`grid h-8 w-8 place-items-center rounded-full border ${speakerEnabled ? "border-emerald-400/60 text-emerald-300" : "border-white/15 text-white/45"}`} title="Speaker">🔊</button>
        <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-white/60 hover:bg-white/10" title="Close">×</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="rounded-xl border border-[var(--gold)]/35 bg-black/20 px-3 py-3 text-[13px] leading-5 text-white/90">{lastAssistant}</div>
        {messages.slice(-8).map((message, index) => message.role === "user" ? (
          <div key={`${message.role}-${index}`} className="mt-2 ml-8 rounded-xl bg-[#1d3b67]/65 px-3 py-2 text-[12px] text-white/85">{message.text}</div>
        ) : null)}
      </div>

      <form onSubmit={submit} className="border-t border-white/10 p-3">
        <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-black/25 p-2">
          <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={2} placeholder={ko ? "예: 이름은 Family Legal, 가족법, 2-3명, 호주, 한국어" : "e.g. Family Legal, Family, 2-3, Australia, Korean"} className="min-h-[46px] flex-1 resize-none bg-transparent px-1 py-1 text-[13px] text-white outline-none placeholder:text-white/35" />
          <button type="button" onClick={toggleMic} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${listening ? "border-emerald-400 bg-emerald-500/20 text-emerald-300" : "border-[var(--gold)]/50 text-[var(--gold-soft)]"}`} title="Microphone">🎤</button>
          <button type="submit" disabled={!input.trim()} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--gold)] bg-[#7A0C2E] text-[var(--gold-soft)] disabled:opacity-30" title="Send">➤</button>
        </div>
        <div className="mt-2 text-[10px] text-[var(--muted)]">{ko ? "최종 Room 생성 버튼은 고객이 직접 눌러 완료합니다." : "The customer presses the final Create Room button."}</div>
      </form>
    </aside>
  );
}
