"use client";

import { useEffect, useState } from "react";

const FEMALE_VOICE_HINTS: Record<string, string[]> = {
  ko: ["SunHi", "Yumi", "Seoyeon", "Heami", "Sora", "Korean Female"],
  en: ["Aria", "Jenny", "Samantha", "Zira", "Karen", "Natasha", "Sonia", "Female"],
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

function selectFallbackFemaleVoice(voices: SpeechSynthesisVoice[], locale: string) {
  const key = localeKey(locale);
  const hints = FEMALE_VOICE_HINTS[key] || FEMALE_VOICE_HINTS.en;
  const matchingLocale = voices.filter((voice) => voice.lang.toLowerCase().startsWith(key));
  const pool = matchingLocale.length ? matchingLocale : voices;

  for (const hint of hints) {
    const voice = pool.find((item) => item.name.toLowerCase().includes(hint.toLowerCase()));
    if (voice) return voice;
  }

  return pool.find((voice) => /natural|neural|online/i.test(voice.name)) || pool[0] || null;
}

function helperIsVisible() {
  return Boolean(document.querySelector('img[alt="Royal Command AI Helper"]'));
}

function fireUtteranceEvent(
  handler: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any) | null,
  utterance: SpeechSynthesisUtterance,
  type: "start" | "end" | "error",
) {
  if (!handler) return;
  try {
    handler.call(utterance, new Event(type) as unknown as SpeechSynthesisEvent);
  } catch {}
}

export default function AIHelperVoiceBridge() {
  const [micProblem, setMicProblem] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const synth = window.speechSynthesis;
    let voices = synth.getVoices();
    let greetingPending = false;
    let activeAudio: HTMLAudioElement | null = null;
    let activeUrl = "";

    const refreshVoices = () => { voices = synth.getVoices(); };
    synth.addEventListener("voiceschanged", refreshVoices);

    const originalSpeak = synth.speak.bind(synth);
    const originalCancel = synth.cancel.bind(synth);

    const stopGeneratedAudio = () => {
      if (activeAudio) {
        try { activeAudio.pause(); } catch {}
        activeAudio.src = "";
        activeAudio = null;
      }
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
        activeUrl = "";
      }
    };

    const fallbackSpeak = (utterance: SpeechSynthesisUtterance) => {
      refreshVoices();
      const chosen = selectFallbackFemaleVoice(voices, utterance.lang || "en-AU");
      if (chosen) utterance.voice = chosen;
      utterance.rate = greetingPending ? 1.06 : 1.0;
      utterance.pitch = greetingPending ? 1.12 : 1.06;
      utterance.volume = 1;
      originalSpeak(utterance);
    };

    const patchedSpeak = (utterance: SpeechSynthesisUtterance) => {
      const useRoyalVoice = helperIsVisible() || greetingPending;
      if (!useRoyalVoice) {
        originalSpeak(utterance);
        return;
      }

      const isGreeting = greetingPending;
      greetingPending = false;
      stopGeneratedAudio();
      originalCancel();

      void (async () => {
        try {
          const response = await fetch("/api/ai/helper/speech", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: utterance.text,
              language: utterance.lang || document.documentElement.lang || "en",
              greeting: isGreeting,
            }),
          });
          if (!response.ok) throw new Error("Natural voice request failed");

          const blob = await response.blob();
          activeUrl = URL.createObjectURL(blob);
          const audio = new Audio(activeUrl);
          activeAudio = audio;
          audio.preload = "auto";
          audio.volume = 1;

          audio.onplay = () => fireUtteranceEvent(utterance.onstart, utterance, "start");
          audio.onended = () => {
            stopGeneratedAudio();
            fireUtteranceEvent(utterance.onend, utterance, "end");
          };
          audio.onerror = () => {
            stopGeneratedAudio();
            fallbackSpeak(utterance);
          };

          await audio.play();
        } catch {
          stopGeneratedAudio();
          fallbackSpeak(utterance);
        }
      })();
    };

    const patchedCancel = () => {
      stopGeneratedAudio();
      originalCancel();
    };

    (synth as typeof synth & { speak: (utterance: SpeechSynthesisUtterance) => void }).speak = patchedSpeak;
    (synth as typeof synth & { cancel: () => void }).cancel = patchedCancel;

    const describeMicError = (error: unknown, audioInputs: MediaDeviceInfo[]) => {
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        return "Microphone blocked — click the site controls beside the address bar and allow Microphone for royalcommand.ai.";
      }
      if (name === "NotFoundError" || audioInputs.length === 0) {
        return "No microphone input device is connected. Connect a headset/earphone microphone or an external microphone, then try again.";
      }
      if (name === "NotReadableError" || name === "AbortError") {
        return "A microphone exists but Windows cannot give it to Chrome. Check Windows Sound > Input and close any app that may be using the microphone exclusively.";
      }
      return "The microphone could not start. Check Chrome microphone permission and Windows Sound > Input.";
    };

    const ensureMic = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMicProblem("Microphone is not available in this browser.");
        return false;
      }

      let devices: MediaDeviceInfo[] = [];
      try {
        devices = await navigator.mediaDevices.enumerateDevices();
      } catch {}
      let audioInputs = devices.filter((device) => device.kind === "audioinput");

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false,
        });
        // Permission/health check only. Release immediately so Web Speech recognition can own the mic.
        stream.getTracks().forEach((track) => track.stop());
        setMicProblem("");
        return true;
      } catch (firstError) {
        try {
          devices = await navigator.mediaDevices.enumerateDevices();
          audioInputs = devices.filter((device) => device.kind === "audioinput");
        } catch {}

        for (const device of audioInputs) {
          if (!device.deviceId || device.deviceId === "default") continue;
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                deviceId: { exact: device.deviceId },
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
              video: false,
            });
            stream.getTracks().forEach((track) => track.stop());
            setMicProblem("");
            return true;
          } catch {}
        }

        setMicProblem(describeMicError(firstError, audioInputs));
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
        greetingPending = true;
        void ensureMic();
      } else if (/Microphone off/i.test(title)) {
        void ensureMic();
      } else if (title === "Close" && helperIsVisible()) {
        setMicProblem("");
        stopGeneratedAudio();
      }
    };

    document.addEventListener("click", onClickCapture, true);

    return () => {
      document.removeEventListener("click", onClickCapture, true);
      synth.removeEventListener("voiceschanged", refreshVoices);
      stopGeneratedAudio();
      (synth as typeof synth & { speak: (utterance: SpeechSynthesisUtterance) => void }).speak = originalSpeak;
      (synth as typeof synth & { cancel: () => void }).cancel = originalCancel;
    };
  }, []);

  if (!micProblem) return null;

  return (
    <div className="fixed bottom-20 right-[205px] z-[500] max-w-[340px] rounded-lg border border-amber-400/70 bg-[#160b0b]/95 px-3 py-2 text-[12px] leading-4 text-amber-100 shadow-2xl max-lg:right-4">
      {micProblem}
    </div>
  );
}
