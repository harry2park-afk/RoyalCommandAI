"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import ProtectedLayoutEditor from "@/components/ProtectedLayoutEditor";

export default function SecureProtectedLayoutEditor() {
  const pathname = usePathname();
  const roomPage = /^\/rooms\/[^/]+\/?$/.test(pathname || "");
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!roomPage) { setAllowed(false); return; }
    const requested = new URLSearchParams(window.location.search).get("layoutEdit") === "1";
    if (!requested) { setAllowed(false); return; }

    let cancelled = false;
    void fetch("/api/layout-editor/security", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => {
        if (cancelled) return;
        if (data?.trusted === true && data?.unlocked === true) {
          setAllowed(true);
          return;
        }
        window.location.replace("/layout-editor");
      })
      .catch(() => { if (!cancelled) window.location.replace("/layout-editor"); });

    const timer = window.setInterval(() => {
      const stillEditing = new URLSearchParams(window.location.search).get("layoutEdit") === "1";
      if (stillEditing) return;
      window.clearInterval(timer);
      setAllowed(false);
      void fetch("/api/layout-editor/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lock" }),
      }).catch(() => undefined);
    }, 500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [roomPage, pathname]);

  if (!allowed) return null;
  return <ProtectedLayoutEditor />;
}
