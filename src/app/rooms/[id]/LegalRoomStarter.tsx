"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { FileText, FolderOpen, MessageCircle, Scale, Sparkles, X } from "lucide-react";

type Workspace = {
  caseStory: string;
  desiredOutcome: string;
  updatedAt: string | null;
};

type EvidenceItem = {
  id: string;
  title: string;
  event_date: string | null;
  description: string;
  document_id: string | null;
  created_at: string;
};

type DocumentItem = {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

type LegalPayload = {
  enabled: boolean;
  room?: { id: string; name: string };
  languageTag?: string;
  workspace?: Workspace;
  evidence?: EvidenceItem[];
  documents?: DocumentItem[];
};

type Mode = "home" | "story" | "evidence" | "ai" | "lawyer";

type HelperOpenDetail = {
  greeting: string;
  captureEvent: string;
  autoSend: boolean;
};

function appendStory(current: string, next: string) {
  const clean = next.trim();
  if (!clean) return current;
  const stamp = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
  return `${current.trim()}${current.trim() ? "\n\n" : ""}[${stamp}] ${clean}`;
}

export default function LegalRoomStarter() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [mode, setMode] = useState<Mode>("home");
  const [workspace, setWorkspace] = useState<Workspace>({ caseStory: "", desiredOutcome: "", updatedAt: null });
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceDate, setEvidenceDate] = useState("");
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const languageTagRef = useRef("en-AU");

  const korean = languageTagRef.current.toLowerCase().startsWith("ko");

  async function refresh() {
    if (!roomId) return;
    const response = await fetch(`/api/rooms/${roomId}/legal-workspace`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({})) as LegalPayload;
    if (!response.ok) {
      setLoaded(true);
      return;
    }
    setEnabled(Boolean(payload.enabled));
    if (payload.languageTag) languageTagRef.current = payload.languageTag;
    if (payload.workspace) setWorkspace(payload.workspace);
    setEvidence(Array.isArray(payload.evidence) ? payload.evidence : []);
    setDocuments(Array.isArray(payload.documents) ? payload.documents : []);
    setLoaded(true);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  async function saveWorkspace(next: Workspace) {
    setSaving(true);
    setStatus("");
    try {
      const response = await fetch(`/api/rooms/${roomId}/legal-workspace`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseStory: next.caseStory, desiredOutcome: next.desiredOutcome }),
      });
      const payload = await response.json().catch(() => ({})) as { workspace?: Workspace; error?: string };
      if (!response.ok || !payload.workspace) {
        setStatus(payload.error || (korean ? "저장하지 못했습니다." : "Could not save."));
        return;
      }
      setWorkspace(payload.workspace);
      setStatus(korean ? "저장되었습니다." : "Saved.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const capture = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      const message = detail?.message?.trim();
      if (!message) return;
      setWorkspace((current) => {
        const next = { ...current, caseStory: appendStory(current.caseStory, message) };
        void saveWorkspace(next);
        return next;
      });
    };
    window.addEventListener("rc:legal-case-story", capture as EventListener);
    return () => window.removeEventListener("rc:legal-case-story", capture as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const askAiPrompt = useMemo(() => {
    return [
      "다음은 제가 직접 기록한 사건 내용입니다.",
      "사실을 임의로 추가하지 말고, 아래 내용을 바탕으로 다음을 정리해 주세요:",
      "1) 핵심 사실 2) 시간순 정리 3) 빠진 정보와 추가로 확인할 질문 4) 가지고 있어야 할 증거 목록 5) 변호사에게 물어볼 질문.",
      "확실하지 않은 부분은 확실하지 않다고 표시해 주세요.",
      "",
      `사건 기록:\n${workspace.caseStory || "아직 기록 없음"}`,
      "",
      `제가 원하는 결과:\n${workspace.desiredOutcome || "아직 기록 없음"}`,
    ].join("\n");
  }, [workspace.caseStory, workspace.desiredOutcome]);

  const lawyerPrompt = useMemo(() => {
    return [
      "다음 사건 기록을 변호사에게 처음 보내기 좋은 짧고 정확한 사건 요약으로 정리해 주세요.",
      "사실을 임의로 만들지 말고, 날짜/사람/사건/증거/제가 원하는 결과를 구분해 주세요.",
      "마지막에는 변호사에게 확인할 질문 목록을 만들어 주세요.",
      "",
      `사건 기록:\n${workspace.caseStory || "아직 기록 없음"}`,
      "",
      `제가 원하는 결과:\n${workspace.desiredOutcome || "아직 기록 없음"}`,
    ].join("\n");
  }, [workspace.caseStory, workspace.desiredOutcome]);

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(korean ? "복사했습니다. 원하는 AI에 붙여넣으세요." : "Copied. Paste it into your AI." );
    } catch {
      setStatus(korean ? "복사하지 못했습니다. 내용을 직접 선택해 주세요." : "Could not copy. Select the text manually.");
    }
  }

  function startCaseConversation() {
    const detail: HelperOpenDetail = {
      greeting: korean
        ? "무슨 일이 있었는지 편하게 말씀해 주세요. 한 번에 다 말씀하지 않으셔도 됩니다."
        : "Tell me what happened in your own words. You do not need to tell me everything at once.",
      captureEvent: "rc:legal-case-story",
      autoSend: true,
    };
    window.dispatchEvent(new CustomEvent<HelperOpenDetail>("rc:ai-helper-open", { detail }));
    setMinimized(true);
  }

  async function addEvidence() {
    const file = fileRef.current?.files?.[0] || null;
    const title = evidenceTitle.trim() || file?.name || "";
    if (!title) {
      setStatus(korean ? "증거 제목이나 파일을 하나 넣어 주세요." : "Add an evidence title or file.");
      return;
    }
    setUploading(true);
    setStatus("");
    try {
      let documentId: string | null = null;
      if (file) {
        const form = new FormData();
        form.set("roomId", roomId);
        form.set("file", file);
        const uploadResponse = await fetch("/api/documents/upload", { method: "POST", body: form });
        const uploadPayload = await uploadResponse.json().catch(() => ({})) as { document?: { id?: string }; error?: string };
        if (!uploadResponse.ok || !uploadPayload.document?.id) {
          setStatus(uploadPayload.error || (korean ? "파일을 올리지 못했습니다." : "Could not upload file."));
          return;
        }
        documentId = uploadPayload.document.id;
      }

      const response = await fetch(`/api/rooms/${roomId}/legal-workspace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          eventDate: evidenceDate || null,
          description: evidenceDescription,
          documentId,
        }),
      });
      const payload = await response.json().catch(() => ({})) as { evidence?: EvidenceItem; error?: string };
      if (!response.ok || !payload.evidence) {
        setStatus(payload.error || (korean ? "증거 기록을 저장하지 못했습니다." : "Could not save evidence."));
        return;
      }
      setEvidence((current) => [payload.evidence!, ...current]);
      if (file && documentId) {
        setDocuments((current) => [{ id: documentId, filename: file.name, mime_type: file.type, size_bytes: file.size, created_at: new Date().toISOString() }, ...current]);
      }
      setEvidenceTitle("");
      setEvidenceDate("");
      setEvidenceDescription("");
      if (fileRef.current) fileRef.current.value = "";
      setStatus(korean ? "증거를 보관했습니다." : "Evidence saved.");
    } finally {
      setUploading(false);
    }
  }

  if (!loaded || !enabled) return null;

  if (minimized) {
    return (
      <button
        type="button"
        className="fixed left-[245px] top-[104px] z-[240] rounded-full border border-[#d7b64d] bg-[#7A0C2E] px-4 py-2 text-sm font-semibold text-[#ffe18a] shadow-lg max-lg:left-3 max-lg:top-20"
        onClick={() => setMinimized(false)}
      >
        {korean ? "⚖ 법률 도구" : "⚖ Legal tools"}
      </button>
    );
  }

  const documentById = new Map(documents.map((item) => [item.id, item]));

  return (
    <section className="fixed left-[245px] right-[185px] top-[104px] z-[230] mx-auto max-h-[calc(100dvh-205px)] max-w-[820px] overflow-y-auto rounded-2xl border border-[#d7b64d]/70 bg-[#07111f]/[0.98] p-4 shadow-[0_18px_55px_rgba(0,0,0,.58)] max-lg:left-3 max-lg:right-3 max-lg:top-20 max-lg:max-h-[calc(100dvh-110px)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-[#f3d36a]">{korean ? "내 법률방" : "My Legal Room"}</div>
          <p className="mt-1 text-sm text-white/70">{korean ? "어려운 법률용어 없이, 먼저 말하고 기록하면 됩니다." : "Start by talking and keeping a record. No legal jargon needed."}</p>
        </div>
        <button type="button" onClick={() => setMinimized(true)} className="grid h-8 w-8 place-items-center rounded-full text-white/60 hover:bg-white/10" title={korean ? "줄이기" : "Minimize"}><X size={17} /></button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
        <button type="button" onClick={startCaseConversation} className="rounded-xl border border-[#d7b64d]/45 bg-[#d7b64d]/10 p-3 text-left hover:bg-[#d7b64d]/15"><MessageCircle size={19} className="text-[#f3d36a]" /><div className="mt-2 text-sm font-semibold">{korean ? "내 사건 이야기하기" : "Tell my story"}</div></button>
        <button type="button" onClick={() => setMode("story")} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:bg-white/[0.06]"><FileText size={19} className="text-[#f3d36a]" /><div className="mt-2 text-sm font-semibold">{korean ? "사건 기록" : "Case record"}</div></button>
        <button type="button" onClick={() => setMode("evidence")} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:bg-white/[0.06]"><FolderOpen size={19} className="text-[#f3d36a]" /><div className="mt-2 text-sm font-semibold">{korean ? "증거 보관" : "Evidence"}</div></button>
        <button type="button" onClick={() => setMode("ai")} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:bg-white/[0.06]"><Sparkles size={19} className="text-[#f3d36a]" /><div className="mt-2 text-sm font-semibold">{korean ? "AI에게 물어보기" : "Ask my AI"}</div></button>
        <button type="button" onClick={() => setMode("lawyer")} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:bg-white/[0.06]"><Scale size={19} className="text-[#f3d36a]" /><div className="mt-2 text-sm font-semibold">{korean ? "변호사 준비" : "Prepare for lawyer"}</div></button>
      </div>

      {mode === "home" ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/75">
          {korean ? "먼저 ‘내 사건 이야기하기’를 눌러 편하게 말씀해 주세요. 오늘 다 말하지 않아도 됩니다. 말씀한 내용은 사건 기록에 계속 추가해서 보관할 수 있습니다." : "Start with ‘Tell my story’. You do not need to finish today. Your record can grow over time."}
        </div>
      ) : null}

      {mode === "story" ? (
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-semibold text-[#f3d36a]">{korean ? "무슨 일이 있었나요?" : "What happened?"}</label>
          <textarea className="rc-input min-h-44 font-sans text-sm leading-6" value={workspace.caseStory} onChange={(event) => setWorkspace((current) => ({ ...current, caseStory: event.target.value }))} placeholder={korean ? "순서가 틀려도 괜찮습니다. 기억나는 대로 적으세요." : "Write it in your own words. The order does not have to be perfect."} />
          <label className="block text-sm font-semibold text-[#f3d36a]">{korean ? "어떤 결과를 원하세요?" : "What outcome do you want?"}</label>
          <textarea className="rc-input min-h-20 font-sans text-sm leading-6" value={workspace.desiredOutcome} onChange={(event) => setWorkspace((current) => ({ ...current, desiredOutcome: event.target.value }))} placeholder={korean ? "예: 돈을 돌려받고 싶다, 사과를 받고 싶다, 소송을 검토하고 싶다." : "For example: recover money, receive an apology, consider a claim."} />
          <button type="button" disabled={saving} onClick={() => void saveWorkspace(workspace)} className="rounded-lg border border-[#d7b64d] bg-[#7A0C2E] px-5 py-2 text-sm font-semibold text-[#ffe18a] disabled:opacity-50">{saving ? (korean ? "저장 중…" : "Saving…") : (korean ? "기록 저장" : "Save record")}</button>
        </div>
      ) : null}

      {mode === "evidence" ? (
        <div className="mt-4 space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            <input className="rc-input" value={evidenceTitle} onChange={(event) => setEvidenceTitle(event.target.value)} placeholder={korean ? "증거 제목" : "Evidence title"} />
            <input className="rc-input" type="date" value={evidenceDate} onChange={(event) => setEvidenceDate(event.target.value)} />
          </div>
          <textarea className="rc-input min-h-20 font-sans text-sm" value={evidenceDescription} onChange={(event) => setEvidenceDescription(event.target.value)} placeholder={korean ? "이 증거가 무엇을 보여주는지 간단히 적으세요." : "Briefly say what this evidence shows."} />
          <input ref={fileRef} className="block w-full text-sm text-white/70" type="file" accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx" />
          <button type="button" disabled={uploading} onClick={() => void addEvidence()} className="rounded-lg border border-[#d7b64d] bg-[#7A0C2E] px-5 py-2 text-sm font-semibold text-[#ffe18a] disabled:opacity-50">{uploading ? (korean ? "보관 중…" : "Saving…") : (korean ? "증거 보관" : "Save evidence")}</button>
          <div className="space-y-2 pt-2">
            {evidence.length ? evidence.map((item) => {
              const document = item.document_id ? documentById.get(item.document_id) : null;
              return <div key={item.id} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm"><div className="font-semibold text-white">{item.title}</div><div className="mt-1 text-xs text-white/55">{item.event_date || new Date(item.created_at).toLocaleDateString()}{document ? ` · ${document.filename}` : ""}</div>{item.description ? <div className="mt-2 text-white/70">{item.description}</div> : null}</div>;
            }) : <div className="text-sm text-white/50">{korean ? "아직 보관한 증거가 없습니다." : "No evidence saved yet."}</div>}
          </div>
        </div>
      ) : null}

      {mode === "ai" || mode === "lawyer" ? (
        <div className="mt-4">
          <p className="mb-2 text-sm text-white/70">{mode === "ai" ? (korean ? "아래 질문을 복사해서 본인이 사용하는 ChatGPT, Claude, Gemini 등 원하는 AI에 붙여넣으세요." : "Copy this question into the AI you use.") : (korean ? "이 질문을 AI에 붙여넣으면 변호사에게 보낼 사건 요약 초안을 만들도록 요청할 수 있습니다." : "Use this prompt to ask your AI for a lawyer-ready summary draft.")}</p>
          <textarea readOnly className="rc-input min-h-52 font-sans text-xs leading-5" value={mode === "ai" ? askAiPrompt : lawyerPrompt} />
          <button type="button" onClick={() => void copyText(mode === "ai" ? askAiPrompt : lawyerPrompt)} className="mt-3 rounded-lg border border-[#d7b64d] bg-[#7A0C2E] px-5 py-2 text-sm font-semibold text-[#ffe18a]">{korean ? "복사" : "Copy"}</button>
        </div>
      ) : null}

      {mode !== "home" ? <button type="button" className="mt-4 text-sm text-[#f3d36a] underline" onClick={() => setMode("home")}>{korean ? "처음으로" : "Back to start"}</button> : null}
      {status ? <div className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/70">{status}</div> : null}
    </section>
  );
}
