"use client";

import { useEffect, useRef, useState } from "react";

const FEMALE_VOICE_HINTS: Record<string, string[]> = {
  ko: ["SunHi", "Yumi", "Seoyeon", "Heami", "Sora", "Google 한국의", "Korean Female"],
  en: ["Aria", "Jenny", "Samantha", "Zira", "Karen", "Natasha", "Sonia", "Google UK English Female", "Female"],
  zh: ["Xiaoxiao", "Xiaoyi", "Huihui", "Yaoyao", "Tingting", "Chinese Female"],
  ja: ["Nanami", "Haruka", "Ayumi", "Kyoko", "Japanese Female"],
  es: ["Elvira", "Dalia", "Helena", "Monica", "Spanish Female"],
  fr: ["Denise", "Hortense", "Julie", "French Female"],
  de: ["Katja", "Hedda", "German Female"],
  vi: ["HoaiMy", "Vietnamese Female"],
  th: ["Premwadee", "Thai Female"],
  id: ["Gadis", "Indonesian Female"],
};

function localeKey(locale: string) {
  const lower = locale.toLowerCase();
  if (lower.startsWith("ko")) return "ko";
  if (lower.startsWith("zh")) return "zh";
  if (lower.startsWith("ja")) return "ja";
  if (lower.startsWith("es")) return "es";
  if (lower.startsWith("fr")) return "fr";
  if (lower.startsWith("de")) return "de";
  if (lower.startsWith("vi")) return "vi";
  if (lower.startsWith("th")) return "th";
  if (lower.startsWith("id")) return "id";
  return "en";
}

function selectYoungFemaleVoice(voices: SpeechSynthesisVoice[], locale: string) {
  const key = localeKey(locale);
  const hints = FEMALE_VOICE_HINTS[key] || FEMALE_VOICE_HINTS.en;
  const matchingLocale = voices.filter((voice) => voice.lang.toLowerCase().startsWith(key));
  const pool = matchingLocale.length ? matchingLocale : voices;

  for (const hint of hints) {
    const voice = pool.find((item) => item.name.toLowerCase().includes(hint.toLowerCase()));
    if (voice) return voice;
  }

  const natural = pool.find((voice) => /natural|neural|online/i.test(voice.name));
  return natural || pool[0] || null;
}

function helperIsVisible() {
  return Boolean(document.querySelector('img[alt="Royal Command AI Helper"]'));
}

export default function AIHelperVoiceBridge() {
  const streamRef = useRef<MediaStream | null>(null);
  const [micProblem, setMicProblem] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const synth = window.speechSynthesis;
    let voices = synth.getVoices();
    const refreshVoices = () => { voices = synth.getVoices(); };
    synth.addEventListener("voiceschanged", refreshVoices);

    const originalSpeak = synth.speak.bind(synth);
    const patchedSpeak = (utterance: SpeechSynthesisUtterance) => {
      if (helperIsVisible()) {
        refreshVoices();
        const chosen = selectYoungFemaleVoice(voices, utterance.lang || "en-AU");
        if (chosen) utterance.voice = chosen;
        utterance.rate = Math.max(0.98, Math.min(1.06, utterance.rate || 1));
        utterance.pitch = Math.max(1.06, utterance.pitch || 1.06);
        utterance.volume = 1;
      }
      originalSpeak(utterance);
    };
    (synth as typeof synth & { speak: (utterance: SpeechSynthesisUtterance) => void }).speak = patchedSpeak;

    const releaseMic = () => {
      const stream = streamRef.current;
      streamRef.current = null;
      stream?.getTracks().forEach((track) => track.stop());
    };

    const ensureMic = async () => {
      if (streamRef.current?.getAudioTracks().some((track) => track.readyState === "live")) {
        setMicProblem("");
        return true;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setMicProblem("Microphone is not available in this browser.");
        return false;
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
        releaseMic();
        streamRef.current = stream;
        setMicProblem("");
        return true;
      } catch (error) {
        const name = error instanceof DOMException ? error.name : "";
        setMicProblem(
          name === "NotAllowedError"
            ? "Microphone blocked — allow microphone access for royalcommand.ai in Chrome."
            : "No working microphone was detected. Check the Windows input microphone.",
        );
        return false;
      }
    };

    const onClickCapture = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest<HTMLButtonElement>("button");
      if (!button) return;
      const title = button.getAttribute("title") || "";
      const text = button.textContent?.trim() || "";

      if ((title === "AI Help" || text === "AI Help") && !helperIsVisible()) {
        void ensureMic();
      } else if (/Microphone off/i.test(title)) {
        void ensureMic();
      } else if (title === "Close" && helperIsVisible()) {
        window.setTimeout(releaseMic, 150);
      }
    };

    document.addEventListener("click", onClickCapture, true);

    const observer = new MutationObserver(() => {
      if (!helperIsVisible()) releaseMic();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("click", onClickCapture, true);
      observer.disconnect();
      synth.removeEventListener("voiceschanged", refreshVoices);
      (synth as typeof synth & { speak: (utterance: SpeechSynthesisUtterance) => void }).speak = originalSpeak;
      releaseMic();
    };
  }, []);

  if (!micProblem) return null;

  return (
    <div className="fixed bottom-20 right-[205px] z-[500] max-w-[340px] rounded-lg border border-amber-400/70 bg-[#160b0b]/95 px-3 py-2 text-[12px] leading-4 text-amber-100 shadow-2xl max-lg:right-4">
      {micProblem}
    </div>
  );
}
