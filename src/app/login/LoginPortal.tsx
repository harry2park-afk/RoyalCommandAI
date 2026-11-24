"use client";

import { type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resolveGlobalLocale } from "@/lib/locale/globalLocaleCore";
import "./portal.css";
import { loginPortalText } from "@/lib/locale/login-portal";

const subscribe = (callback: () => void) => {
  const query = window.matchMedia("(min-width: 761px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
};
const snapshot = () => window.matchMedia("(min-width: 761px)").matches;
const serverSnapshot = () => null;
const subscribeLocale = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("royalcommand:language-change", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("royalcommand:language-change", callback); };
};
const readLocale = () => {
  try { return resolveGlobalLocale({ explicitUiLocale: localStorage.getItem("royalcommand:selected-language") || localStorage.getItem("royalcommand:ui-locale") }).locale; }
  catch { return "en-US"; }
};

export default function LoginPortal({ mobile, form }: { mobile: ReactNode; form: ReactNode }) {
  const wide = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const locale = useSyncExternalStore(subscribeLocale, readLocale, () => "en-US");
  const korean = locale.startsWith("ko");
  const t = (key: Parameters<typeof loginPortalText>[0]) => loginPortalText(key, locale);
  const router = useRouter();
  const params = useSearchParams();
  const dialog = useRef<HTMLDialogElement>(null);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/auth/me", { cache: "no-store", signal: abort.signal })
      .then(async response => response.ok ? response.json() : null)
      .then(data => setSignedIn(Boolean(data?.user?.id && data.user.mode === "supabase")))
      .catch(() => {});
    return () => abort.abort();
  }, []);
  if (wide === null) return <div aria-busy="true" className="rc-login-loading">Loading…</div>;
  if (!wide) return mobile;
  const enter = () => {
    if (!signedIn) { dialog.current?.showModal(); return; }
    const next = params.get("next");
    router.push(next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/rcv3");
  };
  return <div className="rc-login-portal">
    <header><Link href="/" aria-label="Royal Command home">RC<span>Royal Command</span></Link>
      <select aria-label="Language" value={korean ? "ko" : "en"} onChange={event => {
        try {
          localStorage.setItem("royalcommand:selected-language", event.target.value);
          window.dispatchEvent(new Event("royalcommand:language-change"));
        } catch { /* Browser storage can be unavailable. */ }
      }}><option value="en">English</option><option value="ko">한국어</option></select>
    </header>
    <div className="rc-login-caption"><h1>{t("title")}</h1><p>{t("subtitle")}</p></div>
    <div className="rc-login-actions"><button onClick={enter}>{signedIn ? (t("enter")) : (t("login"))}</button>
      {!signedIn && <p>{t("new")} <Link href="/signup">{t("signup")}</Link></p>}
    </div>
    <dialog ref={dialog} aria-label="Login" className="rc-login-dialog"><button className="rc-login-close" aria-label="Close" onClick={() => dialog.current?.close()}>×</button>{form}</dialog>
  </div>;
}
