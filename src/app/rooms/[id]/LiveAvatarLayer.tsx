"use client";

import { useEffect, useState } from "react";

type Position = { left: number; top: number; width: number; height: number };

type LiveAvatarState = {
  configured: boolean;
  url?: string;
};

function findHelperPortrait() {
  return document.querySelector<HTMLImageElement>('img[alt="Royal Command AI Helper"]');
}

export default function LiveAvatarLayer() {
  const [live, setLive] = useState<LiveAvatarState | null>(null);
  const [position, setPosition] = useState<Position | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/avatar/liveavatar/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!cancelled) {
          setLive({
            configured: Boolean(payload?.configured && payload?.url),
            url: payload?.url ? String(payload.url) : undefined,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setLive({ configured: false });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!live?.configured || !live.url) return;

    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const portrait = findHelperPortrait();
        if (!portrait || portrait.offsetParent === null) {
          setPosition(null);
          return;
        }
        const rect = portrait.getBoundingClientRect();
        if (rect.width < 40 || rect.height < 40) {
          setPosition(null);
          return;
        }
        setPosition({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
      });
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    const timer = window.setInterval(sync, 300);
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.clearInterval(timer);
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [live]);

  if (!live?.configured || !live.url || !position) return null;

  return (
    <div
      className="fixed z-[385] overflow-hidden bg-[#07111f]"
      style={{
        left: position.left,
        top: position.top,
        width: position.width,
        height: position.height,
      }}
    >
      <iframe
        src={live.url}
        title="Royal Command LiveAvatar"
        allow="microphone; camera; autoplay"
        className="h-full w-full border-0 bg-transparent"
      />
    </div>
  );
}
