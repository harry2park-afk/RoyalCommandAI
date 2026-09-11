"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, ChevronRight, Clock3, FileText, Mail, MessageCircle, Phone, Send, X } from "lucide-react";

type TaskStatus = "todo" | "in_progress" | "approval_required" | "completed";
type Task = { id: string; title: string; status: TaskStatus; createdAt: string; updatedAt: string; result?: string; error?: string };
type Chat = { id: string; role: "user" | "assistant"; text: string; at: string };
type FileRecord = { id: string; name: string; size: number; at: string };
type RetellCall = { id: string; call_id?: string; from_number?: string; duration_ms?: number; message?: string; recording_url?: string; transcript?: string; summary?: string; created_at?: string };
type SecretaryData = { connected: boolean; name: string; chats: Chat[]; tasks: Task[]; files: FileRecord[]; logs: string[] };

const TABS = ["대화", "오늘의 보고", "업무", "메일·전화", "일정", "파일", "기록"] as const;
type Tab = typeof TABS[number];
const STATUS: Record<TaskStatus, string> = { todo: "할 일", in_progress: "진행 중", approval_required: "승인 필요", completed: "완료" };
const EXTERNAL = /(이메일|메일|전화|회신|예약|전달|보내|발송|email|call|book|send|forward)/i;

function storageKey(roomId: string) { return `royalcommand:room:${roomId}:ai-secretary-v1`; }
function now() { return new Date().toISOString(); }
function initialData(): SecretaryData {
  return {
    connected: false,
    name: "Sophie",
    chats: [{ id: "welcome", role: "assistant", text: "무엇을 도와드릴까요?", at: now() }],
    tasks: [],
    files: [],
    logs: [],
  };
}
function stamp(value: string) {
  try { return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
  catch { return value; }
}

export default function CustomerAISecretary({ roomId }: { roomId: string }) {
  const [data, setData] = useState<SecretaryData>(() => initialData());
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("대화");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [calls, setCalls] = useState<RetellCall[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!roomId || roomId.toLowerCase() === "rca") return;
    try {
      const saved = window.localStorage.getItem(storageKey(roomId));
      if (saved) setData({ ...initialData(), ...JSON.parse(saved) });
    } catch {}
    setLoaded(true);
  }, [roomId]);

  useEffect(() => {
    if (!loaded || !roomId || roomId.toLowerCase() === "rca") return;
    window.localStorage.setItem(storageKey(roomId), JSON.stringify(data));
  }, [data, loaded, roomId]);

  useEffect(() => {
    if (!loaded || !roomId || roomId.toLowerCase() === "rca") return;
    let active = true;
    const loadCalls = () => fetch(`/api/rooms/${encodeURIComponent(roomId)}/ai-secretary/calls`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (active && Array.isArray(payload?.calls)) setCalls(payload.calls); })
      .catch(() => undefined);
    loadCalls();
    const timer = window.setInterval(loadCalls, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, [loaded, roomId]);

  const report = useMemo(() => ({
    calls: calls.length + data.logs.filter((x) => x.includes("전화")).length,
    voicemail: calls.filter((x) => x.message || x.transcript).length + data.logs.filter((x) => x.includes("음성메시지")).length,
    email: data.logs.filter((x) => x.includes("메일")).length,
    schedule: data.tasks.filter((x) => /일정|예약/.test(x.title) && x.status !== "completed").length,
    reminders: data.tasks.filter((x) => x.status === "approval_required").length,
    active: data.tasks.filter((x) => x.status === "todo" || x.status === "in_progress").length,
  }), [calls, data]);

  if (!roomId || roomId.toLowerCase() === "rca") return null;

  function connectPreviewSecretary() {
    setData((current) => ({
      ...current,
      connected: true,
      logs: [`${stamp(now())} · AI 비서 신청 및 Preview 연결 완료`, ...current.logs],
    }));
  }

  async function sendInstruction(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const at = now();
    const needsApproval = EXTERNAL.test(text);
    const task: Task = { id: crypto.randomUUID(), title: text, status: needsApproval ? "approval_required" : "todo", createdAt: at, updatedAt: at };
    const userChat: Chat = { id: crypto.randomUUID(), role: "user", text, at };
    const acknowledgement = needsApproval
      ? "외부 실행이 필요한 업무로 정리했습니다. 고객 승인 전에는 실행하지 않습니다."
      : "지시를 할 일로 정리했습니다. 진행 상황을 업무 메뉴에서 확인하실 수 있습니다.";
    setData((current) => ({
      ...current,
      chats: [...current.chats, userChat, { id: crypto.randomUUID(), role: "assistant", text: acknowledgement, at: now() }],
      tasks: [task, ...current.tasks],
      logs: [`${stamp(at)} · 새 업무 지시 · ${text}`, ...current.logs],
    }));
    setInput("");
    setBusy(true);
    try {
      const response = await fetch("/api/ai/helper", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, selectedLanguage: "ko", message: `고객 전용 AI 비서로서 다음 지시를 간단히 확인하고 다음 단계를 알려주세요. 외부 실행은 하지 마세요: ${text}`, history: [] }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload?.answer) setData((current) => ({ ...current, chats: [...current.chats, { id: crypto.randomUUID(), role: "assistant", text: String(payload.answer), at: now() }] }));
    } catch {} finally { setBusy(false); }
  }

  function updateTask(taskId: string, status: TaskStatus) {
    const at = now();
    setData((current) => ({
      ...current,
      tasks: current.tasks.map((task) => task.id === taskId ? {
        ...task, status, updatedAt: at,
        result: status === "completed" ? "Preview 업무 처리 완료" : status === "in_progress" ? "고객 승인 확인됨 · 외부 서비스 연결 전 Preview 대기" : task.result,
      } : task),
      logs: [`${stamp(at)} · 업무 상태 변경 · ${STATUS[status]}`, ...current.logs],
    }));
  }

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const at = now();
    const added = Array.from(files).map((file) => ({ id: crypto.randomUUID(), name: file.name, size: file.size, at }));
    setData((current) => ({ ...current, files: [...added, ...current.files], logs: [`${stamp(at)} · 파일 ${added.length}개 Room 기록에 추가`, ...current.logs] }));
  }

  if (!data.connected) {
    return <button type="button" onClick={connectPreviewSecretary} className="fixed bottom-7 right-8 z-[372] h-10 rounded-xl border border-[#d7b64d] bg-[#173663] px-4 text-[13px] font-bold text-[#ffe18a] shadow-lg hover:bg-[#214b85]">AI 비서 신청</button>;
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="fixed bottom-7 right-8 z-[372] flex h-14 items-center gap-2 bg-transparent text-left">
        <img src="/ai-secretary-woman.svg" alt={`${data.name} AI 비서`} className="h-14 w-12 rounded-lg object-cover shadow-lg" />
        <span className="text-xs font-bold text-[#f0d36a]">{data.name}<br/><span className="text-[10px] text-white/70">AI 비서</span></span>
      </button>
      {open ? <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/65 p-3">
        <section className="flex h-[min(760px,94dvh)] w-[min(1180px,96vw)] flex-col overflow-hidden rounded-2xl border border-[#d7b64d]/50 bg-[#07111f] shadow-2xl">
          <header className="flex h-20 shrink-0 items-center gap-3 border-b border-white/10 px-5">
            <img src="/ai-secretary-woman.svg" alt="" className="h-16 w-14 rounded-lg object-cover"/>
            <div><h2 className="font-serif text-xl font-bold text-[#f0d36a]">{data.name} · AI 비서 사무실</h2><p className="text-sm text-white/65">무엇을 도와드릴까요?</p></div>
            <button type="button" onClick={() => setOpen(false)} className="ml-auto grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="닫기"><X/></button>
          </header>
          <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/10 p-2">
            {TABS.map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`h-9 shrink-0 rounded-lg px-3 text-xs font-semibold ${tab === item ? "bg-[#7A0C2E] text-[#ffe18a]" : "text-white/70 hover:bg-white/5"}`}>{item}</button>)}
          </nav>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {tab === "대화" ? <div className="mx-auto flex h-full max-w-3xl flex-col">
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">{data.chats.map((chat) => <div key={chat.id} className={`max-w-[82%] rounded-xl px-3 py-2 text-sm leading-6 ${chat.role === "user" ? "ml-auto bg-[#173663]" : "bg-white/7"}`}>{chat.text}<div className="mt-1 text-[9px] text-white/35">{stamp(chat.at)}</div></div>)}</div>
              <form onSubmit={sendInstruction} className="mt-3 flex gap-2"><textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="비서에게 새로운 업무를 지시하세요" className="min-h-12 flex-1 resize-none rounded-xl border border-white/15 bg-black/20 p-3 text-sm outline-none focus:border-[#d7b64d]"/><button disabled={!input.trim() || busy} className="grid w-12 place-items-center rounded-xl border border-[#d7b64d] bg-[#7A0C2E] text-[#ffe18a] disabled:opacity-30"><Send size={18}/></button></form>
            </div> : null}
            {tab === "오늘의 보고" ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[
              ["받은 전화", report.calls, Phone], ["음성메시지", report.voicemail, MessageCircle], ["이메일", report.email, Mail],
              ["일정", report.schedule, CalendarDays], ["알림·승인", report.reminders, Clock3], ["진행 업무", report.active, ChevronRight],
            ].map(([label, count, Icon]: any) => <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-4"><Icon className="mb-3 text-[#f0d36a]" size={20}/><div className="text-sm text-white/60">{label}</div><div className="mt-1 text-3xl font-bold">{count}</div></div>)}</div> : null}
            {tab === "업무" ? <div className="grid gap-3 lg:grid-cols-4">{(["todo","in_progress","approval_required","completed"] as TaskStatus[]).map((status) => <div key={status} className="rounded-xl border border-white/10 bg-black/15 p-3"><h3 className="mb-3 font-bold text-[#f0d36a]">{STATUS[status]}</h3>{data.tasks.filter((task) => task.status === status).map((task) => <article key={task.id} className="mb-2 rounded-lg border border-white/10 bg-[#0c1a2d] p-3 text-sm"><div>{task.title}</div><div className="mt-2 text-[9px] text-white/35">{stamp(task.updatedAt)}</div><div className="mt-2 flex gap-1">{status === "todo" ? <button onClick={() => updateTask(task.id,"in_progress")} className="rounded bg-blue-700 px-2 py-1 text-[10px]">시작</button> : null}{status === "approval_required" ? <button onClick={() => updateTask(task.id,"in_progress")} className="rounded bg-amber-600 px-2 py-1 text-[10px]">고객 승인</button> : null}{status === "in_progress" ? <button onClick={() => updateTask(task.id,"completed")} className="rounded bg-emerald-700 px-2 py-1 text-[10px]">완료</button> : null}</div>{task.result ? <div className="mt-2 text-[10px] text-emerald-300">{task.result}</div> : null}</article>)}</div>)}</div> : null}
            {tab === "메일·전화" ? <div className="space-y-3">{calls.length ? calls.map((call) => <article key={call.call_id ?? call.id} className="rounded-xl border border-white/10 bg-white/5 p-4"><div className="flex items-center gap-2 font-bold text-[#f0d36a]"><Phone size={16}/> {call.from_number || "발신번호 비공개"}</div><div className="mt-1 text-xs text-white/45">{call.created_at ? stamp(call.created_at) : ""}{typeof call.duration_ms === "number" ? ` · ${Math.round(call.duration_ms / 1000)}초` : ""}</div>{call.summary ? <p className="mt-3 text-sm leading-6">{call.summary}</p> : null}{call.message && call.message !== call.summary ? <p className="mt-2 text-sm text-white/70">{call.message}</p> : null}{call.transcript ? <details className="mt-3"><summary className="cursor-pointer text-xs text-[#f0d36a]">Transcript</summary><pre className="mt-2 whitespace-pre-wrap text-xs leading-5 text-white/65">{call.transcript}</pre></details> : null}{call.recording_url ? <audio controls preload="none" className="mt-3 w-full" src={call.recording_url}/> : null}</article>) : <div className="rounded-xl border border-white/10 p-5 text-sm text-white/55">저장된 전화 기록이 없습니다.</div>}<div className="rounded-xl border border-amber-400/30 bg-amber-950/15 p-4"><h3 className="font-bold text-amber-200">외부 실행 안전 잠금</h3><p className="mt-2 text-sm leading-6 text-white/70">전화 회신과 이메일 발송은 고객 승인 전 실행되지 않습니다.</p></div></div> : null}
            {tab === "일정" ? <div className="space-y-2">{data.tasks.filter((task) => /일정|예약|schedule|booking/i.test(task.title)).map((task) => <div key={task.id} className="rounded-lg border border-white/10 p-3 text-sm">{task.title} · {STATUS[task.status]}</div>)}</div> : null}
            {tab === "파일" ? <div><input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)}/><button onClick={() => fileRef.current?.click()} className="rounded-lg border border-[#d7b64d] bg-[#173663] px-4 py-2 text-sm text-[#ffe18a]"><FileText className="mr-2 inline" size={16}/>파일 추가</button><div className="mt-4 space-y-2">{data.files.map((file) => <div key={file.id} className="rounded-lg border border-white/10 p-3 text-sm">{file.name}<span className="ml-2 text-xs text-white/40">{Math.ceil(file.size/1024)} KB · {stamp(file.at)}</span></div>)}</div></div> : null}
            {tab === "기록" ? <div className="space-y-2">{data.logs.map((log,index) => <div key={index} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70">{log}</div>)}</div> : null}
          </div>
        </section>
      </div> : null}
    </>
  );
}
