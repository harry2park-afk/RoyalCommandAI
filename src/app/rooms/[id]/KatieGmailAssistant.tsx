"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mail,
  RefreshCw,
} from "lucide-react";

type GmailMessage = {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  important: boolean;
  todo: string | null;
};

type Connection = {
  connected: boolean;
  oauthConfigured: boolean;
  googleEmail: string | null;
};

const ACTION_WORDS =
  /(please|action|required|due|deadline|confirm|approve|invoice|payment|reply|respond|필요|확인|승인|납부|답장)/i;

function header(
  headers: Array<{ name?: string; value?: string }> | undefined,
  name: string,
) {
  return (
    headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())
      ?.value || ""
  );
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function summarize(value: unknown): GmailMessage {
  const payload = record(value);
  const messagePayload = record(payload.payload);
  const headers = Array.isArray(messagePayload.headers)
    ? (messagePayload.headers as Array<{ name?: string; value?: string }>)
    : [];
  const subject = header(headers, "Subject") || "(제목 없음)";
  const snippet = String(payload?.snippet || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 260);
  const labels = Array.isArray(payload.labelIds) ? payload.labelIds : [];
  const important =
    labels.includes("IMPORTANT") ||
    labels.includes("STARRED") ||
    ACTION_WORDS.test(`${subject} ${snippet}`);
  return {
    id: String(payload?.id || ""),
    from: header(headers, "From"),
    subject,
    date: header(headers, "Date"),
    snippet: snippet || "미리보기 내용이 없습니다.",
    important,
    todo: ACTION_WORDS.test(`${subject} ${snippet}`)
      ? `확인 필요: ${subject}`
      : null,
  };
}

export default function KatieGmailAssistant({ roomId }: { roomId: string }) {
  const endpoint = `/api/rooms/${encodeURIComponent(roomId)}/ai-secretary/gmail`;
  const [connection, setConnection] = useState<Connection | null>(null);
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draftFor, setDraftFor] = useState<GmailMessage | null>(null);
  const [draft, setDraft] = useState({ to: "", subject: "", body: "" });
  const [draftSaved, setDraftSaved] = useState(false);

  async function checkConnection() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          payload.error || "Gmail 연결 상태를 확인하지 못했습니다.",
        );
      setConnection(payload);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Gmail 연결 확인 실패",
      );
    } finally {
      setBusy(false);
    }
  }

  async function api(body: Record<string, unknown>) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(payload.error || "Gmail 요청에 실패했습니다.");
    return payload.result;
  }

  async function loadImportantMail() {
    setBusy(true);
    setError("");
    setDraftSaved(false);
    try {
      const list = await api({
        action: "search",
        query: "newer_than:14d (is:unread OR is:starred OR label:important)",
        maxResults: 12,
      });
      const ids = Array.isArray(list?.messages)
        ? list.messages
            .map((item: unknown) => String(record(item).id || ""))
            .filter(Boolean)
        : [];
      const rows = await Promise.all(
        ids.map((messageId: string) => api({ action: "message", messageId })),
      );
      setMessages(
        rows
          .map(summarize)
          .sort((a, b) => Number(b.important) - Number(a.important)),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "메일을 불러오지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function prepareDraft(message: GmailMessage) {
    const email = message.from.match(/<([^>]+)>/)?.[1] || message.from;
    setDraftFor(message);
    setDraft({
      to: email,
      subject: message.subject.startsWith("Re:")
        ? message.subject
        : `Re: ${message.subject}`,
      body: "",
    });
    setDraftSaved(false);
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/ai/helper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          selectedLanguage: "en",
          history: [],
          message: [
            "Write a concise, polite Australian English email reply draft for Harry.",
            "Return only the draft body. Do not send, forward or delete anything.",
            `From: ${message.from}`,
            `Subject: ${message.subject}`,
            `Email summary: ${message.snippet}`,
          ].join("\n"),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.answer)
        throw new Error(payload?.error || "답장 초안을 만들지 못했습니다.");
      setDraft((current) => ({
        ...current,
        body: String(payload.answer).trim(),
      }));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "답장 초안을 만들지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (!draft.to.trim() || !draft.subject.trim() || !draft.body.trim()) return;
    setBusy(true);
    setError("");
    setDraftSaved(false);
    try {
      await api({ action: "draft", ...draft });
      setDraftSaved(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "답장 초안을 저장하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-[#d7b64d]/35 bg-[#0b1728] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Mail className="text-[#f0d36a]" size={19} />
        <h3 className="font-bold text-[#f0d36a]">Katie Gmail 개인비서</h3>
        <button
          type="button"
          onClick={checkConnection}
          disabled={busy}
          className="ml-auto rounded-lg border border-white/15 px-3 py-2 text-xs hover:bg-white/5"
        >
          연결 상태 확인
        </button>
      </div>
      {connection ? (
        <div className="mt-3 flex items-center gap-2 text-sm">
          {connection.connected ? (
            <CheckCircle2 className="text-emerald-400" size={17} />
          ) : (
            <AlertTriangle className="text-amber-300" size={17} />
          )}
          <span>
            {connection.connected
              ? `${connection.googleEmail || "Gmail"} 연결됨`
              : "Gmail이 연결되지 않았습니다."}
          </span>
          {!connection.connected && connection.oauthConfigured ? (
            <a
              href="/api/tools/google/connect"
              className="rounded bg-blue-700 px-3 py-1.5 text-xs"
            >
              Gmail 연결
            </a>
          ) : null}
        </div>
      ) : null}
      {connection?.connected ? (
        <button
          type="button"
          onClick={loadImportantMail}
          disabled={busy}
          className="mt-3 flex items-center gap-2 rounded-lg bg-[#173663] px-4 py-2 text-sm text-[#ffe18a] disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <RefreshCw size={16} />
          )}
          중요 메일 불러오기
        </button>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-lg border border-red-400/30 bg-red-950/30 p-3 text-xs text-red-200">
          {error}
        </p>
      ) : null}
      {messages.length ? (
        <div className="mt-4 space-y-2">
          {messages.map((message) => (
            <article
              key={message.id}
              className="rounded-lg border border-white/10 bg-black/15 p-3"
            >
              <div className="flex gap-2">
                <span
                  className={`rounded px-2 py-0.5 text-[10px] ${message.important ? "bg-red-800 text-white" : "bg-white/10 text-white/60"}`}
                >
                  {message.important ? "중요" : "일반"}
                </span>
                <strong className="text-sm">{message.subject}</strong>
              </div>
              <p className="mt-1 text-xs text-white/50">
                {message.from} · {message.date}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/75">
                {message.snippet}
              </p>
              {message.todo ? (
                <p className="mt-2 text-xs text-amber-200">
                  해야 할 일: {message.todo}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => prepareDraft(message)}
                className="mt-3 rounded border border-[#d7b64d]/50 px-3 py-1.5 text-xs text-[#ffe18a]"
              >
                답장 초안 작성
              </button>
            </article>
          ))}
        </div>
      ) : null}
      {draftFor ? (
        <div className="mt-4 space-y-2 rounded-lg border border-white/10 p-3">
          <input
            aria-label="받는 사람"
            value={draft.to}
            onChange={(event) => setDraft({ ...draft, to: event.target.value })}
            className="w-full rounded border border-white/15 bg-black/20 p-2 text-sm"
          />
          <input
            aria-label="제목"
            value={draft.subject}
            onChange={(event) =>
              setDraft({ ...draft, subject: event.target.value })
            }
            className="w-full rounded border border-white/15 bg-black/20 p-2 text-sm"
          />
          <textarea
            aria-label="답장 내용"
            value={draft.body}
            onChange={(event) =>
              setDraft({ ...draft, body: event.target.value })
            }
            placeholder="Katie가 저장할 답장 초안을 입력하세요"
            className="min-h-28 w-full rounded border border-white/15 bg-black/20 p-2 text-sm"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={saveDraft}
              disabled={busy || !draft.body.trim()}
              className="rounded bg-[#7A0C2E] px-4 py-2 text-xs text-[#ffe18a] disabled:opacity-40"
            >
              Gmail 초안으로 저장
            </button>
            {draftSaved ? (
              <span className="text-xs text-emerald-300">초안 저장 완료</span>
            ) : null}
          </div>
          <p className="text-xs text-amber-200">
            발송·삭제·전달 기능은 잠겨 있습니다. Harry 승인 없이는 실행되지
            않습니다.
          </p>
        </div>
      ) : null}
    </section>
  );
}
