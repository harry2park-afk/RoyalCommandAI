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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function applyLargeLegalHelperLayout() {
  const image = document.querySelector<HTMLImageElement>('img[alt="Royal Command AI Helper"]');
  const imageWrap = image?.parentElement;
  const panel = imageWrap?.parentElement;
  const outer = panel?.parentElement;
  if (!(image instanceof HTMLImageElement) || !(imageWrap instanceof HTMLElement) || !(panel instanceof HTMLElement) || !(outer instanceof HTMLElement)) return false;

  outer.style.left = "245px";
  outer.style.right = "185px";
  outer.style.top = "210px";
  outer.style.bottom = "14px";
  outer.style.width = "auto";
  outer.style.maxWidth = "none";

  panel.style.width = "100%";
  panel.style.maxWidth = "100%";
  panel.style.height = "100%";
  panel.style.display = "grid";
  panel.style.gridTemplateColumns = "minmax(0, 1fr) 190px";
  panel.style.gridTemplateRows = "38px minmax(0, 1fr)";
  panel.style.overflow = "hidden";

  const title = panel.children[1];
  if (title instanceof HTMLElement) {
    title.style.gridColumn = "1";
    title.style.gridRow = "1";
    title.style.textAlign = "left";
    title.style.paddingLeft = "20px";
    title.style.paddingTop = "8px";
    title.style.fontSize = "17px";
  }

  imageWrap.style.gridColumn = "2";
  imageWrap.style.gridRow = "1 / span 2";
  imageWrap.style.width = "170px";
  imageWrap.style.height = "225px";
  imageWrap.style.margin = "42px auto 0";
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
  content.style.padding = "2px 20px 14px";
  content.style.gap = "4px";

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
        child.style.marginTop = "3px";
        child.style.marginBottom = "3px";
      }
    }
  }

  if (assistantText) {
    assistantText.style.flex = "1 1 auto";
    assistantText.style.minHeight = "110px";
    assistantText.style.maxHeight = "none";
    assistantText.style.overflowY = "auto";
    assistantText.style.fontSize = "18px";
    assistantText.style.lineHeight = "1.65";
    assistantText.style.padding = "12px 14px";
    assistantText.style.border = "1px solid rgba(215,182,77,.28)";
    assistantText.style.borderRadius = "12px";
    assistantText.style.background = "rgba(0,0,0,.16)";
  }

  if (form instanceof HTMLFormElement) {
    form.style.marginTop = "2px";
    form.style.flex = "0 0 150px";
    form.style.minHeight = "118px";
    form.style.transition = "flex-basis 180ms ease";
  }

  if (!(textarea instanceof HTMLTextAreaElement) || !(assistantText instanceof HTMLElement) || !(form instanceof HTMLFormElement)) return true;

  textarea.rows = 5;
  textarea.style.width = "100%";
  textarea.style.height = "130px";
  textarea.style.minHeight = "110px";
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

  if (panel.dataset.legalDynamicPanes === "1") return true;
  panel.dataset.legalDynamicPanes = "1";

  let previousUserText = textarea.value;
  let previousAiText = assistantText.textContent || "";
  let lastUserChange = 0;
  let lastAiChange = 0;

  const resize = () => {
    syncActionLabels();
    const now = Date.now();
    const userText = textarea.value;
    const aiText = assistantText.textContent || "";
    if (userText !== previousUserText) {
      previousUserText = userText;
      lastUserChange = now;
    }
    if (aiText !== previousAiText) {
      previousAiText = aiText;
      lastAiChange = now;
    }

    const contentHeight = Math.max(430, content.clientHeight || 0);
    const fixedChildrenHeight = children
      .filter((item) => item !== assistantText && item !== form && item.style.display !== "none")
      .reduce((sum, item) => sum + item.getBoundingClientRect().height + 4, 0);
    const available = Math.max(300, contentHeight - fixedChildrenHeight - 10);
    const userRecentlyActive = now - lastUserChange < 1400;
    const aiRecentlyActive = now - lastAiChange < 1800;

    const naturalUserHeight = clamp(textarea.scrollHeight + 20, 118, Math.max(150, available * 0.7));
    const naturalAiHeight = clamp(assistantText.scrollHeight + 18, 110, Math.max(150, available * 0.78));

    let userHeight: number;
    if (userRecentlyActive && !aiRecentlyActive) {
      userHeight = clamp(naturalUserHeight, 150, available * 0.68);
    } else if (aiRecentlyActive && !userRecentlyActive) {
      userHeight = clamp(naturalUserHeight, 118, available * 0.34);
    } else {
      const desiredShare = naturalUserHeight / Math.max(1, naturalUserHeight + naturalAiHeight);
      userHeight = clamp(available * desiredShare, 125, available * 0.58);
    }

    const assistantHeight = Math.max(110, available - userHeight);
    form.style.flexBasis = `${Math.round(userHeight)}px`;
    textarea.style.height = `${Math.max(100, Math.round(userHeight - 18))}px`;
    assistantText.style.flexBasis = `${Math.round(assistantHeight)}px`;
    assistantText.style.height = `${Math.round(assistantHeight)}px`;

    textarea.scrollTop = textarea.scrollHeight;
    assistantText.scrollTop = assistantText.scrollHeight;
  };

  textarea.addEventListener("input", resize);
  textarea.addEventListener("focus", () => {
    lastUserChange = Date.now();
    resize();
  });
  const observer = new MutationObserver(resize);
  observer.observe(assistantText, { childList: true, subtree: true, characterData: true });
  const interval = window.setInterval(resize, 160);
  const stop = () => {
    window.clearInterval(interval);
    observer.disconnect();
    textarea.removeEventListener("input", resize);
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
