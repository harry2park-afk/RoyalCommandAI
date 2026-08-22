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
    return "Windows에서 사용할 수 있는 입력 마이크를 찾지 못했습니다. 헤드셋/이어폰 마이크 또는 외부 마이크를 연결해 주세요.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "마이크는 있지만 Chrome이 사용할 수 없습니다. Windows Sound > Input에서 입력 장치를 확인해 주세요.";
  }
  return "채팅 마이크를 시작하지 못했습니다. Chrome 마이크 권한과 Windows 입력 장치를 확인해 주세요.";
}

export default function MainChatMicBridge() {
  const recognitionRef = useRef<any>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");

  useEffect(() => {
    const stop = () => {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      if (recognition) {
        try { recognition.abort(); } catch {}
      }
      const button = buttonRef.current;
      if (button) {
        button.style.boxShadow = "";
        button.style.color = "";
        button.title = "Voice input";
      }
      setStatus("");
    };

    const start = async (button: HTMLButtonElement) => {
      setProblem("");
      setStatus("마이크 확인 중…");
      buttonRef.current = button;

      if (!navigator.mediaDevices?.getUserMedia) {
        setProblem("이 브라우저에서는 마이크 입력을 사용할 수 없습니다.");
        setStatus("");
        return;
      }

      try {
        const permissionStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false,
        });
        permissionStream.getTracks().forEach((track) => track.stop());
      } catch (error) {
        setProblem(micErrorMessage(error));
        setStatus("");
        return;
      }

      const w = window as typeof window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
      const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
      if (!SR) {
        setProblem("현재 Chrome에서 음성인식 기능을 사용할 수 없습니다.");
        setStatus("");
        return;
      }

      const textarea = findComposer();
      if (!textarea) return;

      const languageSelect = Array.from(document.querySelectorAll<HTMLSelectElement>("select")).find((select) => /kr|ko|한국|en|english/i.test(`${select.value} ${select.options[select.selectedIndex]?.text || ""}`));
      const rawLanguage = `${languageSelect?.value || ""} ${languageSelect?.options[languageSelect.selectedIndex]?.text || ""}`.toLowerCase();
      const locale = /kr|ko|한국/.test(rawLanguage) ? "ko-KR" : /ja|jp|日本/.test(rawLanguage) ? "ja-JP" : /zh|cn|中文/.test(rawLanguage) ? "zh-CN" : "en-AU";

      const recognition = new SR();
      recognitionRef.current = recognition;
      recognition.lang = locale;
      recognition.interimResults = true;
      recognition.continuous = false;
      let finalTranscript = "";
      const originalText = textarea.value.trim();

      recognition.onaudiostart = () => {
        setStatus("마이크 준비됨");
        button.style.boxShadow = "0 0 0 2px rgba(52,211,153,.45), 0 0 18px rgba(52,211,153,.55)";
        button.style.color = "#6ee7b7";
        button.title = "Listening — click to stop";
      };
      recognition.onspeechstart = () => setStatus("말씀을 듣고 있습니다…");
      recognition.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const text = String(event.results[i]?.[0]?.transcript || "");
          if (event.results[i].isFinal) finalTranscript += `${text} `;
          else interim += text;
        }
        const spoken = `${finalTranscript}${interim}`.trim();
        const combined = [originalText, spoken].filter(Boolean).join(originalText && spoken ? " " : "");
        updateReactTextarea(textarea, combined);
      };
      recognition.onerror = (event: any) => {
        const code = String(event?.error || "");
        if (code === "not-allowed" || code === "service-not-allowed") {
          setProblem("Chrome에서 royalcommand.ai의 마이크 권한이 차단되어 있습니다.");
        } else if (code === "audio-capture") {
          setProblem("Chrome이 입력 마이크를 잡지 못했습니다. Windows Sound > Input에서 마이크를 선택해 주세요.");
        } else if (code === "no-speech") {
          setProblem("마이크는 켜졌지만 음성을 듣지 못했습니다. 마이크 가까이에서 다시 말씀해 주세요.");
        } else if (code !== "aborted") {
          setProblem(`음성인식 오류: ${code || "unknown"}`);
        }
        stop();
      };
      recognition.onend = () => stop();

      try {
        recognition.start();
      } catch (error) {
        setProblem(micErrorMessage(error));
        stop();
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

      if (recognitionRef.current) {
        stop();
        return;
      }
      void start(button);
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      stop();
    };
  }, []);

  if (!status && !problem) return null;
  return (
    <div className="fixed bottom-[76px] left-1/2 z-[510] -translate-x-1/2 rounded-lg border border-[#d7b64d]/60 bg-[#07111f]/95 px-3 py-2 text-[12px] shadow-2xl">
      {problem ? <span className="text-amber-200">{problem}</span> : <span className="text-emerald-300">{status}</span>}
    </div>
  );
}
