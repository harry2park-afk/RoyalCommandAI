"use client";

import { useEffect } from "react";

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
  useEffect(() => {
    if (typeof window === "undefined") return;

    const synth = window.speechSynthesis;
    let greetingPending = false;
    let activeAudio: HTMLAudioElement | null = null;
    let activeUrl = "";

    const originalSpeak = synth.speak.bind(synth);
    const originalCancel = synth.cancel.bind(synth);

    const stopGeneratedAudio = () => {
      const audio = activeAudio;
      activeAudio = null;
      if (audio) {
        audio.onplay = null;
        audio.onended = null;
        audio.onerror = null;
        try { audio.pause(); } catch {}
        try { audio.removeAttribute("src"); } catch {}
      }
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
        activeUrl = "";
      }
    };

    const patchedSpeak = (utterance: SpeechSynthesisUtterance) => {
      const useRoyalVoice = helperIsVisible() || greetingPending;
      if (!useRoyalVoice) {
        originalSpeak(utterance);
        return;
      }

      const isGreeting = greetingPending;
      greetingPending = false;

      // Critical: there must be exactly one voice path for AI Help.
      // Cancel any queued browser TTS and never fall back to it.
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

          if (!response.ok) throw new Error("Royal Command voice request failed");

          const blob = await response.blob();
          activeUrl = URL.createObjectURL(blob);
          const audio = new Audio(activeUrl);
          activeAudio = audio;
          audio.preload = "auto";
          audio.volume = 1;

          audio.onplay = () => fireUtteranceEvent(utterance.onstart, utterance, "start");
          audio.onended = () => {
            // Detach handlers before cleanup so clearing src cannot trigger an error fallback.
            audio.onplay = null;
            audio.onended = null;
            audio.onerror = null;
            stopGeneratedAudio();
            fireUtteranceEvent(utterance.onend, utterance, "end");
          };
          audio.onerror = () => {
            audio.onplay = null;
            audio.onended = null;
            audio.onerror = null;
            stopGeneratedAudio();
            fireUtteranceEvent(utterance.onerror, utterance, "error");
          };

          await audio.play();
        } catch {
          stopGeneratedAudio();
          // Intentionally NO browser-TTS fallback. One youthful AI voice only.
          fireUtteranceEvent(utterance.onerror, utterance, "error");
        }
      })();
    };

    const patchedCancel = () => {
      stopGeneratedAudio();
      originalCancel();
    };

    (synth as typeof synth & { speak: (utterance: SpeechSynthesisUtterance) => void }).speak = patchedSpeak;
    (synth as typeof synth & { cancel: () => void }).cancel = patchedCancel;

    const onClickCapture = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest<HTMLButtonElement>("button");
      if (!button) return;
      const title = button.getAttribute("title") || "";
      const text = button.textContent?.trim() || "";

      if ((title === "AI Help" || text === "AI Help") && !helperIsVisible()) {
        greetingPending = true;
      } else if (title === "Close" && helperIsVisible()) {
        stopGeneratedAudio();
      }
    };

    document.addEventListener("click", onClickCapture, true);

    return () => {
      document.removeEventListener("click", onClickCapture, true);
      stopGeneratedAudio();
      (synth as typeof synth & { speak: (utterance: SpeechSynthesisUtterance) => void }).speak = originalSpeak;
      (synth as typeof synth & { cancel: () => void }).cancel = originalCancel;
    };
  }, []);

  return null;
}
