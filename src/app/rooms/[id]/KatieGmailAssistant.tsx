"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Loader2, Mail, RefreshCw } from "lucide-react";

type Attachment = { filename: string; mimeType: string; size: number; attachmentId: string };
type GmailMessage = {
  id: string; threadId: string; from: string; to: string; subject: string; date: string; snippet: string; original: string;
  labelIds: string[]; messageIdHeader: string; references: string; attachments: Attachment[];
};
type Connection = { connected: boolean; oauthConfigured: boolean; googleEmail: string | null };

const ACTION_WORDS = /(please|action|required|due|deadline|confirm|approve|invoice|payment|reply|respond|필요|확인|승인|납부|답장)/i;
const emailAddress = (value: string) => value.match(/<([^>]+)>/)?.[1] || value;
const b64ToBlob = (data: string, type: string) => {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new Blob([bytes], { type });
};

export default function KatieGmailAssistant({ roomId }: { roomId: string }) {
  const endpoint = `/api/rooms/${encodeURIComponent(roomId)}/ai-secretary/gmail`;
  const [connection, setConnection] = useState<Connection | null>(null);
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [selected, setSelected] = useState<GmailMessage | null>(null);
  const [thread, setThread] = useState<GmailMessage[]>([]);
  const [translation, setTranslation] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [draft, setDraft] = useState({ to: "", subject: "", body: "" });
  const [approved, setApproved] = useState(false);
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function api(body: Record<string, unknown>) {
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Gmail 요청에 실패했습니다.");
    return payload.result;
  }
  async function ai(message: string) {
    const response = await fetch("/api/ai/helper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId, selectedLanguage: "ko", history: [], message }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.answer) throw new Error(payload.error || "Katie가 답하지 못했습니다.");
    return String(payload.answer).trim();
  }
  async function run(work: () => Promise<void>) {
    setBusy(true); setError(""); setResult("");
    try { await work(); } catch (reason) { setError(reason instanceof Error ? reason.message : "요청에 실패했습니다."); } finally { setBusy(false); }
  }

  const checkConnection = () => run(async () => {
    const response = await fetch(endpoint, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Gmail 연결 상태를 확인하지 못했습니다.");
    setConnection(payload);
  });
  const loadMail = () => run(async () => {
    const list = await api({ action: "search", query: "newer_than:14d (is:unread OR is:starred OR label:important)", maxResults: 12 });
    const ids = Array.isArray(list?.messages) ? list.messages.map((item: { id?: string }) => item.id).filter(Boolean) : [];
    const rows = await Promise.all(ids.map((messageId: string) => api({ action: "message", messageId })));
    setMessages(rows.sort((a: GmailMessage, b: GmailMessage) => Number(b.labelIds?.includes("IMPORTANT") || ACTION_WORDS.test(`${b.subject} ${b.snippet}`)) - Number(a.labelIds?.includes("IMPORTANT") || ACTION_WORDS.test(`${a.subject} ${a.snippet}`))));
  });
  const openOriginal = (message: GmailMessage) => run(async () => {
    setSelected(message); setTranslation(""); setQuestion(""); setAnswer(""); setDraft({ to: "", subject: "", body: "" }); setApproved(false);
    const value = await api({ action: "thread", threadId: message.threadId });
    setThread(Array.isArray(value?.messages) ? value.messages : [message]);
  });
  const translate = () => selected && run(async () => {
    setTranslation(await ai(["다음 이메일 원문을 빠짐없이 자연스러운 한국어로 번역하세요.", "설명이나 행동은 하지 말고 번역문만 반환하세요.", selected.original].join("\n\n")));
  });
  const askKatie = () => selected && question.trim() && run(async () => {
    setAnswer(await ai(["당신은 Harry의 개인비서 Katie입니다. 아래 이메일을 읽고 Harry의 질문에 한국어로 간결하고 정확하게 답하세요.", "메일을 보내거나 삭제하거나 전달하지 마세요.", `보낸 사람: ${selected.from}`, `제목: ${selected.subject}`, `원문:\n${selected.original}`, `Harry 질문: ${question}`].join("\n\n")));
  });
  const prepareDraft = () => selected && run(async () => {
    const body = await ai(["Harry의 개인비서 Katie로서 아래 이메일에 대한 간결하고 정중한 호주식 영어 답장 초안을 작성하세요.", "답장 본문만 반환하고 어떤 외부 행동도 하지 마세요.", answer ? `Harry와 논의한 내용:\n${answer}` : "", `원문:\n${selected.original}`].filter(Boolean).join("\n\n"));
    setDraft({ to: emailAddress(selected.from), subject: selected.subject.startsWith("Re:") ? selected.subject : `Re: ${selected.subject}`, body }); setApproved(false);
  });
  const execute = (action: "draft" | "send") => selected && approved && run(async () => {
    await api({ action, approved: true, ...draft, threadId: selected.threadId, messageIdHeader: selected.messageIdHeader, references: selected.references });
    setApproved(false); setResult(action === "draft" ? "Gmail 초안 저장 완료" : "메일 발송 완료");
  });
  const download = (message: GmailMessage, attachment: Attachment) => run(async () => {
    const value = await api({ action: "attachment", messageId: message.id, attachmentId: attachment.attachmentId });
    const url = URL.createObjectURL(b64ToBlob(String(value.data || ""), attachment.mimeType));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = attachment.filename; anchor.click(); URL.revokeObjectURL(url);
  });

  return (
    <section className="rounded-xl border border-[#d7b64d]/35 bg-[#0b1728] p-4">
      <div className="flex flex-wrap items-center gap-2"><Mail className="text-[#f0d36a]" size={19} /><h3 className="font-bold text-[#f0d36a]">Katie Gmail 개인비서</h3><button type="button" onClick={checkConnection} disabled={busy} className="ml-auto rounded-lg border border-white/15 px-3 py-2 text-xs">연결 상태 확인</button></div>
      {connection && <div className="mt-3 flex items-center gap-2 text-sm">{connection.connected ? <CheckCircle2 className="text-emerald-400" size={17} /> : <AlertTriangle className="text-amber-300" size={17} />}<span>{connection.connected ? `${connection.googleEmail || "Gmail"} 연결됨` : "Gmail이 연결되지 않았습니다."}</span>{!connection.connected && connection.oauthConfigured && <a href="/api/tools/google/connect" className="rounded bg-blue-700 px-3 py-1.5 text-xs">Gmail 연결</a>}</div>}
      {connection?.connected && <button type="button" onClick={loadMail} disabled={busy} className="mt-3 flex items-center gap-2 rounded-lg bg-[#173663] px-4 py-2 text-sm text-[#ffe18a] disabled:opacity-50">{busy ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}중요 메일 불러오기</button>}
      {error && <p className="mt-3 rounded-lg border border-red-400/30 bg-red-950/30 p-3 text-xs text-red-200">{error}</p>}
      {messages.length > 0 && <div className="mt-4 space-y-2">{messages.map((message) => <article key={message.id} className="rounded-lg border border-white/10 bg-black/15 p-3"><div className="flex gap-2"><span className="rounded bg-red-800 px-2 py-0.5 text-[10px]">{message.labelIds?.includes("IMPORTANT") ? "중요" : "메일"}</span><strong className="text-sm">{message.subject}</strong></div><p className="mt-1 text-xs text-white/50">{message.from} · {message.date}</p><p className="mt-2 line-clamp-3 text-sm text-white/75">{message.snippet || message.original}</p><button type="button" onClick={() => openOriginal(message)} className="mt-3 rounded border border-[#d7b64d]/50 px-3 py-1.5 text-xs text-[#ffe18a]">원문·번역·답장 열기</button></article>)}</div>}
      {selected && <div className="mt-5 space-y-4 rounded-xl border border-[#d7b64d]/35 p-4">
        <div><h4 className="font-bold text-[#ffe18a]">{selected.subject}</h4><p className="text-xs text-white/50">전체 대화 {thread.length || 1}개</p></div>
        <div className="grid gap-3 lg:grid-cols-2"><div><h5 className="mb-2 text-sm font-bold">원문</h5><div className="max-h-96 space-y-3 overflow-auto rounded border border-white/10 bg-black/20 p-3">{(thread.length ? thread : [selected]).map((item) => <div key={item.id} className="border-b border-white/10 pb-3 last:border-0"><p className="mb-2 text-xs text-white/50">{item.from} · {item.date}</p><pre className="whitespace-pre-wrap font-sans text-sm leading-6">{item.original}</pre>{item.attachments.map((file) => <button key={file.attachmentId} type="button" onClick={() => download(item, file)} className="mt-2 flex items-center gap-1 rounded border border-white/15 px-2 py-1 text-xs"><Download size={13} />{file.filename}</button>)}</div>)}</div></div><div><div className="mb-2 flex items-center justify-between"><h5 className="text-sm font-bold">한국어 번역</h5><button type="button" onClick={translate} disabled={busy} className="rounded bg-[#173663] px-3 py-1.5 text-xs">번역하기</button></div><pre className="max-h-96 min-h-32 overflow-auto whitespace-pre-wrap rounded border border-white/10 bg-black/20 p-3 font-sans text-sm leading-6">{translation || "번역하기를 누르면 원문과 나란히 표시됩니다."}</pre></div></div>
        <div><h5 className="mb-2 text-sm font-bold">Katie와 논의</h5><div className="flex gap-2"><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="이 메일의 뜻이나 답장 방향을 물어보세요" className="min-w-0 flex-1 rounded border border-white/15 bg-black/20 p-2 text-sm" /><button type="button" onClick={askKatie} disabled={busy || !question.trim()} className="rounded bg-[#173663] px-3 text-xs">질문</button></div>{answer && <p className="mt-2 whitespace-pre-wrap rounded border border-white/10 p-3 text-sm leading-6">{answer}</p>}</div>
        <button type="button" onClick={prepareDraft} disabled={busy} className="rounded border border-[#d7b64d]/50 px-3 py-2 text-xs text-[#ffe18a]">Katie와 답장 초안 만들기</button>
        {draft.body && <div className="space-y-2"><input aria-label="받는 사람" value={draft.to} onChange={(event) => { setDraft({ ...draft, to: event.target.value }); setApproved(false); }} className="w-full rounded border border-white/15 bg-black/20 p-2 text-sm" /><input aria-label="제목" value={draft.subject} onChange={(event) => { setDraft({ ...draft, subject: event.target.value }); setApproved(false); }} className="w-full rounded border border-white/15 bg-black/20 p-2 text-sm" /><textarea aria-label="답장 내용" value={draft.body} onChange={(event) => { setDraft({ ...draft, body: event.target.value }); setApproved(false); }} className="min-h-40 w-full rounded border border-white/15 bg-black/20 p-2 text-sm" /><label className="flex items-start gap-2 rounded border border-amber-400/30 p-3 text-xs"><input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} /><span>받는 사람·제목·내용을 확인했으며, 아래에서 선택한 작업 1회를 승인합니다.</span></label><div className="flex flex-wrap gap-2"><button type="button" onClick={() => execute("draft")} disabled={busy || !approved} className="rounded bg-[#173663] px-4 py-2 text-xs disabled:opacity-40">승인하고 Gmail 초안 저장</button><button type="button" onClick={() => execute("send")} disabled={busy || !approved} className="rounded bg-[#7A0C2E] px-4 py-2 text-xs text-[#ffe18a] disabled:opacity-40">승인하고 지금 발송</button></div></div>}
        {result && <p className="text-sm text-emerald-300">{result}</p>}<p className="text-xs text-amber-200">자동 발송·삭제·전달은 항상 금지됩니다. 저장과 발송은 매번 Harry의 체크 승인이 필요합니다.</p>
      </div>}
    </section>
  );
}
