"use client";

import { useEffect, useRef, useState } from "react";

function findComposer() {
  return Array.from(document.querySelectorAll<HTMLTextAreaElement>("textarea")).find((textarea) => {
    const placeholder = textarea.getAttribute("placeholder") || "";
    return /type or speak your order|화면 캡처|order/i.test(placeholder);
  }) || null;
}

function findComposerRoot(textarea: HTMLTextAreaElement | null) {
  return textarea?.closest("form") || textarea?.parentElement?.parentElement || textarea?.parentElement || null;
}

function findComposerMicButton() {
  const root = findComposerRoot(findComposer());
  if (!root) return null;
  return Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find((button) => Boolean(button.querySelector("svg.lucide-mic"))) || null;
}

function findNativeSendButton() {
  const textarea = findComposer();
  const root = findComposerRoot(textarea);
  if (!root) return null;
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>("button"));
  return buttons.find((button) => {
    if (button === findComposerMicButton()) return false;
    const text = `${button.textContent || ""} ${button.title || ""} ${button.getAttribute("aria-label") || ""}`.toLowerCase();
    return button.type === "submit" || /send|submit|보내|전송/.test(text);
  }) || null;
}

function updateReactTextarea(textarea: HTMLTextAreaElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  descriptor?.set?.call(textarea, value);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.focus();
}

function currentLanguage() {
  const select = Array.from(document.querySelectorAll<HTMLSelectElement>("select")).find((item) =>
    /kr|ko|한국|en|english|ja|jp|日本|zh|中文/i.test(`${item.value} ${item.options[item.selectedIndex]?.text || ""}`),
  );
  const raw = `${select?.value || ""} ${select?.options[select.selectedIndex]?.text || ""}`.toLowerCase();
  if (/kr|ko|한국/.test(raw)) return "ko";
  if (/ja|jp|日本/.test(raw)) return "ja";
  if (/zh-tw|tw|繁體/.test(raw)) return "zh-tw";
  if (/zh|cn|中文/.test(raw)) return "zh-cn";
  return "en";
}

function friendlyMicError(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Chrome에서 royalcommand.ai의 마이크 권한을 허용해 주세요.";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "입력 마이크를 찾지 못했습니다. Chrome 마이크를 S10 Hands-Free로 선택해 주세요.";
  if (name === "NotReadableError" || name === "TrackStartError") return "선택된 마이크를 다른 앱이 사용 중이거나 Chrome이 열지 못했습니다.";
  return "실시간 음성 연결을 시작하지 못했습니다. 잠시 후 다시 눌러 주세요.";
}

const EMPTY_LEVELS = Array.from({ length: 18 }, () => 0.1);

export default function MainChatMicBridge() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const originalTextRef = useRef("");
  const orderRef = useRef<string[]>([]);
  const partialsRef = useRef(new Map<string, string>());
  const finalsRef = useRef(new Map<string, string>());
  const closingRef = useRef(false);
  const activeRef = useRef(false);
  const levelsLastPaintRef = useRef(0);

  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
  const [levels, setLevels] = useState<number[]>(EMPTY_LEVELS);
  const [active, setActive] = useState(false);
  const [hasText, setHasText] = useState(false);

  useEffect(() => {
    const renderTranscript = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const segments = orderRef.current.map((id) => finalsRef.current.get(id) || partialsRef.current.get(id) || "").filter(Boolean);
      const spoken = segments.join(" ").replace(/\s+/g, " ").trim();
      const base = originalTextRef.current.trim();
      const combined = [base, spoken].filter(Boolean).join(base && spoken ? " " : "");
      updateReactTextarea(textarea, combined);
      setHasText(Boolean(combined.trim()));
    };

    const resetButton = () => {
      const button = buttonRef.current;
      if (button) {
        button.style.boxShadow = "";
        button.style.color = "";
        button.title = "Voice input";
      }
    };

    const stopWaveform = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      setLevels(EMPTY_LEVELS);
      const context = audioContextRef.current;
      audioContextRef.current = null;
      if (context) void context.close().catch(() => undefined);
    };

    const cleanup = () => {
      closingRef.current = true;
      activeRef.current = false;
      stopWaveform();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      try { dcRef.current?.close(); } catch {}
      dcRef.current = null;
      try { pcRef.current?.close(); } catch {}
      pcRef.current = null;
      resetButton();
      setActive(false);
      setStatus("");
      window.setTimeout(() => { closingRef.current = false; }, 0);
    };

    const startWaveform = (stream: MediaStream) => {
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
    };

    const start = async (button: HTMLButtonElement) => {
      setProblem("");
      setStatus("마이크 여는 중…");
      buttonRef.current = button;
      const textarea = findComposer();
      if (!textarea) {
        setProblem("채팅 입력창을 찾지 못했습니다.");
        setStatus("");
        return;
      }
      textareaRef.current = textarea;
      originalTextRef.current = textarea.value.trim();
      setHasText(Boolean(textarea.value.trim()));
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
        setActive(true);
        startWaveform(stream);
        setStatus("듣고 있습니다…");
        button.style.boxShadow = "0 0 0 2px rgba(52,211,153,.55), 0 0 22px rgba(52,211,153,.7)";
        button.style.color = "#6ee7b7";
        button.title = "마이크 켜짐 — 클릭하면 종료";

        const tokenResponse = await fetch(`/api/voice/realtime-token?lang=${encodeURIComponent(currentLanguage())}`, { cache: "no-store" });
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
          if (!closingRef.current) setStatus("말씀하세요…");
        });
        dc.addEventListener("message", (event) => {
          let message: any;
          try { message = JSON.parse(String(event.data || "{}")); } catch { return; }
          const type = String(message?.type || "");
          const itemId = String(message?.item_id || message?.item?.id || "");
          if (type === "conversation.item.input_audio_transcription.delta" && itemId) {
            if (!orderRef.current.includes(itemId)) orderRef.current.push(itemId);
            partialsRef.current.set(itemId, (partialsRef.current.get(itemId) || "") + String(message?.delta || ""));
            setStatus("실시간 입력 중…");
            renderTranscript();
          } else if (type === "conversation.item.input_audio_transcription.completed" && itemId) {
            if (!orderRef.current.includes(itemId)) orderRef.current.push(itemId);
            finalsRef.current.set(itemId, String(message?.transcript || "").trim());
            partialsRef.current.delete(itemId);
            renderTranscript();
            setStatus("계속 듣고 있습니다…");
          } else if (type === "error") {
            setProblem("실시간 음성인식 연결에 문제가 생겼습니다. 마이크를 다시 눌러 주세요.");
          }
        });
        dc.addEventListener("close", () => {
          if (!closingRef.current) setProblem("실시간 음성 연결이 끊겼습니다. 마이크를 다시 눌러 주세요.");
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
        cleanup();
        setProblem(friendlyMicError(error));
      }
    };

    const stop = () => {
      try { if (dcRef.current?.readyState === "open") dcRef.current.send(JSON.stringify({ type: "input_audio_buffer.commit" })); } catch {}
      setStatus("마이크 종료 중…");
      window.setTimeout(cleanup, 250);
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest<HTMLButtonElement>("button");
      const micButton = findComposerMicButton();
      if (!button || !micButton || button !== micButton) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (activeRef.current || streamRef.current || pcRef.current) stop();
      else void start(button);
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      cleanup();
    };
  }, []);

  const sendCurrentText = () => {
    const textarea = findComposer();
    if (!textarea?.value.trim()) return;
    if (activeRef.current) {
      try { dcRef.current?.send(JSON.stringify({ type: "input_audio_buffer.commit" })); } catch {}
      streamRef.current?.getTracks().forEach((track) => track.stop());
      activeRef.current = false;
      setActive(false);
    }
    const send = findNativeSendButton();
    if (send) {
      send.click();
      return;
    }
    const form = textarea.closest("form");
    if (form) form.requestSubmit();
    else textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
  };

  if (!status && !problem && !active && !hasText) return null;

  return (
    <div className="fixed bottom-[72px] left-1/2 z-[510] flex -translate-x-1/2 items-center gap-3 rounded-xl border border-[#d7b64d]/60 bg-[#07111f]/96 px-4 py-2.5 text-[12px] shadow-2xl backdrop-blur">
      {active && (
        <div className="flex h-9 items-center gap-[3px]" aria-label="Live microphone level">
          {levels.map((level, index) => (
            <span key={index} className="block w-[3px] rounded-full bg-emerald-300 transition-[height] duration-75" style={{ height: `${Math.round(5 + level * 28)}px`, opacity: 0.6 + level * 0.4 }} />
          ))}
        </div>
      )}
      {problem ? <span className="max-w-[620px] text-amber-200">{problem}</span> : <span className="whitespace-nowrap text-emerald-300">{status || "입력 준비됨"}</span>}
      <button
        type="button"
        onClick={sendCurrentText}
        disabled={!hasText}
        title="말한 내용을 보내기"
        aria-label="말한 내용을 보내기"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d7b64d] bg-[#8f1028] text-xl font-bold text-[#f6d56b] shadow disabled:cursor-not-allowed disabled:opacity-35"
      >
        ↑
      </button>
    </div>
  );
}
