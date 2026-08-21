"use client";

import { useEffect, useRef } from "react";

const SPEAKER_SELECTOR = '[data-speaker-control="true"]';

function findMessageViewport() {
  return Array.from(document.querySelectorAll("div")).find((element) => {
    const className = String(element.className || "");
    return className.includes("overflow-y-auto") && className.includes("overscroll-contain");
  }) as HTMLElement | undefined;
}

function isReadableAiElement(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement) || element.tagName !== "ARTICLE") return false;
  const text = (element.innerText || element.textContent || "").trim();
  return Boolean(text) && !text.startsWith("📎");
}

function cleanSpeechText(text: string) {
  return text
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/[*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function selectedSpeechLanguage() {
  const select = document.querySelector('select[aria-label="Language"]');
  if (select instanceof HTMLSelectElement) {
    if (select.value === "ko") return "ko-KR";
    if (select.value === "en") return "en-AU";
    if (select.value) return select.value;
  }
  return "ko-KR";
}

function speakerEnabled() {
  const button = document.querySelector(SPEAKER_SELECTOR);
  return button instanceof HTMLButtonElement && button.getAttribute("aria-pressed") === "true";
}

function latestAiElement(viewport: HTMLElement) {
  return Array.from(viewport.children).reverse().find(isReadableAiElement) || null;
}

function aiCountAfterLatestUser(viewport: HTMLElement) {
  const children = Array.from(viewport.children);
  let lastUserIndex = -1;
  children.forEach((element, index) => {
    if (element.tagName === "BUTTON") lastUserIndex = index;
  });
  return children.slice(lastUserIndex + 1).filter(isReadableAiElement).length;
}

export default function SpeakerTtsBridge() {
  const spokenElements = useRef(new WeakSet<HTMLElement>());
  const activeUtterances = useRef(new Set<SpeechSynthesisUtterance>());
  const restartTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const speech = window.speechSynthesis;

    function stopSpeech() {
      if (restartTimer.current !== null) {
        window.clearTimeout(restartTimer.current);
        restartTimer.current = null;
      }
      speech.cancel();
      activeUtterances.current.clear();
    }

    function speak(text: string, replaceCurrent = false) {
      const clean = cleanSpeechText(text).slice(0, 8000);
      if (!clean) return;

      if (replaceCurrent) stopSpeech();

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = selectedSpeechLanguage();
      utterance.volume = 1;
      const isKorean = utterance.lang.toLowerCase().startsWith("ko");
      utterance.rate = isKorean ? 0.92 : 1;
      utterance.pitch = isKorean ? 0.98 : 1;

      const prefix = utterance.lang.toLowerCase().split("-")[0];
      const voices = speech.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith(prefix));
      const preferred = voices.find((voice) => /natural|online|microsoft|google/i.test(voice.name)) || voices[0];
      if (preferred) utterance.voice = preferred;

      activeUtterances.current.add(utterance);
      const release = () => activeUtterances.current.delete(utterance);
      utterance.onend = release;
      utterance.onerror = release;

      const start = () => {
        speech.resume();
        speech.speak(utterance);
      };

      if (replaceCurrent) {
        restartTimer.current = window.setTimeout(() => {
          restartTimer.current = null;
          start();
        }, 60);
      } else {
        start();
      }
    }

    function markCurrentAsSeen() {
      const viewport = findMessageViewport();
      if (!viewport) return;
      Array.from(viewport.children).forEach((element) => {
        if (isReadableAiElement(element)) spokenElements.current.add(element);
      });
    }

    function readLatestAfterToggle() {
      window.setTimeout(() => {
        if (!speakerEnabled()) {
          stopSpeech();
          return;
        }

        const viewport = findMessageViewport();
        const latest = viewport ? latestAiElement(viewport) : null;
        if (latest) {
          spokenElements.current.add(latest);
          speak(latest.innerText || latest.textContent || "", true);
        } else {
          speak(selectedSpeechLanguage().startsWith("ko") ? "음성 읽기가 켜졌습니다." : "Voice reading is on.", true);
        }
      }, 80);
    }

    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(SPEAKER_SELECTOR)) return;
      readLatestAfterToggle();
    }

    let scanTimer = 0;
    function scanNewAiAnswers() {
      window.clearTimeout(scanTimer);
      scanTimer = window.setTimeout(() => {
        if (!speakerEnabled()) return;
        const viewport = findMessageViewport();
        if (!viewport) return;

        const fresh = Array.from(viewport.children)
          .filter(isReadableAiElement)
          .filter((element) => !spokenElements.current.has(element));
        if (!fresh.length) return;

        const countThisTurn = aiCountAfterLatestUser(viewport);
        fresh.forEach((element, index) => {
          spokenElements.current.add(element);
          // RoomV3 already speaks a single Council final answer. Avoid duplicating
          // that one existing path, while still queueing normal provider answers.
          if (countThisTurn === 1 && index === 0 && (speech.speaking || speech.pending)) return;
          speak(element.innerText || element.textContent || "", false);
        });
      }, 120);
    }

    markCurrentAsSeen();
    document.addEventListener("click", onClick, false);
    const observer = new MutationObserver(scanNewAiAnswers);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("click", onClick, false);
      observer.disconnect();
      window.clearTimeout(scanTimer);
      stopSpeech();
    };
  }, []);

  return null;
}
