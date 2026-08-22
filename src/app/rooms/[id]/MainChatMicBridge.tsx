"use client";

import { useEffect, useRef, useState } from "react";

function findComposer() {
  return Array.from(document.querySelectorAll<HTMLTextAreaElement>("textarea")).find((textarea) => {
    const placeholder = textarea.getAttribute("placeholder") || "";
    return /type or speak your order|화면 캡처|order/i.test(placeholder);
  }) || null;
}

function findComposerMicButton() {
  const textarea = findComposer();
  if (!textarea) return null;
  const root = textarea.closest("form") || textarea.parentElement?.parentElement || textarea.parentElement;
  if (!root) return null;
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>("button"));
  return buttons.find((button) => Boolean(button.querySelector("svg.lucide-mic"))) || null;
}

function updateReactTextarea(textarea: HTMLTextAreaElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  descriptor?.set?.call(textarea, value);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.focus();
}

function micErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "채팅 마이크가 차단되어 있습니다. 주소창 왼쪽 사이트 설정에서 Microphone을 Allow로 바꿔 주세요.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "Windows에서 사용할 수 있는 입력 마이크를 찾지 못했습니다.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "마이크는 있지만 Chrome이 사용할 수 없습니다. Windows Sound > Input에서 입력 장치를 확인해 주세요.";
  }
  return "채팅 마이크를 시작하지 못했습니다.";
}

function currentLanguage() {
  const languageSelect = Array.from(document.querySelectorAll<HTMLSelectElement>("select")).find((select) =>
    /kr|ko|한국|en|english/i.test(`${select.value} ${select.options[select.selectedIndex]?.text || ""}`),
  );
  const raw = `${languageSelect?.value || ""} ${languageSelect?.options[languageSelect.selectedIndex]?.text || ""}`.toLowerCase();
  if (/kr|ko|한국/.test(raw)) return "ko";
  if (/ja|jp|日本/.test(raw)) return "ja";
  if (/zh|cn|中文/.test(raw)) return "zh";
  return "en";
}

export default function MainChatMicBridge() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const hardStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");

  useEffect(() => {
    const resetButton = () => {
      const button = buttonRef.current;
      if (button) {
        button.style.boxShadow = "";
        button.style.color = "";
        button.title = "Voice input";
      }
    };

    const releaseAudio = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (hardStopRef.current) clearTimeout(hardStopRef.current);
      hardStopRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      const context = analyserContextRef.current;
      analyserContextRef.current = null;
      if (context) void context.close().catch(() => undefined);
      resetButton();
    };

    const finishRecording = () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        try { recorder.stop(); } catch {}
      }
    };

    const start = async (button: HTMLButtonElement) => {
      setProblem("");
      setStatus("마이크 연결 중…");
      buttonRef.current = button;

      const textarea = findComposer();
      if (!textarea) {
        setProblem("채팅 입력창을 찾지 못했습니다.");
        setStatus("");
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        setProblem("현재 브라우저에서는 음성 녹음을 사용할 수 없습니다.");
        setStatus("");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        streamRef.current = stream;

        const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        recorderRef.current = recorder;
        const chunks: BlobPart[] = [];
        const originalText = textarea.value.trim();

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data);
        };

        recorder.onerror = () => {
          setProblem("마이크 녹음 중 오류가 발생했습니다.");
          setStatus("");
          recorderRef.current = null;
          releaseAudio();
        };

        recorder.onstop = async () => {
          recorderRef.current = null;
          releaseAudio();
          const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
          if (blob.size < 1000) {
            setProblem("녹음된 소리가 너무 짧습니다. 다시 말씀해 주세요.");
            setStatus("");
            return;
          }

          setStatus("음성을 글자로 바꾸는 중…");
          try {
            const form = new FormData();
            const ext = recorder.mimeType.includes("mp4") ? "m4a" : "webm";
            form.append("audio", blob, `room-mic.${ext}`);
            form.append("language", currentLanguage());

            const response = await fetch("/api/voice/transcribe", {
              method: "POST",
              body: form,
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload?.error || "Transcription failed");

            const spoken = String(payload?.transcript || "").trim();
            if (!spoken) {
              setProblem("녹음은 됐지만 음성을 글자로 바꾸지 못했습니다. 다시 말씀해 주세요.");
              setStatus("");
              return;
            }

            const combined = [originalText, spoken].filter(Boolean).join(originalText ? " " : "");
            updateReactTextarea(textarea, combined);
            setStatus("입력 완료");
            window.setTimeout(() => setStatus(""), 900);
          } catch (error) {
            setProblem(error instanceof Error ? `음성 변환 오류: ${error.message}` : "음성 변환에 실패했습니다.");
            setStatus("");
          }
        };

        recorder.start(250);
        setStatus("말씀하세요…");
        button.style.boxShadow = "0 0 0 2px rgba(52,211,153,.55), 0 0 20px rgba(52,211,153,.65)";
        button.style.color = "#6ee7b7";
        button.title = "Listening — click to stop";

        // Bluetooth hands-free microphones often work in MediaRecorder even when
        // Chrome Web Speech reports no-speech. Detect real signal and stop after
        // a short silence so the user does not need to click twice.
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const context: AudioContext = new AudioContextClass();
          analyserContextRef.current = context;
          const source = context.createMediaStreamSource(stream);
          const analyser = context.createAnalyser();
          analyser.fftSize = 1024;
          source.connect(analyser);
          const samples = new Uint8Array(analyser.fftSize);
          let heardVoice = false;
          let lastVoiceAt = performance.now();
          const startedAt = performance.now();

          const watch = () => {
            analyser.getByteTimeDomainData(samples);
            let sum = 0;
            for (const sample of samples) {
              const value = (sample - 128) / 128;
              sum += value * value;
            }
            const rms = Math.sqrt(sum / samples.length);
            const now = performance.now();
            if (rms > 0.008) {
              heardVoice = true;
              lastVoiceAt = now;
              setStatus("말씀을 듣고 있습니다…");
            }
            if (heardVoice && now - lastVoiceAt > 1800 && now - startedAt > 2200) {
              finishRecording();
              return;
            }
            rafRef.current = requestAnimationFrame(watch);
          };
          rafRef.current = requestAnimationFrame(watch);
        }

        hardStopRef.current = setTimeout(() => finishRecording(), 30000);
      } catch (error) {
        recorderRef.current = null;
        releaseAudio();
        setProblem(micErrorMessage(error));
        setStatus("");
      }
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

      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        finishRecording();
        return;
      }
      void start(button);
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        try { recorder.stop(); } catch {}
      }
      recorderRef.current = null;
      releaseAudio();
    };
  }, []);

  if (!status && !problem) return null;
  return (
    <div className="fixed bottom-[76px] left-1/2 z-[510] -translate-x-1/2 rounded-lg border border-[#d7b64d]/60 bg-[#07111f]/95 px-3 py-2 text-[12px] shadow-2xl">
      {problem ? <span className="text-amber-200">{problem}</span> : <span className="text-emerald-300">{status}</span>}
    </div>
  );
}
