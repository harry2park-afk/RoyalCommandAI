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

function splitSpeechText(text: string, lang: string) {
  const clean = cleanSpeechText(text).slice(0, 12000);
  if (!clean) return [];

  const maxLength = lang.toLowerCase().startsWith("ko") ? 90 : 180;
  const sentences = clean.match(/[^.!?。！？]+[.!?。！？]?/g) || [clean];
  const chunks: string[] = [];
  let current = "";

  const pushCurrent = () => {
    const value = current.trim();
    if (value) chunks.push(value);
    current = "";
  };

  for (const sentenceRaw of sentences) {
    let sentence = sentenceRaw.trim();
    while (sentence.length > maxLength) {
      if (current) pushCurrent();
      let splitAt = sentence.lastIndexOf(" ", maxLength);
      if (splitAt < Math.floor(maxLength * 0.55)) splitAt = maxLength;
      chunks.push(sentence.slice(0, splitAt).trim());
      sentence = sentence.slice(splitAt).trim();
    }
    if (!sentence) continue;
    if (current && current.length + 1 + sentence.length > maxLength) pushCurrent();
    current = current ? `${current} ${sentence}` : sentence;
  }

  pushCurrent();
  return chunks;
}

export default function SpeakerTtsBridge() {
  const spokenElements = useRef(new WeakSet<HTMLElement>());
  const queue = useRef<Array<{ text: string; lang: string }>>([]);
  const speaking = useRef(false);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const speech = window.speechSynthesis;

    function speakNext() {
      if (speaking.current || !speakerEnabled()) return;
      const next = queue.current.shift();
      if (!next) return;

      speaking.current = true;
      const utterance = new SpeechSynthesisUtterance(next.text);
      utterance.lang = next.lang;
      utterance.volume = 1;
      utterance.rate = next.lang.toLowerCase().startsWith("ko") ? 0.92 : 1;
      utterance.pitch = next.lang.toLowerCase().startsWith("ko") ? 0.98 : 1;

      const finish = () => {
        speaking.current = false;
        window.setTimeout(speakNext, 30);
      };
      utterance.onend = finish;
      utterance.onerror = (event) => {
        console.warn("Command Room auto-read TTS error:", event.error);
        finish();
      };

      // Do not cancel or replace RoomV3 speech. The actual speaker button remains
      // the owner of click-to-read; this bridge only queues newly displayed AI replies.
      speech.speak(utterance);
    }

    function enqueue(text: string) {
      const lang = selectedSpeechLanguage();
      const chunks = splitSpeechText(text, lang);
      if (!chunks.length) return;
      queue.current.push(...chunks.map((chunk) => ({ text: chunk, lang })));
      speakNext();
    }

    function markCurrentAsSeen() {
      const viewport = findMessageViewport();
      if (!viewport) return;
      Array.from(viewport.children).forEach((element) => {
        if (isReadableAiElement(element)) spokenElements.current.add(element);
      });
    }

    let scanTimer = 0;
    function scanNewAiAnswers() {
      window.clearTimeout(scanTimer);
      scanTimer = window.setTimeout(() => {
        if (!speakerEnabled()) {
          queue.current = [];
          return;
        }

        const viewport = findMessageViewport();
        if (!viewport) return;
        const fresh = Array.from(viewport.children)
          .filter(isReadableAiElement)
          .filter((element) => !spokenElements.current.has(element));

        for (const element of fresh) {
          spokenElements.current.add(element);
          enqueue(element.innerText || element.textContent || "");
        }
      }, 120);
    }

    markCurrentAsSeen();
    const observer = new MutationObserver(scanNewAiAnswers);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      window.clearTimeout(scanTimer);
      queue.current = [];
      speaking.current = false;
    };
  }, []);

  return null;
}
