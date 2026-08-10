"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileUp, Mic, Save, Upload } from "lucide-react";

type Status = "waiting_customer" | "waiting_kevin" | "complete" | "deferred";
type FormItem = {
  number: string;
  title: string;
  question: string;
  answer: string;
  status: Status;
  files: string[];
  emailRefs: string[];
};

const DEFAULT_ITEMS: FormItem[] = [
  { number: "001", title: "Company purpose", question: "What does your company do?", answer: "", status: "waiting_customer", files: [], emailRefs: [] },
  { number: "002", title: "Services provided", question: "What products or services do you provide?", answer: "", status: "waiting_customer", files: [], emailRefs: [] },
  { number: "003", title: "Staff and departments", question: "Who works in the business and what does each person or department do?", answer: "", status: "waiting_customer", files: [], emailRefs: [] },
  { number: "004", title: "Tasks for AI", question: "Which jobs do you want AI agents to perform?", answer: "", status: "waiting_customer", files: [], emailRefs: [] },
  { number: "005", title: "Approval rules", question: "Which actions must always be approved by a human?", answer: "", status: "waiting_customer", files: [], emailRefs: [] },
  { number: "006", title: "Telephone workflow", question: "How should calls be answered, transferred, recorded and reported?", answer: "", status: "waiting_customer", files: [], emailRefs: [] },
  { number: "007", title: "Email and messaging", question: "How should email, SMS and other messages be handled?", answer: "", status: "waiting_customer", files: [], emailRefs: [] },
  { number: "008", title: "Documents and knowledge", question: "Upload or describe the policies, forms, manuals and documents your agents should use.", answer: "", status: "waiting_customer", files: [], emailRefs: [] },
  { number: "009", title: "Systems and connections", question: "Which systems should connect to the Room (CRM, booking, accounting, banking, etc.)?", answer: "", status: "waiting_customer", files: [], emailRefs: [] },
  { number: "010", title: "Tone and customer experience", question: "How should your agents speak and behave with customers and staff?", answer: "", status: "waiting_customer", files: [], emailRefs: [] },
];

const STATUS_META: Record<Status, { label: string; classes: string }> = {
  waiting_customer: { label: "Waiting for customer", classes: "border-red-500/70 bg-red-500/10 text-red-200" },
  waiting_kevin: { label: "Customer answered — Kevin review", classes: "border-blue-500/70 bg-blue-500/10 text-blue-200" },
  complete: { label: "Reviewed / Complete", classes: "border-amber-400/70 bg-amber-400/10 text-amber-100" },
  deferred: { label: "Deferred / Not required", classes: "border-slate-500/60 bg-slate-500/10 text-slate-300" },
};

export default function CustomerBuildFormPage() {
  const { id: roomId } = useParams<{ id: string }>();
  const [items, setItems] = useState<FormItem[]>(DEFAULT_ITEMS);
  const [listeningItem, setListeningItem] = useState<string | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const storageKey = `royalcommand:room:${roomId}:customer-build-form`;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) setItems(JSON.parse(saved));
    } catch {
      // Keep default form if older local data cannot be read.
    }
  }, [storageKey]);

  const progress = useMemo(() => {
    const required = items.filter((i) => i.status !== "deferred");
    return {
      total: required.length,
      answered: required.filter((i) => i.answer.trim() || i.files.length || i.emailRefs.length).length,
      waitingCustomer: required.filter((i) => i.status === "waiting_customer").length,
      waitingKevin: required.filter((i) => i.status === "waiting_kevin").length,
      complete: required.filter((i) => i.status === "complete").length,
    };
  }, [items]);

  function persist(next: FormItem[]) {
    setItems(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function updateItem(number: string, patch: Partial<FormItem>) {
    persist(items.map((item) => (item.number === number ? { ...item, ...patch } : item)));
  }

  function submitAnswer(number: string) {
    const item = items.find((i) => i.number === number);
    if (!item) return;
    if (!item.answer.trim() && item.files.length === 0 && item.emailRefs.length === 0) return;
    updateItem(number, { status: "waiting_kevin" });
  }

  function startVoice(number: string) {
    const w = window as unknown as {
      SpeechRecognition?: new () => any;
      webkitSpeechRecognition?: new () => any;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;

    recognitionRef.current?.stop();
    const recognition = new SR();
    recognition.lang = navigator.language || "en-AU";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setListeningItem(number);
    recognition.onend = () => setListeningItem(null);
    recognition.onerror = () => setListeningItem(null);
    recognition.onresult = (event: any) => {
      const text = event.results?.[0]?.[0]?.transcript || "";
      const item = items.find((i) => i.number === number);
      if (!item) return;
      updateItem(number, { answer: [item.answer, text].filter(Boolean).join(" ") });
    };
    recognition.start();
    recognitionRef.current = recognition;
  }

  function addFiles(number: string, fileList: FileList | null) {
    if (!fileList) return;
    const item = items.find((i) => i.number === number);
    if (!item) return;
    const names = Array.from(fileList).map((file) => file.name);
    updateItem(number, { files: Array.from(new Set([...item.files, ...names])), status: "waiting_kevin" });
  }

  function addEmailReference(number: string) {
    const value = window.prompt("Enter the email subject, sender, or reference used to supply documents to this Room:");
    if (!value?.trim()) return;
    const item = items.find((i) => i.number === number);
    if (!item) return;
    updateItem(number, { emailRefs: [...item.emailRefs, value.trim()], status: "waiting_kevin" });
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--gold-soft)]">Royal Command Customer Room</p>
          <h1 className="mt-1 text-3xl" style={{ fontFamily: "var(--font-display), serif" }}>Integrated Agent Build Form</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Add information whenever you have time. Kevin reviews each numbered item and asks only for what is still missing.</p>
        </div>
        <Link href={`/rooms/${roomId}`} className="rc-btn rc-btn-ghost">Back to Room</Link>
      </div>

      <section className="rc-card mb-6 p-4 md:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div><div className="text-xs text-[var(--muted)]">Required</div><div className="text-2xl">{progress.total}</div></div>
          <div><div className="text-xs text-[var(--muted)]">Answered</div><div className="text-2xl">{progress.answered}</div></div>
          <div><div className="text-xs text-red-300">Waiting for customer</div><div className="text-2xl">{progress.waitingCustomer}</div></div>
          <div><div className="text-xs text-blue-300">Waiting for Kevin</div><div className="text-2xl">{progress.waitingKevin}</div></div>
          <div><div className="text-xs text-amber-300">Complete</div><div className="text-2xl">{progress.complete}</div></div>
        </div>
      </section>

      <div className="space-y-4">
        {items.map((item) => {
          const meta = STATUS_META[item.status];
          return (
            <section key={item.number} className={`rounded-3xl border-2 p-4 md:p-5 ${meta.classes}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">{item.number}</div>
                  <h2 className="mt-1 text-xl font-semibold">{item.title}</h2>
                  <p className="mt-2 text-sm opacity-90">{item.question}</p>
                </div>
                <span className="rounded-full border border-current/30 px-3 py-1 text-xs font-semibold">{meta.label}</span>
              </div>

              <textarea
                value={item.answer}
                onChange={(e) => updateItem(item.number, { answer: e.target.value })}
                className="mt-4 min-h-28 w-full rounded-2xl border border-white/15 bg-black/25 p-4 text-white outline-none focus:border-[var(--gold)]"
                placeholder="Type here, or use the microphone…"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => startVoice(item.number)} className="rc-btn rc-btn-ghost text-sm"><Mic size={16} /> {listeningItem === item.number ? "Listening…" : "Speak"}</button>
                <label className="rc-btn rc-btn-ghost cursor-pointer text-sm"><Upload size={16} /> Upload PDF / file<input type="file" multiple className="hidden" onChange={(e) => addFiles(item.number, e.target.files)} /></label>
                <button type="button" onClick={() => addEmailReference(item.number)} className="rc-btn rc-btn-ghost text-sm"><FileUp size={16} /> Add email reference</button>
                <button type="button" onClick={() => submitAnswer(item.number)} className="rc-btn rc-btn-primary text-sm"><Save size={16} /> Send to Kevin</button>
              </div>

              {(item.files.length > 0 || item.emailRefs.length > 0) ? (
                <div className="mt-3 space-y-1 text-xs opacity-85">
                  {item.files.map((file) => <div key={file}>File: {file}</div>)}
                  {item.emailRefs.map((ref, idx) => <div key={`${ref}-${idx}`}>Email reference: {ref}</div>)}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-[var(--muted)]">Prototype note: typed/voice responses and form status are saved in this browser for now. Server-side Room storage, real file upload and automatic email intake should be connected before customer production use.</p>
    </main>
  );
}
