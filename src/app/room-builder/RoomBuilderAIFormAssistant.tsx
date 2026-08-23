"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Mic, Paperclip } from "lucide-react";

type Message = { role: "assistant" | "user"; text: string };

const SELECTED_LANGUAGE_KEY = "royalcommand:selected-language";
const EMPTY_LEVELS = Array.from({ length: 18 }, () => 0.1);
const IDLE_LEVELS = [0.22, 0.36, 0.5, 0.31, 0.62, 0.43, 0.72, 0.38, 0.56, 0.78, 0.47, 0.65, 0.34, 0.59, 0.4, 0.69, 0.46, 0.28];

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

function realtimeLanguage(tag: string) {
  const raw = tag.toLowerCase();
  if (raw.startsWith("ko")) return "ko";
  if (raw.startsWith("ja")) return "ja";
  if (raw.startsWith("zh-tw") || raw.includes("hant")) return "zh-tw";
  if (raw.startsWith("zh")) return "zh-cn";
  return "en";
}

function isKorean(tag: string) {
  return tag.toLowerCase().startsWith("ko");
}

function friendlyMicError(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Chrome에서 royalcommand.ai의 마이크 권한을 허용해 주세요.";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "입력 마이크를 찾지 못했습니다.";
  if (name === "NotReadableError" || name === "TrackStartError") return "선택된 마이크를 다른 앱이 사용 중이거나 Chrome이 열지 못했습니다.";
  return "실시간 음성 연결을 시작하지 못했습니다. 마이크를 다시 눌러 주세요.";
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
    const target = label.parentElement?.querySelector("input, textarea, select");
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
    ? "안녕하세요. Room 작성 도우미입니다. 말이나 글로 원하는 내용을 알려주시면 해당 폼을 직접 선택하거나 입력해 드립니다."
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

  if (/승인\s*후|사람.*승인|human\s*approval|review\s*first|run\s*after\s*approval/i.test(q) && clickExact("Run After Approval · Recommended")) actions.push(ko ? "승인 방식: 승인 후 실행" : "Approval: Run After Approval");
  else if (/safe\s*mode|안전\s*모드/i.test(q) && clickExact("Safe Mode")) actions.push(ko ? "승인 방식: Safe Mode" : "Approval: Safe Mode");
  else if (/autonomous|자동\s*실행/i.test(q) && clickExact("Autonomous Mode")) actions.push(ko ? "승인 방식: Autonomous Mode" : "Approval: Autonomous Mode");

  const countries: Array<[RegExp, RegExp[]]> = [
    [/(호주|australia)/i, [/australia/i]], [/(한국|south korea|korea)/i, [/south korea|korea/i]],
    [/(미국|united states|usa|u\.s\.)/i, [/united states/i]], [/(영국|united kingdom|uk)/i, [/united kingdom/i]],
    [/(일본|japan)/i, [/japan/i]], [/(싱가포르|singapore)/i, [/singapore/i]],
  ];
  for (const [pattern, optionPatterns] of countries) {
    if (pattern.test(q) && selectOptionByText("Country / Region", optionPatterns)) { actions.push(ko ? "국가 설정 완료" : "Country selected"); break; }
  }

  const languages: Array<[RegExp, RegExp[]]> = [
    [/(한국어|korean)/i, [/^korean$/i]], [/(영어\s*호주|english\s*australia)/i, [/english \(australia\)/i]],
    [/(영어\s*미국|english\s*us|english\s*united states)/i, [/english \(united states\)/i]],
    [/(영어\s*영국|english\s*uk|english\s*united kingdom)/i, [/english \(united kingdom\)/i]],
    [/(일본어|japanese)/i, [/^japanese$/i]], [/(중국어|chinese)/i, [/chinese/i]],
  ];
  for (const [pattern, optionPatterns] of languages) {
    if (pattern.test(q) && selectOptionByText("Room Language", optionPatterns)) { actions.push(ko ? "Room 언어 설정 완료" : "Room language selected"); break; }
  }

  if (/ai|도구|tool|memory|메모리|materials|재료/i.test(q)) {
    scrollToSection(2);
    if (!actions.length) return ko ? "AI + Tool + Memory Materials로 이동했습니다." : "I moved to AI + Tool + Memory Materials.";
  }
  if (/미리보기|preview|검토/i.test(q) && openPreview()) actions.push(ko ? "Preview 열기" : "Preview opened");
  if (/어떻게|뭐부터|처음|도와|help|where do i start|first/i.test(q) && !actions.length) {
    scrollToSection(1);
    return ko ? "Room Information부터 시작합니다. 원하시는 Room 정보를 말씀해 주세요." : "Start with Room Information. Tell me what you want for this Room.";
  }
  if (/다음|next/i.test(q) && !actions.length) {
    scrollToSection(2);
    return ko ? "다음 단계로 이동했습니다." : "I moved to the next section.";
  }
  if (actions.length) return ko ? `입력했습니다: ${actions.join(" · ")}.` : `Updated: ${actions.join(" · ")}.`;
  return ko ? "원하시는 내용을 말씀해 주세요. 제가 해당 항목을 직접 채우겠습니다." : "Tell me what you want and I will fill the matching fields.";
}

export default function RoomBuilderAIFormAssistant() {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [languageTag, setLanguageTag] = useState("en-AU");
  const [messages, setMessages] = useState<Message[]>([]);
  const [levels, setLevels] = useState<number[]>(EMPTY_LEVELS);
  const [micStatus, setMicStatus] = useState("");
  const [micProblem, setMicProblem] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const closingRef = useRef(false);
  const originalTextRef = useRef("");
  const orderRef = useRef<string[]>([]);
  const partialsRef = useRef(new Map<string, string>());
  const finalsRef = useRef(new Map<string, string>());
  const levelsLastPaintRef = useRef(0);

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

  useEffect(() => () => cleanupMicrophone(), []);

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

  function stopWaveform() {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setLevels(EMPTY_LEVELS);
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context) void context.close().catch(() => undefined);
  }

  function cleanupMicrophone() {
    closingRef.current = true;
    activeRef.current = false;
    stopWaveform();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    try { dcRef.current?.close(); } catch {}
    dcRef.current = null;
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;
    setListening(false);
    setMicStatus("");
    window.setTimeout(() => { closingRef.current = false; }, 0);
  }

  function startWaveform(stream: MediaStream) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const context: AudioContext = new AudioContextClass();
    audioContextRef.current = context;
    void context.resume().catch(() => undefined);
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.5;
    source.connect(analyser);
    const bins = new Uint8Array(analyser.frequencyBinCount);
    const paint = (now: number) => {
      analyser.getByteFrequencyData(bins);
      if (now - levelsLastPaintRef.current > 45) {
        levelsLastPaintRef.current = now;
        const next = Array.from({ length: 18 }, (_, index) => {
          const start = Math.floor((index / 18) * 96);
          const end = Math.max(start + 1, Math.floor(((index + 1) / 18) * 96));
          let total = 0;
          for (let i = start; i < end; i += 1) total += bins[i] || 0;
          return Math.max(0.1, Math.min(1, (total / Math.max(1, end - start)) / 95));
        });
        setLevels(next);
      }
      rafRef.current = requestAnimationFrame(paint);
    };
    rafRef.current = requestAnimationFrame(paint);
  }

  function renderTranscript() {
    const segments = orderRef.current.map((id) => finalsRef.current.get(id) || partialsRef.current.get(id) || "").filter(Boolean);
    const spoken = segments.join(" ").replace(/\s+/g, " ").trim();
    const base = originalTextRef.current.trim();
    setInput([base, spoken].filter(Boolean).join(base && spoken ? " " : ""));
  }

  async function startMicrophone() {
    setMicProblem("");
    setMicStatus("마이크 여는 중…");
    originalTextRef.current = input.trim();
    orderRef.current = [];
    partialsRef.current.clear();
    finalsRef.current.clear();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      streamRef.current = stream;
      activeRef.current = true;
      setListening(true);
      startWaveform(stream);
      setMicStatus("듣고 있습니다…");

      const tokenResponse = await fetch(`/api/voice/realtime-token?lang=${encodeURIComponent(realtimeLanguage(languageTag))}`, { cache: "no-store" });
      const tokenPayload = await tokenResponse.json().catch(() => ({}));
      if (!tokenResponse.ok || !tokenPayload?.value) throw new Error("token-unavailable");

      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      const track = stream.getAudioTracks()[0];
      if (!track) throw new Error("no-audio-track");
      pc.addTrack(track, stream);
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.addEventListener("open", () => {
        if (!closingRef.current) setMicStatus("말씀하세요…");
      });
      dc.addEventListener("message", (event) => {
        let message: any;
        try { message = JSON.parse(String(event.data || "{}")); } catch { return; }
        const type = String(message?.type || "");
        const itemId = String(message?.item_id || message?.item?.id || "");
        if (type === "conversation.item.input_audio_transcription.delta" && itemId) {
          if (!orderRef.current.includes(itemId)) orderRef.current.push(itemId);
          partialsRef.current.set(itemId, (partialsRef.current.get(itemId) || "") + String(message?.delta || ""));
          setMicStatus("실시간 입력 중…");
          renderTranscript();
        } else if (type === "conversation.item.input_audio_transcription.completed" && itemId) {
          if (!orderRef.current.includes(itemId)) orderRef.current.push(itemId);
          finalsRef.current.set(itemId, String(message?.transcript || "").trim());
          partialsRef.current.delete(itemId);
          renderTranscript();
          setMicStatus("계속 듣고 있습니다…");
        } else if (type === "error") {
          setMicProblem("실시간 음성인식 연결에 문제가 생겼습니다. 마이크를 다시 눌러 주세요.");
        }
      });
      dc.addEventListener("close", () => {
        if (!closingRef.current) setMicProblem("실시간 음성 연결이 끊겼습니다. 마이크를 다시 눌러 주세요.");
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const sdp = offer.sdp || pc.localDescription?.sdp || "";
      if (!sdp) throw new Error("no-sdp");
      const response = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: { Authorization: `Bearer ${String(tokenPayload.value)}`, "Content-Type": "application/sdp" },
        body: sdp,
      });
      const answerSdp = await response.text();
      if (!response.ok || !answerSdp.includes("v=0")) throw new Error("webrtc-connect-failed");
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (error) {
      cleanupMicrophone();
      setMicProblem(friendlyMicError(error));
    }
  }

  function stopMicrophone() {
    try {
      if (dcRef.current?.readyState === "open") dcRef.current.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
    } catch {}
    setMicStatus("마이크 종료 중…");
    window.setTimeout(cleanupMicrophone, 250);
  }

  function toggleMic() {
    if (activeRef.current || streamRef.current || pcRef.current) stopMicrophone();
    else void startMicrophone();
  }

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-[260] flex h-12 items-center gap-2 rounded-xl border border-[#d7b64d] bg-[#7A0C2E] px-4 text-[13px] font-semibold text-[#ffe18a]">Room Guide</button>;
  }

  const visibleLevels = listening ? levels : IDLE_LEVELS;
  const micLabel = micProblem || micStatus || "입력 준비됨";

  return (
    <aside className="fixed bottom-[10px] right-[10px] top-[10px] z-[260] flex w-[520px] max-w-[calc(100vw-20px)] flex-col overflow-hidden bg-[#07111f]/97 shadow-[0_22px_75px_rgba(0,0,0,.62)] backdrop-blur-md">
      <div className="relative shrink-0 border-b border-white/10 px-5 pt-3">
        <div className="absolute right-3 top-3 z-10 flex items-center gap-3">
          <span className="flex items-center gap-1 text-[10px] font-semibold tracking-[0.18em] text-[#f3d36a]"><span className={`h-2 w-2 rounded-full ${listening ? "animate-pulse bg-emerald-400" : "bg-[#d7b64d]"}`} />LIVE</span>
          <button type="button" onClick={() => { cleanupMicrophone(); setOpen(false); }} className="grid h-8 w-8 place-items-center rounded-full text-xl leading-none text-white/70 hover:bg-white/10">×</button>
        </div>
        <div className="text-center font-[Times_New_Roman] text-xl font-semibold text-[#f3d36a]">Royal Command Room Guide</div>
        <div className="relative mx-auto mt-1 h-[265px] w-[330px] max-w-[70%]">
          <img src="/ai-helper-woman.svg" alt="Royal Command Room Guide" className="relative h-full w-full object-contain object-bottom" />
        </div>
        <div className="flex items-center gap-2 pb-2 text-[#d7b64d]">
          <button type="button" onClick={() => setSpeakerEnabled((value) => !value)} className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border ${speakerEnabled ? "border-emerald-400/70 bg-emerald-500/15 text-emerald-300" : "border-[#d7b64d]/70 text-[#d7b64d]"}`}>🔊</button>
          <div className="flex h-8 flex-1 items-center gap-[3px] overflow-hidden">
            {Array.from({ length: 30 }).map((_, index) => <span key={index} className={`w-[2px] rounded-full bg-[#d7b64d] ${listening ? "animate-pulse" : "opacity-45"}`} style={{ height: `${8 + ((index * 7) % 20)}px`, animationDelay: `${index * 45}ms` }} />)}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <div className="text-[12px] font-semibold text-[#d7b64d]">Room Guide</div>
        <div className="mt-1 whitespace-pre-wrap text-[14px] leading-6 text-white/92">{lastAssistant}</div>
        <div className="my-4 h-px w-full bg-gradient-to-r from-transparent via-[#d7b64d] to-transparent" />
        <div className="text-[12px] font-semibold text-[#d7b64d]">You</div>
        {lastUser ? <div className="mt-1 whitespace-pre-wrap text-[13px] leading-5 text-white/68">{lastUser}</div> : null}
      </div>

      <form onSubmit={submit} className="h-[70px] min-h-[70px] max-h-[70px] shrink-0 border-t border-[#d7b64d]/30 bg-[#07111f] px-3 py-1">
        <input ref={fileRef} type="file" className="hidden" />
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={1}
          aria-label="Room Guide message"
          className="h-[30px] min-h-[30px] w-full resize-none overflow-hidden bg-transparent px-1 py-1 text-[13px] leading-5 text-white outline-none"
        />
        <div className="flex h-[34px] items-center gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white/75 hover:bg-white/5" title="Attach file"><Paperclip size={16} /></button>
          <button type="button" onClick={toggleMic} className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${listening ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/70" : "text-white/75 hover:bg-white/5"}`} title={listening ? "마이크 켜짐 — 클릭하면 종료" : "Voice input"}><Mic size={16} /></button>
          <div className="flex h-7 min-w-0 flex-1 items-center gap-2 overflow-hidden px-1 text-[9px]">
            <div className="flex h-5 shrink-0 items-center gap-[2px]" aria-label="Live microphone level">
              {visibleLevels.map((level, index) => (
                <span key={index} className={`block w-[2px] rounded-full transition-[height] duration-75 ${listening ? "bg-emerald-300" : "bg-emerald-400/65"}`} style={{ height: `${Math.round(4 + level * 14)}px`, opacity: listening ? 0.65 + level * 0.35 : 0.7 }} />
              ))}
            </div>
            <span className={`min-w-0 flex-1 truncate whitespace-nowrap ${micProblem ? "text-amber-200" : listening ? "text-emerald-300" : "text-emerald-400/80"}`}>{micLabel}</span>
          </div>
          <button type="submit" disabled={!input.trim()} className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#d7b64d] bg-[#7A0C2E] text-[#ffe18a] disabled:opacity-30" title="Send"><ArrowUp size={17} /></button>
        </div>
      </form>
    </aside>
  );
}
