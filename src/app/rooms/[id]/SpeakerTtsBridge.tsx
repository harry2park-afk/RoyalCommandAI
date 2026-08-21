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
  const voices = useRef<SpeechSynthesisVoice[]>([]);
  const queue = useRef<string[]>([]);
  const queueLanguage = useRef("ko-KR");
  const currentUtterance = useRef<SpeechSynthesisUtterance | null>(null);
  const generation = useRef(0);
  const clickTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const speech = window.speechSynthesis;

    const refreshVoices = () => {
      voices.current = speech.getVoices();
    };
    refreshVoices();
    speech.addEventListener("voiceschanged", refreshVoices);

    function stopAll() {
      generation.current += 1;
      queue.current = [];
      currentUtterance.current = null;
      if (clickTimer.current !== null) {
        window.clearTimeout(clickTimer.current);
        clickTimer.current = null;
      }
      speech.cancel();
    }

    function preferredVoice(lang: string) {
      const all = voices.current.length ? voices.current : speech.getVoices();
      const exact = all.filter((voice) => voice.lang.toLowerCase() === lang.toLowerCase());
      const prefix = lang.toLowerCase().split("-")[0];
      const sameLanguage = all.filter((voice) => voice.lang.toLowerCase().startsWith(prefix));
      return exact.find((voice) => voice.localService)
        || sameLanguage.find((voice) => voice.localService)
        || exact[0]
        || sameLanguage[0]
        || all.find((voice) => voice.default)
        || all[0]
        || null;
    }

    function speakNext(token: number) {
      if (token !== generation.current || !speakerEnabled()) return;
      const next = queue.current.shift();
      if (!next) {
        currentUtterance.current = null;
        return;
      }

      const utterance = new SpeechSynthesisUtterance(next);
      utterance.lang = queueLanguage.current;
      utterance.volume = 1;
      const isKorean = utterance.lang.toLowerCase().startsWith("ko");
      utterance.rate = isKorean ? 0.92 : 1;
      utterance.pitch = isKorean ? 0.98 : 1;
      const voice = preferredVoice(utterance.lang);
      if (voice) utterance.voice = voice;
      currentUtterance.current = utterance;

      utterance.onend = () => {
        if (token !== generation.current) return;
        currentUtterance.current = null;
        window.setTimeout(() => speakNext(token), 35);
      };
      utterance.onerror = () => {
        if (token !== generation.current) return;
        currentUtterance.current = null;
        window.setTimeout(() => speakNext(token), 60);
      };

      speech.resume();
      speech.speak(utterance);
    }

    function startFresh(text: string) {
      const lang = selectedSpeechLanguage();
      const chunks = splitSpeechText(text, lang);
      if (!chunks.length) return;

      // Cancel RoomV3's legacy one-piece utterance and make this chunked queue authoritative.
      generation.current += 1;
      const token = generation.current;
      speech.cancel();
      currentUtterance.current = null;
      queueLanguage.current = lang;
      queue.current = chunks;
      window.setTimeout(() => speakNext(token), 90);
    }

    function enqueue(text: string) {
      const lang = selectedSpeechLanguage();
      const chunks = splitSpeechText(text, lang);
      if (!chunks.length) return;

      queueLanguage.current = lang;
      if (currentUtterance.current === null && (speech.speaking || speech.pending)) {
        // Another TTS path is active (RoomV3 legacy Council read). Replace it with the reliable queue.
        startFresh(text);
        return;
      }

      queue.current.push(...chunks);
      if (currentUtterance.current === null) {
        generation.current += 1;
        const token = generation.current;
        window.setTimeout(() => speakNext(token), 30);
      }
    }

    function markCurrentAsSeen() {
      const viewport = findMessageViewport();
      if (!viewport) return;
      Array.from(viewport.children).forEach((element) => {
        if (isReadableAiElement(element)) spokenElements.current.add(element);
      });
    }

    function onSpeakerClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(SPEAKER_SELECTOR)) return;

      if (clickTimer.current !== null) window.clearTimeout(clickTimer.current);
      clickTimer.current = window.setTimeout(() => {
        clickTimer.current = null;
        if (!speakerEnabled()) {
          stopAll();
          return;
        }

        const viewport = findMessageViewport();
        const latest = viewport ? latestAiElement(viewport) : null;
        if (latest) {
          spokenElements.current.add(latest);
          startFresh(latest.innerText || latest.textContent || "");
        } else {
          startFresh(selectedSpeechLanguage().startsWith("ko") ? "음성 읽기가 켜졌습니다." : "Voice reading is on.");
        }
      }, 140);
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

        for (const element of fresh) {
          spokenElements.current.add(element);
          enqueue(element.innerText || element.textContent || "");
        }
      }, 140);
    }

    markCurrentAsSeen();
    document.addEventListener("click", onSpeakerClick, false);
    const observer = new MutationObserver(scanNewAiAnswers);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("click", onSpeakerClick, false);
      observer.disconnect();
      speech.removeEventListener("voiceschanged", refreshVoices);
      window.clearTimeout(scanTimer);
      stopAll();
    };
  }, []);

  return null;
}
