"use client";

import { useEffect } from "react";

type LegalUiLanguage = "en" | "ko" | "zh" | "ja" | "es" | "fr" | "de" | "vi" | "th" | "id";

const ACTION_LABELS: Record<LegalUiLanguage, { speak: string; send: string }> = {
  en: { speak: "Speak", send: "Send my words" },
  ko: { speak: "말하기", send: "내 말 올리기" },
  zh: { speak: "说话", send: "发送我的话" },
  ja: { speak: "話す", send: "自分の言葉を送る" },
  es: { speak: "Hablar", send: "Enviar mis palabras" },
  fr: { speak: "Parler", send: "Envoyer mes mots" },
  de: { speak: "Sprechen", send: "Meine Worte senden" },
  vi: { speak: "Nói", send: "Gửi lời của tôi" },
  th: { speak: "พูด", send: "ส่งคำพูดของฉัน" },
  id: { speak: "Bicara", send: "Kirim kata saya" },
};

const LISTENING_WORDS = [
  "listening", "듣고 있습니다", "正在聆听", "聞いています", "escuchando", "écoute", "ich höre", "đang nghe", "กำลังฟัง", "mendengarkan",
];

function detectRoomLanguage(): LegalUiLanguage {
  const selects = Array.from(document.querySelectorAll("select"));
  for (const select of selects) {
    const raw = `${select.value} ${select.options[select.selectedIndex]?.text || ""}`.toLowerCase();
    if (/\b(ko|kr|korean)\b|한국|한국어/.test(raw)) return "ko";
    if (/\b(zh|cn|chinese)\b|中文|中国/.test(raw)) return "zh";
    if (/\b(ja|jp|japanese)\b|日本/.test(raw)) return "ja";
    if (/\b(es|spanish)\b|español/.test(raw)) return "es";
    if (/\b(fr|french)\b|français/.test(raw)) return "fr";
    if (/\b(de|german)\b|deutsch/.test(raw)) return "de";
    if (/\b(vi|vietnamese)\b|tiếng việt/.test(raw)) return "vi";
    if (/\b(th|thai)\b|ไทย/.test(raw)) return "th";
    if (/\b(id|indonesian)\b|bahasa indonesia/.test(raw)) return "id";
    if (/\b(en|english)\b|영어/.test(raw)) return "en";
  }
  return "en";
}

function isListeningPlaceholder(value: string) {
  const text = value.toLowerCase();
  return LISTENING_WORDS.some((word) => text.includes(word.toLowerCase()));
}

function roomIdFromPath() {
  const match = window.location.pathname.match(/^\/rooms\/([^/]+)/);
  return match?.[1] || "";
}

function applyLargeLegalHelperLayout() {
  const image = document.querySelector<HTMLImageElement>('img[alt="Royal Command AI Helper"]');
  const imageWrap = image?.parentElement;
  const panel = imageWrap?.parentElement;
  const outer = panel?.parentElement;
  if (!(image instanceof HTMLImageElement) || !(imageWrap instanceof HTMLElement) || !(panel instanceof HTMLElement) || !(outer instanceof HTMLElement)) return false;

  const roomId = roomIdFromPath();
  if (!roomId) return false;

  outer.style.left = "245px";
  outer.style.right = "185px";
  outer.style.top = "198px";
  outer.style.bottom = "10px";
  outer.style.width = "auto";
  outer.style.maxWidth = "none";

  panel.style.width = "100%";
  panel.style.maxWidth = "100%";
  panel.style.height = "100%";
  panel.style.display = "grid";
  panel.style.gridTemplateColumns = "minmax(0, 1fr) 180px";
  panel.style.gridTemplateRows = "34px minmax(0, 1fr)";
  panel.style.overflow = "hidden";

  const title = panel.children[1];
  if (title instanceof HTMLElement) {
    title.style.gridColumn = "1";
    title.style.gridRow = "1";
    title.style.textAlign = "left";
    title.style.paddingLeft = "16px";
    title.style.paddingTop = "5px";
    title.style.fontSize = "17px";
  }

  imageWrap.style.gridColumn = "2";
  imageWrap.style.gridRow = "1 / span 2";
  imageWrap.style.width = "160px";
  imageWrap.style.height = "215px";
  imageWrap.style.margin = "38px auto 0";
  imageWrap.style.alignSelf = "start";
  image.style.objectFit = "contain";

  const content = imageWrap.nextElementSibling;
  if (!(content instanceof HTMLElement)) return true;
  content.style.gridColumn = "1";
  content.style.gridRow = "2";
  content.style.display = "flex";
  content.style.flexDirection = "column";
  content.style.minHeight = "0";
  content.style.height = "100%";
  content.style.padding = "0 16px 10px";
  content.style.gap = "2px";

  const children = Array.from(content.children).filter((item): item is HTMLElement => item instanceof HTMLElement);
  const assistantText = children.find((item) => item.className.includes("whitespace-pre-wrap"));
  const form = content.querySelector("form");
  const textarea = form?.querySelector("textarea");
  const submitButton = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
  const micButton = form?.querySelector<HTMLButtonElement>('button[type="button"]');
  const latestUser = children.find((item) => item.className.includes("line-clamp-2"));
  if (latestUser) latestUser.style.display = "none";

  for (const child of children) {
    if (child !== assistantText && child !== form) {
      child.style.flexShrink = "0";
      if (child.className.includes("my-3")) {
        child.style.marginTop = "1px";
        child.style.marginBottom = "1px";
      }
    }
  }

  if (!(textarea instanceof HTMLTextAreaElement) || !(assistantText instanceof HTMLElement) || !(form instanceof HTMLFormElement)) return true;

  assistantText.style.maxHeight = "none";
  assistantText.style.overflowY = "auto";
  assistantText.style.fontSize = "18px";
  assistantText.style.lineHeight = "1.65";
  assistantText.style.padding = "12px 14px";
  assistantText.style.border = "1px solid rgba(215,182,77,.28)";
  assistantText.style.borderRadius = "12px";
  assistantText.style.background = "rgba(0,0,0,.16)";
  assistantText.style.transition = "height 180ms ease, flex-basis 180ms ease, opacity 180ms ease";

  form.style.marginTop = "1px";
  form.style.transition = "height 180ms ease, flex-basis 180ms ease";

  textarea.rows = 5;
  textarea.style.width = "100%";
  textarea.style.maxHeight = "none";
  textarea.style.fontSize = "18px";
  textarea.style.lineHeight = "1.6";
  textarea.style.padding = "12px";
  textarea.style.overflowY = "auto";
  textarea.style.resize = "none";
  textarea.style.transition = "height 180ms ease";

  const syncActionLabels = () => {
    const labels = ACTION_LABELS[detectRoomLanguage()];
    if (micButton instanceof HTMLButtonElement) {
      micButton.style.width = "auto";
      micButton.style.minWidth = "84px";
      micButton.style.paddingLeft = "10px";
      micButton.style.paddingRight = "10px";
      micButton.style.gap = "6px";
      micButton.style.display = "inline-flex";
      micButton.style.alignItems = "center";
      micButton.style.justifyContent = "center";
      micButton.style.whiteSpace = "nowrap";
      let micLabel = micButton.querySelector<HTMLElement>('[data-legal-mic-label="1"]');
      if (!micLabel) {
        micLabel = document.createElement("span");
        micLabel.dataset.legalMicLabel = "1";
        micLabel.style.fontSize = "13px";
        micLabel.style.fontWeight = "700";
        micButton.appendChild(micLabel);
      }
      micLabel.textContent = labels.speak;
      micButton.title = labels.speak;
    }
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.style.width = "auto";
      submitButton.style.minWidth = "116px";
      submitButton.style.paddingLeft = "12px";
      submitButton.style.paddingRight = "12px";
      submitButton.style.gap = "6px";
      submitButton.style.display = "inline-flex";
      submitButton.style.alignItems = "center";
      submitButton.style.justifyContent = "center";
      submitButton.style.whiteSpace = "nowrap";
      let sendLabel = submitButton.querySelector<HTMLElement>('[data-legal-send-label="1"]');
      if (!sendLabel) {
        sendLabel = document.createElement("span");
        sendLabel.dataset.legalSendLabel = "1";
        sendLabel.style.fontSize = "13px";
        sendLabel.style.fontWeight = "700";
        submitButton.appendChild(sendLabel);
      }
      sendLabel.textContent = labels.send;
      submitButton.title = labels.send;
    }
  };
  syncActionLabels();

  if (panel.dataset.legalDynamicPanes === "2") return true;
  panel.dataset.legalDynamicPanes = "2";

  let paneMode: "user" | "ai" = "user";
  let previousUserText = textarea.value;
  let previousAiText = assistantText.textContent || "";
  let awaitingAnswer = false;
  let pendingEntryId = "";
  let pendingSummary = "";
  let assistantAtSubmit = "";
  let summaryTimer = 0;
  let recorder: MediaRecorder | null = null;
  let audioStream: MediaStream | null = null;
  let audioChunks: BlobPart[] = [];
  let recordingStarting = false;

  const stopTracks = () => {
    audioStream?.getTracks().forEach((track) => track.stop());
    audioStream = null;
  };

  const startAudioCapture = async () => {
    if (recordingStarting || recorder || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return;
    recordingStarting = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioStream = stream;
      audioChunks = [];
      const nextRecorder = new MediaRecorder(stream);
      recorder = nextRecorder;
      nextRecorder.ondataavailable = (event) => {
        if (event.data.size) audioChunks.push(event.data);
      };
      nextRecorder.start(500);
    } catch {
      stopTracks();
      recorder = null;
    } finally {
      recordingStarting = false;
    }
  };

  const stopAudioCapture = () => new Promise<Blob | null>((resolve) => {
    const current = recorder;
    recorder = null;
    if (!current || current.state === "inactive") {
      const blob = audioChunks.length ? new Blob(audioChunks, { type: "audio/webm" }) : null;
      audioChunks = [];
      stopTracks();
      resolve(blob);
      return;
    }
    const finish = () => {
      const type = current.mimeType || "audio/webm";
      const blob = audioChunks.length ? new Blob(audioChunks, { type }) : null;
      audioChunks = [];
      stopTracks();
      resolve(blob);
    };
    current.addEventListener("stop", finish, { once: true });
    try {
      current.stop();
    } catch {
      finish();
    }
  });

  const uploadAudio = async (blob: Blob | null, recordedAt: string) => {
    if (!blob || blob.size < 500) return null;
    const extension = blob.type.includes("ogg") ? "ogg" : blob.type.includes("mp4") ? "m4a" : "webm";
    const stamp = recordedAt.replace(/[:.]/g, "-");
    const file = new File([blob], `legal-story-${stamp}.${extension}`, { type: blob.type || "audio/webm" });
    const body = new FormData();
    body.set("roomId", roomId);
    body.set("file", file);
    try {
      const response = await fetch("/api/documents/upload", { method: "POST", body });
      const payload = await response.json().catch(() => ({})) as { document?: { id?: string } };
      return response.ok && payload.document?.id ? payload.document.id : null;
    } catch {
      return null;
    }
  };

  const patchSummary = async () => {
    if (!pendingEntryId || !pendingSummary.trim()) return;
    const entryId = pendingEntryId;
    const aiSummary = pendingSummary.trim();
    pendingEntryId = "";
    pendingSummary = "";
    awaitingAnswer = false;
    try {
      await fetch(`/api/rooms/${roomId}/legal-story`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, aiSummary }),
      });
      window.dispatchEvent(new CustomEvent("rc:legal-story-saved"));
    } catch {}
  };

  const scheduleSummarySave = () => {
    window.clearTimeout(summaryTimer);
    summaryTimer = window.setTimeout(() => void patchSummary(), 700);
  };

  const resize = () => {
    syncActionLabels();
    const userText = textarea.value;
    const aiText = assistantText.textContent || "";

    if (userText !== previousUserText) {
      previousUserText = userText;
      if (userText.trim()) paneMode = "user";
    }
    if (aiText !== previousAiText) {
      previousAiText = aiText;
      if (awaitingAnswer && aiText.trim() && aiText.trim() !== "…" && aiText !== assistantAtSubmit) {
        paneMode = "ai";
        pendingSummary = aiText;
        scheduleSummarySave();
      }
    }

    if (!awaitingAnswer && isListeningPlaceholder(textarea.placeholder)) {
      paneMode = "user";
      if (!recorder && !recordingStarting) void startAudioCapture();
    }

    const contentHeight = Math.max(430, content.clientHeight || 0);
    const fixedChildrenHeight = children
      .filter((item) => item !== assistantText && item !== form && item.style.display !== "none")
      .reduce((sum, item) => sum + item.getBoundingClientRect().height + 2, 0);
    const available = Math.max(300, contentHeight - fixedChildrenHeight - 4);

    if (paneMode === "user") {
      const assistantHeight = Math.max(52, Math.min(78, available * 0.14));
      const userHeight = Math.max(190, available - assistantHeight - 4);
      assistantText.style.flex = `0 0 ${Math.round(assistantHeight)}px`;
      assistantText.style.height = `${Math.round(assistantHeight)}px`;
      assistantText.style.minHeight = "52px";
      assistantText.style.opacity = "0.78";
      form.style.flex = `0 0 ${Math.round(userHeight)}px`;
      form.style.height = `${Math.round(userHeight)}px`;
      form.style.minHeight = "190px";
      textarea.style.height = `${Math.max(150, Math.round(userHeight - 18))}px`;
      textarea.style.minHeight = "150px";
    } else {
      const userHeight = Math.max(66, Math.min(92, available * 0.16));
      const assistantHeight = Math.max(190, available - userHeight - 4);
      form.style.flex = `0 0 ${Math.round(userHeight)}px`;
      form.style.height = `${Math.round(userHeight)}px`;
      form.style.minHeight = "66px";
      textarea.style.height = `${Math.max(42, Math.round(userHeight - 18))}px`;
      textarea.style.minHeight = "42px";
      assistantText.style.flex = `0 0 ${Math.round(assistantHeight)}px`;
      assistantText.style.height = `${Math.round(assistantHeight)}px`;
      assistantText.style.minHeight = "190px";
      assistantText.style.opacity = "1";
    }

    textarea.scrollTop = textarea.scrollHeight;
    assistantText.scrollTop = assistantText.scrollHeight;
  };

  const onSubmitCapture = (event: Event) => {
    if (!(event.target instanceof HTMLFormElement) || event.target !== form) return;
    const rawTranscript = textarea.value.trim();
    if (!rawTranscript) return;

    const recordedAt = new Date().toISOString();
    assistantAtSubmit = assistantText.textContent || "";
    paneMode = "ai";
    awaitingAnswer = true;
    pendingEntryId = "";
    pendingSummary = "";

    void (async () => {
      const audioBlob = await stopAudioCapture();
      const audioDocumentId = await uploadAudio(audioBlob, recordedAt);
      try {
        const response = await fetch(`/api/rooms/${roomId}/legal-story`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawTranscript, recordedAt, audioDocumentId }),
        });
        const payload = await response.json().catch(() => ({})) as { entry?: { id?: string } };
        if (response.ok && payload.entry?.id) {
          pendingEntryId = payload.entry.id;
          window.dispatchEvent(new CustomEvent("rc:legal-story-saved"));
          if (pendingSummary.trim()) scheduleSummarySave();
        }
      } catch {}
    })();
    resize();
  };

  form.addEventListener("submit", onSubmitCapture, true);
  textarea.addEventListener("input", resize);
  textarea.addEventListener("focus", () => {
    paneMode = "user";
    resize();
  });

  const observer = new MutationObserver(resize);
  observer.observe(assistantText, { childList: true, subtree: true, characterData: true });
  const interval = window.setInterval(resize, 140);
  const stop = () => {
    window.clearInterval(interval);
    window.clearTimeout(summaryTimer);
    observer.disconnect();
    form.removeEventListener("submit", onSubmitCapture, true);
    textarea.removeEventListener("input", resize);
    if (recorder && recorder.state !== "inactive") {
      try { recorder.stop(); } catch {}
    }
    recorder = null;
    stopTracks();
  };
  panel.addEventListener("DOMNodeRemovedFromDocument", stop, { once: true });
  resize();

  return true;
}

export default function LegalHelperOpenBridge() {
  useEffect(() => {
    let timer = 0;
    const open = () => {
      const button = Array.from(document.querySelectorAll<HTMLButtonElement>('button[title="AI Help"]'))
        .find((item) => item.offsetParent !== null);
      button?.click();

      let attempts = 0;
      const enlarge = () => {
        attempts += 1;
        if (applyLargeLegalHelperLayout() || attempts >= 20) return;
        timer = window.setTimeout(enlarge, 50);
      };
      timer = window.setTimeout(enlarge, 30);
    };
    window.addEventListener("rc:ai-helper-open", open);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("rc:ai-helper-open", open);
    };
  }, []);

  return null;
}
