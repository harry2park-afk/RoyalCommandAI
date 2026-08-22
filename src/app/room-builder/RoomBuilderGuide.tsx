"use client";

import { FormEvent, useMemo, useRef, useState } from "react";

type GuideMessage = { role: "guide" | "user"; text: string };
type SpeechWindow = Window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };

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
  utterance.lang = "en-AU";
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

function answerQuestion(raw: string) {
  const q = normalise(raw);
  const practiceMap: Array<[RegExp, string]> = [
    [/(commercial|corporate)/, "Commercial"],
    [/(family|divorce)/, "Family"],
    [/(property|real estate)/, "Property"],
    [/(compensation|damages)/, "Compensation"],
    [/(criminal)/, "Criminal"],
    [/(immigration|visa)/, "Immigration"],
    [/(general)/, "General"],
  ];

  for (const [pattern, label] of practiceMap) {
    if (pattern.test(q)) {
      const clicked = clickFirst([label]);
      return clicked
        ? `${label} selected. Next, choose how many professionals will normally use this Room.`
        : `I could not find the ${label} option on the current screen.`;
    }
  }

  if (/\b1\b|alone|one person/.test(q)) {
    const clicked = clickFirst(["1"]);
    return clicked ? "One professional selected. You can keep the recommended AI and tools for now." : "I could not find the 1-person option.";
  }
  if (/2\s*[-~]\s*3|two|three/.test(q)) {
    const clicked = clickFirst(["2-3"]);
    return clicked ? "2-3 professionals selected." : "I could not find the 2-3 option.";
  }
  if (/4\s*[-~]\s*10/.test(q)) {
    const clicked = clickFirst(["4-10"]);
    return clicked ? "4-10 professionals selected." : "I could not find the 4-10 option.";
  }
  if (/10\+|more than 10|over 10/.test(q)) {
    const clicked = clickFirst(["10+"]);
    return clicked ? "10+ professionals selected." : "I could not find the 10+ option.";
  }

  if (/approval|human review|review first/.test(q)) {
    scrollToSection(3);
    const clicked = clickFirst(["Run After Approval · Recommended"]);
    return clicked ? "Important actions are now set to run only after human approval." : "Go to Approval Rules and choose Run After Approval · Recommended.";
  }

  if (/australia|aud/.test(q)) {
    scrollToSection(4);
    return selectAustralia() ? "Australia selected with the matching regional defaults." : "Go to Global Settings and choose Australia.";
  }

  if (/ai|tool|memory|materials/.test(q)) {
    scrollToSection(2);
    return "I moved to AI + Tool + Memory Materials. The recommended set is a good starting point.";
  }

  if (/website/.test(q)) {
    scrollToSection(5);
    return "I moved to Website Builder Kit. Turn it on if this Room needs website support.";
  }

  if (/preview|test/.test(q)) {
    scrollToSection(6);
    const preview = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((button) => /view preview/i.test(button.textContent || ""));
    preview?.click();
    return "I opened Preview. Review the settings, then use the final create button when ready.";
  }

  if (/how|where do i start|help|first/.test(q)) {
    scrollToSection(1);
    return "Start with Room Information. Tell me the main work this Room should handle, such as Commercial, Property, or Family law.";
  }

  if (/next/.test(q)) return "Continue from the top, one section at a time. Tell me the section name if you want me to move there.";

  return "Tell me what you want to set, for example: Commercial, one professional, approval first, Australia, AI tools, or Preview.";
}

export default function RoomBuilderGuide() {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState<GuideMessage[]>([
    { role: "guide", text: "Hello. I can guide you through Room setup one step at a time. For example, say: I want a Commercial Legal Room." },
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
      setMessages((current) => [...current, { role: "guide", text: "Voice input is not available in this browser. Please type in the box below." }]);
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-AU";
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
        <div><div className="font-semibold text-[var(--gold-soft)]">Royal Command Room Guide</div><div className="text-[11px] text-[var(--muted)]">Ask by voice or text</div></div>
        <div className="flex gap-1"><button type="button" onClick={() => speak(lastGuide)} className="rounded-lg px-2 py-1 text-sm" title="Replay guide">🔊</button><button type="button" onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-sm" title="Close">✕</button></div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-5 ${message.role === "user" ? "bg-[#173b70] text-white" : "border border-[var(--gold)]/25 bg-black/35 text-[#f3efe6]"}`}>{message.text}</div></div>)}
      </div>
      <form onSubmit={submit} className="border-t border-white/10 p-3">
        <div className="flex gap-2"><input value={input} onChange={(event) => setInput(event.target.value)} className="rc-input min-w-0 flex-1" placeholder="e.g. I want a Commercial Legal Room" /><button type="button" onClick={toggleMic} className={`rounded-xl border px-3 ${listening ? "border-red-400 bg-red-500/20" : "border-[var(--gold)]/40 bg-black/30"}`} title="Ask by voice">{listening ? "●" : "🎤"}</button><button type="submit" className="rounded-xl bg-[var(--gold)] px-3 font-semibold text-black" title="Send">➤</button></div>
        <div className="mt-2 text-[10px] text-[var(--muted)]">Final Room creation always requires the customer to press the approval button.</div>
      </form>
    </aside>
  );
}
