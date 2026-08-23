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
    return "채팅 마이크가 차단되어 있습니다. Chrome 마이크 권한을 확인해 주세요.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "사용할 수 있는 입력 마이크를 찾지 못했습니다.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Chrome이 현재 마이크를 열지 못했습니다.";
  }
  return "채팅 마이크를 시작하지 못했습니다.";
}

function currentLocale() {
  const languageSelect = Array.from(document.querySelectorAll<HTMLSelectElement>("select")).find((select) =>
    /kr|ko|한국|en|english/i.test(`${select.value} ${select.options[select.selectedIndex]?.text || ""}`),
  );
  const raw = `${languageSelect?.value || ""} ${languageSelect?.options[languageSelect.selectedIndex]?.text || ""}`.toLowerCase();
  if (/kr|ko|한국/.test(raw)) return "ko-KR";
  if (/ja|jp|日本/.test(raw)) return "ja-JP";
  if (/zh|cn|中文/.test(raw)) return "zh-CN";
  return "en-AU";
}

export default function MainChatMicBridge() {
  const recognitionRef = useRef<any>(null);
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

    const stop = () => {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      if (recognition) {
        try { recognition.stop(); } catch {}
      }
      resetButton();
      setStatus("");
    };

    const start = (button: HTMLButtonElement) => {
      setProblem("");
      setStatus("마이크 연결 중…");
      buttonRef.current = button;

      const w = window as typeof window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
      const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
      if (!SR) {
        setProblem("현재 Chrome에서 실시간 음성인식을 사용할 수 없습니다.");
        setStatus("");
        return;
      }

      const textarea = findComposer();
      if (!textarea) {
        setProblem("채팅 입력창을 찾지 못했습니다.");
        setStatus("");
        return;
      }

      const recognition = new SR();
      recognitionRef.current = recognition;
      recognition.lang = currentLocale();
      recognition.interimResults = true;
      recognition.continuous = true;

      let finalTranscript = "";
      const originalText = textarea.value.trim();

      recognition.onstart = () => {
        setStatus("말씀하세요…");
        button.style.boxShadow = "0 0 0 2px rgba(52,211,153,.55), 0 0 20px rgba(52,211,153,.65)";
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
          setProblem("Chrome에서 royalcommand.ai의 마이크 사용이 차단되어 있습니다.");
        } else if (code === "audio-capture") {
          setProblem("Chrome이 선택된 마이크를 잡지 못했습니다.");
        } else if (code === "no-speech") {
          setProblem("음성이 감지되지 않았습니다. Chrome 기본 마이크가 S10 Hands-Free로 선택되어 있는지 확인해 주세요.");
        } else if (code === "network") {
          setProblem("Chrome 음성인식 서비스 연결에 실패했습니다.");
        } else if (code !== "aborted") {
          setProblem(`음성인식 오류: ${code || "unknown"}`);
        }
        recognitionRef.current = null;
        resetButton();
        setStatus("");
      };

      recognition.onend = () => {
        if (recognitionRef.current === recognition) recognitionRef.current = null;
        resetButton();
        setStatus("");
      };

      try {
        recognition.start();
      } catch (error) {
        recognitionRef.current = null;
        resetButton();
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

      if (recognitionRef.current) {
        stop();
        return;
      }
      start(button);
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      if (recognition) {
        try { recognition.abort(); } catch {}
      }
      resetButton();
    };
  }, []);

  if (!status && !problem) return null;
  return (
    <div className="fixed bottom-[76px] left-1/2 z-[510] -translate-x-1/2 rounded-lg border border-[#d7b64d]/60 bg-[#07111f]/95 px-3 py-2 text-[12px] shadow-2xl">
      {problem ? <span className="text-amber-200">{problem}</span> : <span className="text-emerald-300">{status}</span>}
    </div>
  );
}
