"use client";

import { useEffect } from "react";

export default function LegalHelperOpenBridge() {
  useEffect(() => {
    const open = () => {
      const button = Array.from(document.querySelectorAll<HTMLButtonElement>('button[title="AI Help"]'))
        .find((item) => item.offsetParent !== null);
      button?.click();
    };
    window.addEventListener("rc:ai-helper-open", open);
    return () => window.removeEventListener("rc:ai-helper-open", open);
  }, []);

  return null;
}
