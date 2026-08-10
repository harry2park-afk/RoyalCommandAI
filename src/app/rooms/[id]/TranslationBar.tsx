"use client";

import { FormEvent, useState } from "react";

const LANGUAGES = [
  { code: "ko", label: "한국어" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
] as const;

export default function TranslationBar() {
  const [text, setText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("ko");
  const [translated, setTranslated] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function translate(e?: FormEvent) {
    e?.preventDefault();
    const clean = text.trim();
    if (!clean || loading) return;

    setLoading(true);
    setError("");
    setTranslated("");

    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean, targetLanguage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Translation failed");
      setTranslated(data.translation || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-4 md:px-6">
      <div className="rounded-2xl border border-[var(--gold)]/35 bg-black/25 p-3">
        <form onSubmit={translate} className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="shrink-0 text-sm font-semibold text-[var(--gold-soft)]">번역</div>
          <select
            className="rc-input w-full md:w-36"
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            aria-label="Translation target language"
          >
            {LANGUAGES.map((language) => (
              <option key={language.code} value={language.code}>
                {language.label}
              </option>
            ))}
          </select>
          <input
            className="rc-input min-w-0 flex-1"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="번역할 문장을 붙여넣거나 입력하세요"
          />
          <button type="submit" className="rc-btn rc-btn-primary shrink-0" disabled={loading || !text.trim()}>
            {loading ? "번역 중…" : "번역하기"}
          </button>
        </form>
        {translated ? (
          <div className="mt-3 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm leading-6">
            {translated}
          </div>
        ) : null}
        {error ? <p className="mt-2 text-sm text-[var(--danger)]">{error}</p> : null}
      </div>
    </section>
  );
}
