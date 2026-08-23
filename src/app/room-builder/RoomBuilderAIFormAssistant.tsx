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
  const lastUser = useMemo(() => [...messages].reverse().find((message) => message.role === "user")?.text || "", [messages]);

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
      <button type="button" onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-[260] flex h-12 items-center gap-2 rounded-xl border border-[#d7b64d] bg-[#7A0C2E] px-4 text-[13px] font-semibold text-[#ffe18a] shadow-[0_6px_22px_rgba(0,0,0,.45)] hover:bg-[#94113a]">
        <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full border border-[#d7b64d]/65 bg-[#07111f]">
          <img src="/ai-helper-woman.svg" alt="Room Guide" className="h-10 w-10 object-contain object-bottom" />
        </span>
        Room Guide
      </button>
    );
  }

  return (
    <aside className="fixed bottom-[10px] right-[10px] top-[10px] z-[260] flex w-[520px] max-w-[calc(100vw-20px)] flex-col overflow-hidden bg-[#07111f]/97 shadow-[0_22px_75px_rgba(0,0,0,.62)] backdrop-blur-md">
      <div className="relative shrink-0 border-b border-white/10 px-5 pt-3">
        <div className="absolute right-3 top-3 z-10 flex items-center gap-3">
          <span className="flex items-center gap-1 text-[10px] font-semibold tracking-[0.18em] text-[#f3d36a]"><span className={`h-2 w-2 rounded-full ${listening ? "animate-pulse bg-emerald-400" : "bg-[#d7b64d]"}`} />LIVE</span>
          <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-xl leading-none text-white/70 hover:bg-white/10 hover:text-white" title="Close">×</button>
        </div>
        <div className="text-center font-[Times_New_Roman] text-xl font-semibold text-[#f3d36a]">Royal Command Room Guide</div>
        <div className="mt-1 text-center text-[11px] text-white/45">{ko ? "AI Help 방식으로 대화하며 Room 폼을 직접 작성합니다" : "AI Help style assistant that fills the Room form with you"}</div>

        <div className="relative mx-auto mt-1 h-[265px] w-[330px] max-w-[70%]">
          <div className="absolute inset-x-10 bottom-2 h-20 rounded-full bg-[#d7b64d]/10 blur-2xl" />
          <img src="/ai-helper-woman.svg" alt="Royal Command Room Guide" className="relative h-full w-full object-contain object-bottom" />
        </div>

        <div className="flex items-center gap-2 pb-2 text-[#d7b64d]">
          <button type="button" onClick={() => setSpeakerEnabled((value) => !value)} className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border ${speakerEnabled ? "border-emerald-400/70 bg-emerald-500/15 text-emerald-300" : "border-[#d7b64d]/70 text-[#d7b64d]"}`} title="Speaker">🔊</button>
          <div className="flex h-8 flex-1 items-center gap-[3px] overflow-hidden">
            {Array.from({ length: 30 }).map((_, index) => (
              <span key={index} className={`w-[2px] rounded-full bg-[#d7b64d] ${listening ? "animate-pulse" : "opacity-45"}`} style={{ height: `${8 + ((index * 7) % 20)}px`, animationDelay: `${index * 45}ms` }} />
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <div className="text-[12px] font-semibold text-[#d7b64d]">Room Guide</div>
        <div className="mt-1 whitespace-pre-wrap text-[14px] leading-6 text-white/92">{lastAssistant}</div>

        <div className="my-4 h-px w-full bg-gradient-to-r from-transparent via-[#d7b64d] to-transparent" />

        <div className="text-[12px] font-semibold text-[#d7b64d]">You</div>
        {lastUser ? <div className="mt-1 whitespace-pre-wrap text-[13px] leading-5 text-white/68">{lastUser}</div> : <div className="mt-1 text-[12px] text-white/35">{ko ? "말하거나 아래에 입력해 주세요." : "Speak or type below."}</div>}

        {messages.length > 2 ? (
          <div className="mt-5 space-y-2 border-t border-white/8 pt-4">
            {messages.slice(-8, -2).map((message, index) => (
              <div key={`${message.role}-${index}`} className={`rounded-xl px-3 py-2 text-[12px] leading-5 ${message.role === "user" ? "ml-10 bg-[#1d3b67]/45 text-white/75" : "mr-8 border border-[#d7b64d]/18 bg-black/15 text-white/62"}`}>
                {message.text}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <form onSubmit={submit} className="shrink-0 border-t border-white/10 px-5 pb-4 pt-3">
        <div className="flex items-end gap-2 rounded-xl bg-black/25 px-2 py-2">
          <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={2} placeholder={ko ? "예: 이름은 Family Legal, 가족법, 2-3명, 호주, 한국어" : "e.g. Family Legal, Family, 2-3, Australia, Korean"} className="max-h-28 min-h-[52px] flex-1 resize-none bg-transparent px-2 py-2 text-[14px] text-white outline-none placeholder:text-white/35" />
          <button type="button" onClick={toggleMic} className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${listening ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/70" : "text-[#d7b64d] hover:bg-white/5"}`} title="Microphone">🎤</button>
          <button type="submit" disabled={!input.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#d7b64d] bg-[#7A0C2E] text-lg text-[#ffe18a] shadow-[0_0_14px_rgba(215,182,77,.28)] hover:bg-[#94113a] disabled:opacity-30" title="Send">↑</button>
        </div>
        <div className="mt-2 text-[10px] text-white/40">{ko ? "유료 작업·계약·결제 등은 별도 승인 절차를 거친 뒤 실행합니다." : "Paid actions, contracts and payments require a separate approval before execution."}</div>
      </form>
    </aside>
  );
}
