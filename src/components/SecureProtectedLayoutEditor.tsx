"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import ProtectedLayoutEditor from "@/components/ProtectedLayoutEditor";

export default function SecureProtectedLayoutEditor() {
  const pathname = usePathname();
  const roomPage = /^\/rooms\/[^/]+\/?$/.test(pathname || "");
  const commandCenter = pathname === "/rooms/rca";
  const [allowed, setAllowed] = useState(false);
  const [adminTrusted, setAdminTrusted] = useState(false);

  useEffect(() => {
    if (!roomPage) return;
    const requested = new URLSearchParams(window.location.search).get("layoutEdit") === "1";

    let cancelled = false;
    void fetch("/api/layout-editor/security", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => {
        if (cancelled) return;
        setAdminTrusted(data?.admin === true && data?.trusted === true);
        if (!requested) return;
        if (data?.trusted === true && data?.unlocked === true) {
          setAllowed(true);
          return;
        }
        window.location.replace("/layout-editor");
      })
      .catch(() => {
        if (!cancelled && requested) window.location.replace("/layout-editor");
      });

    if (!requested) return () => { cancelled = true; };

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

  const requested = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("layoutEdit") === "1"
    : false;

  return (
    <>
      {commandCenter && adminTrusted && !requested ? (
        <button
          type="button"
          onClick={() => window.location.assign("/layout-editor")}
          className="fixed bottom-4 left-4 z-[220] rounded-lg border border-[#d7b64d]/70 bg-[#101827] px-3 py-2 text-xs font-semibold text-[#f4d66c] shadow-lg"
          title="Edit Command Center buttons"
          data-rc-command-center-edit-launcher="true"
        >
          Edit Buttons
        </button>
      ) : null}
      {roomPage && allowed ? <ProtectedLayoutEditor /> : null}
    </>
  );
}
