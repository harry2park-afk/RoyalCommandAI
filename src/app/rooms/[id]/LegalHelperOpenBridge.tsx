"use client";

import { useEffect } from "react";

function applyLargeLegalHelperLayout() {
  const image = document.querySelector<HTMLImageElement>('img[alt="Royal Command AI Helper"]');
  const imageWrap = image?.parentElement;
  const panel = imageWrap?.parentElement;
  const outer = panel?.parentElement;
  if (!(image instanceof HTMLImageElement) || !(imageWrap instanceof HTMLElement) || !(panel instanceof HTMLElement) || !(outer instanceof HTMLElement)) return false;

  outer.style.left = "245px";
  outer.style.right = "185px";
  outer.style.top = "225px";
  outer.style.bottom = "28px";
  outer.style.width = "auto";
  outer.style.maxWidth = "none";

  panel.style.width = "100%";
  panel.style.maxWidth = "100%";
  panel.style.height = "100%";
  panel.style.display = "grid";
  panel.style.gridTemplateColumns = "minmax(0, 1fr) 210px";
  panel.style.gridTemplateRows = "44px minmax(0, 1fr)";
  panel.style.overflow = "hidden";

  const title = panel.children[1];
  if (title instanceof HTMLElement) {
    title.style.gridColumn = "1";
    title.style.gridRow = "1";
    title.style.textAlign = "left";
    title.style.paddingLeft = "24px";
    title.style.fontSize = "18px";
  }

  imageWrap.style.gridColumn = "2";
  imageWrap.style.gridRow = "1 / span 2";
  imageWrap.style.width = "190px";
  imageWrap.style.height = "250px";
  imageWrap.style.margin = "48px auto 0";
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
  content.style.padding = "8px 24px 20px";

  const children = Array.from(content.children).filter((item): item is HTMLElement => item instanceof HTMLElement);
  const assistantText = children.find((item) => item.className.includes("whitespace-pre-wrap"));
  if (assistantText) {
    assistantText.style.flex = "1 1 auto";
    assistantText.style.minHeight = "150px";
    assistantText.style.maxHeight = "none";
    assistantText.style.overflowY = "auto";
    assistantText.style.fontSize = "18px";
    assistantText.style.lineHeight = "1.65";
    assistantText.style.padding = "14px 16px";
    assistantText.style.border = "1px solid rgba(215,182,77,.28)";
    assistantText.style.borderRadius = "12px";
    assistantText.style.background = "rgba(0,0,0,.16)";
  }

  const form = content.querySelector("form");
  const textarea = form?.querySelector("textarea");
  if (form instanceof HTMLFormElement) {
    form.style.marginTop = "10px";
  }
  if (textarea instanceof HTMLTextAreaElement) {
    textarea.rows = 5;
    textarea.style.minHeight = "128px";
    textarea.style.maxHeight = "180px";
    textarea.style.fontSize = "18px";
    textarea.style.lineHeight = "1.6";
    textarea.style.padding = "12px";
  }

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
