"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { FileText, FolderOpen, MessageCircle, Scale, Sparkles, X } from "lucide-react";

type Workspace = { caseStory: string; desiredOutcome: string; updatedAt: string | null };
type EvidenceItem = { id: string; title: string; event_date: string | null; description: string; document_id: string | null; created_at: string };
type DocumentItem = { id: string; filename: string; mime_type: string; size_bytes: number; created_at: string };
type StoryEntry = { id: string; raw_transcript: string; ai_summary: string; audio_document_id: string | null; recorded_at: string; created_at: string; updated_at: string };
type LegalPayload = { enabled: boolean; languageTag?: string; workspace?: Workspace; evidence?: EvidenceItem[]; documents?: DocumentItem[] };
type Mode = "home" | "story" | "evidence" | "ai" | "lawyer";
type EditField = "raw" | "ai";

export default function LegalRoomStarter() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [languageTag, setLanguageTag] = useState("en-AU");
  const [minimized, setMinimized] = useState(false);
  const [mode, setMode] = useState<Mode>("home");
  const [workspace, setWorkspace] = useState<Workspace>({ caseStory: "", desiredOutcome: "", updatedAt: null });
  const [storyEntries, setStoryEntries] = useState<StoryEntry[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceDate, setEvidenceDate] = useState("");
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [editingId, setEditingId] = useState("");
  const [draftRaw, setDraftRaw] = useState("");
  const [draftAi, setDraftAi] = useState("");
  const [savingEntry, setSavingEntry] = useState(false);
  const [listening, setListening] = useState("");
  const [playingId, setPlayingId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<{ stop?: () => void } | null>(null);

  const korean = languageTag.toLowerCase().startsWith("ko");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/rooms/${roomId}/legal-workspace`, { cache: "no-store" })
      .then(async (response) => ({ response, payload: await response.json().catch(() => ({})) as LegalPayload }))
      .then(({ response, payload }) => {
        if (cancelled) return;
        if (!response.ok) { setLoaded(true); return; }
        setEnabled(Boolean(payload.enabled));
        setLanguageTag(payload.languageTag || "en-AU");
        if (payload.workspace) setWorkspace(payload.workspace);
        setEvidence(Array.isArray(payload.evidence) ? payload.evidence : []);
        setDocuments(Array.isArray(payload.documents) ? payload.documents : []);
        setLoaded(true);
      })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [roomId]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const refresh = () => {
      void fetch(`/api/rooms/${roomId}/legal-story`, { cache: "no-store" })
        .then(async (response) => ({ response, payload: await response.json().catch(() => ({})) as { entries?: StoryEntry[] } }))
        .then(({ response, payload }) => {
          if (cancelled || !response.ok) return;
          setStoryEntries(Array.isArray(payload.entries) ? payload.entries : []);
        })
        .catch(() => undefined);
    };
    refresh();
    window.addEventListener("rc:legal-story-saved", refresh);
    return () => { cancelled = true; window.removeEventListener("rc:legal-story-saved", refresh); };
  }, [enabled, roomId]);

  useEffect(() => () => {
    recognitionRef.current?.stop?.();
    audioRef.current?.pause();
  }, []);

  const askAiPrompt = useMemo(() => [
    "다음은 제가 직접 기록한 사건 내용입니다.",
    "사실을 임의로 추가하지 말고, 아래 내용을 바탕으로 다음을 정리해 주세요:",
    "1) 핵심 사실 2) 시간순 정리 3) 빠진 정보와 추가로 확인할 질문 4) 가지고 있어야 할 증거 목록 5) 변호사에게 물어볼 질문.",
    "확실하지 않은 부분은 확실하지 않다고 표시해 주세요.", "",
    `사건 기록:\n${workspace.caseStory || "아직 기록 없음"}`, "",
    `제가 원하는 결과:\n${workspace.desiredOutcome || "아직 기록 없음"}`,
  ].join("\n"), [workspace.caseStory, workspace.desiredOutcome]);

  const lawyerPrompt = useMemo(() => [
    "다음 사건 기록을 변호사에게 처음 보내기 좋은 짧고 정확한 사건 요약으로 정리해 주세요.",
    "사실을 임의로 만들지 말고, 날짜/사람/사건/증거/제가 원하는 결과를 구분해 주세요.",
    "마지막에는 변호사에게 확인할 질문 목록을 만들어 주세요.", "",
    `사건 기록:\n${workspace.caseStory || "아직 기록 없음"}`, "",
    `제가 원하는 결과:\n${workspace.desiredOutcome || "아직 기록 없음"}`,
  ].join("\n"), [workspace.caseStory, workspace.desiredOutcome]);

  async function copyText(text: string, message?: string) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(message || (korean ? "복사했습니다." : "Copied."));
    } catch { setStatus(korean ? "복사하지 못했습니다." : "Could not copy."); }
  }

  function startCaseConversation() {
    window.dispatchEvent(new CustomEvent("rc:ai-helper-open"));
    setMinimized(true);
  }

  function beginEdit(entry: StoryEntry) {
    setEditingId(entry.id);
    setDraftRaw(entry.raw_transcript);
    setDraftAi(entry.ai_summary);
    setStatus("");
  }

  async function saveEntry(entryId: string) {
    setSavingEntry(true);
    try {
      const response = await fetch(`/api/rooms/${roomId}/legal-story`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, rawTranscript: draftRaw, aiSummary: draftAi }),
      });
      const payload = await response.json().catch(() => ({})) as { entry?: StoryEntry; error?: string };
      if (!response.ok || !payload.entry) { setStatus(payload.error || (korean ? "수정 내용을 저장하지 못했습니다." : "Could not save changes.")); return; }
      setStoryEntries((current) => current.map((item) => item.id === entryId ? payload.entry! : item));
      setEditingId("");
      setStatus(korean ? "수정 내용을 저장했습니다." : "Changes saved.");
    } finally { setSavingEntry(false); }
  }

  function startVoiceEdit(entry: StoryEntry, field: EditField) {
    if (editingId !== entry.id) beginEdit(entry);
    const w = window as Window & {
      SpeechRecognition?: new () => any;
      webkitSpeechRecognition?: new () => any;
    };
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) { setStatus(korean ? "이 브라우저에서는 음성 수정 기능을 사용할 수 없습니다." : "Voice editing is unavailable in this browser."); return; }
    recognitionRef.current?.stop?.();
    const recognition = new Recognition();
    recognition.lang = korean ? "ko-KR" : languageTag;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const spoken = Array.from(event.results || []).map((result: any) => result?.[0]?.transcript || "").join(" ").trim();
      if (!spoken) return;
      if (field === "raw") setDraftRaw((current) => current.trim() ? `${current.trim()} ${spoken}` : spoken);
      else setDraftAi((current) => current.trim() ? `${current.trim()} ${spoken}` : spoken);
    };
    recognition.onerror = () => setStatus(korean ? "음성 입력을 받지 못했습니다." : "Voice input failed.");
    recognition.onend = () => { setListening(""); recognitionRef.current = null; };
    recognitionRef.current = recognition;
    setListening(`${entry.id}:${field}`);
    recognition.start();
  }

  function recordText(entry: StoryEntry) {
    return [
      `${korean ? "기록 일시" : "Recorded"}: ${new Date(entry.recorded_at).toLocaleString()}`,
      "",
      korean ? "[내가 이야기한 내용]" : "[My words]",
      entry.raw_transcript,
      "",
      korean ? "[AI 정리]" : "[AI summary]",
      entry.ai_summary || (korean ? "아직 없음" : "Not available yet"),
    ].join("\n");
  }

  function recipientText(entry: StoryEntry, audience: "lawyer" | "court" | "other") {
    const base = recordText(entry);
    if (audience === "lawyer") return `${korean ? "변호사 검토용 사건 기록" : "Case record for lawyer review"}\n\n${base}`;
    if (audience === "court") return `${korean ? "법원·재판 준비용 사실 기록 (공식 제출 서식 아님)" : "Court / tribunal preparation record (not an official filing form)"}\n\n${base}`;
    return `${korean ? "공유용 사건 기록" : "Case record to share"}\n\n${base}`;
  }

  function sendByEmail(entry: StoryEntry, audience: "lawyer" | "other") {
    const subject = audience === "lawyer" ? (korean ? "사건 기록 검토 요청" : "Case record for review") : (korean ? "사건 기록 공유" : "Shared case record");
    const body = recipientText(entry, audience);
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  async function prepareCourt(entry: StoryEntry) {
    await copyText(recipientText(entry, "court"), korean ? "법원·재판 준비용 기록을 복사했습니다. 제출 전 내용을 확인하세요." : "Court-preparation record copied. Review before filing.");
  }

  async function playAudio(entry: StoryEntry) {
    if (!entry.audio_document_id) return;
    try {
      const response = await fetch(`/api/rooms/${roomId}/legal-story/${entry.id}/audio`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({})) as { url?: string; error?: string };
      if (!response.ok || !payload.url) { setStatus(payload.error || (korean ? "녹음을 열 수 없습니다." : "Could not open recording.")); return; }
      audioRef.current?.pause();
      const audio = new Audio(payload.url);
      audioRef.current = audio;
      setPlayingId(entry.id);
      audio.onended = () => setPlayingId("");
      audio.onerror = () => { setPlayingId(""); setStatus(korean ? "녹음을 재생하지 못했습니다." : "Could not play recording."); };
      await audio.play();
    } catch { setPlayingId(""); }
  }

  async function deleteAudio(entry: StoryEntry) {
    if (!entry.audio_document_id) return;
    if (!window.confirm(korean ? "이 녹음 파일을 삭제하시겠습니까? 글 기록은 그대로 남습니다." : "Delete this recording? The written record will remain.")) return;
    const response = await fetch(`/api/rooms/${roomId}/legal-story/${entry.id}/audio`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) { setStatus(payload.error || (korean ? "녹음을 삭제하지 못했습니다." : "Could not delete recording.")); return; }
    audioRef.current?.pause();
    setPlayingId("");
    setStoryEntries((current) => current.map((item) => item.id === entry.id ? { ...item, audio_document_id: null } : item));
    setStatus(korean ? "녹음 파일을 삭제했습니다." : "Recording deleted.");
  }

  async function addEvidence() {
    const file = fileRef.current?.files?.[0] || null;
    const title = evidenceTitle.trim() || file?.name || "";
    if (!title) { setStatus(korean ? "증거 제목이나 파일을 하나 넣어 주세요." : "Add an evidence title or file."); return; }
    setUploading(true); setStatus("");
    try {
      let documentId: string | null = null;
      if (file) {
        const form = new FormData(); form.set("roomId", roomId); form.set("file", file);
        const uploadResponse = await fetch("/api/documents/upload", { method: "POST", body: form });
        const uploadPayload = await uploadResponse.json().catch(() => ({})) as { document?: { id?: string }; error?: string };
        if (!uploadResponse.ok || !uploadPayload.document?.id) { setStatus(uploadPayload.error || (korean ? "파일을 올리지 못했습니다." : "Could not upload file.")); return; }
        documentId = uploadPayload.document.id;
      }
      const response = await fetch(`/api/rooms/${roomId}/legal-workspace`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, eventDate: evidenceDate || null, description: evidenceDescription, documentId }) });
      const payload = await response.json().catch(() => ({})) as { evidence?: EvidenceItem; error?: string };
      if (!response.ok || !payload.evidence) { setStatus(payload.error || (korean ? "증거 기록을 저장하지 못했습니다." : "Could not save evidence.")); return; }
      setEvidence((current) => [payload.evidence!, ...current]);
      if (file && documentId) setDocuments((current) => [{ id: documentId, filename: file.name, mime_type: file.type, size_bytes: file.size, created_at: new Date().toISOString() }, ...current]);
      setEvidenceTitle(""); setEvidenceDate(""); setEvidenceDescription(""); if (fileRef.current) fileRef.current.value = "";
      setStatus(korean ? "증거를 보관했습니다." : "Evidence saved.");
    } finally { setUploading(false); }
  }

  if (!loaded || !enabled) return null;
  if (minimized) return <button type="button" className="fixed left-[245px] top-[104px] z-[240] rounded-full border border-[#d7b64d] bg-[#7A0C2E] px-4 py-2 text-sm font-semibold text-[#ffe18a] shadow-lg max-lg:left-3 max-lg:top-20" onClick={() => setMinimized(false)}>{korean ? "⚖ 법률 도구" : "⚖ Legal tools"}</button>;

  const documentById = new Map(documents.map((item) => [item.id, item]));
  const smallButton = "rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/[0.08]";

  return (
    <section className="fixed left-[245px] right-[185px] top-[104px] z-[230] mx-auto max-h-[calc(100dvh-205px)] max-w-[900px] overflow-y-auto rounded-2xl border border-[#d7b64d]/70 bg-[#07111f]/[0.98] p-4 shadow-[0_18px_55px_rgba(0,0,0,.58)] max-lg:left-3 max-lg:right-3 max-lg:top-20 max-lg:max-h-[calc(100dvh-110px)]">
      <div className="flex items-start justify-between gap-3"><div><div className="text-lg font-semibold text-[#f3d36a]">{korean ? "내 법률방" : "My Legal Room"}</div><p className="mt-1 text-sm text-white/70">{korean ? "어려운 법률용어 없이, 먼저 말하고 기록하면 됩니다." : "Start by talking and keeping a record. No legal jargon needed."}</p></div><button type="button" onClick={() => setMinimized(true)} className="grid h-8 w-8 place-items-center rounded-full text-white/60 hover:bg-white/10" title={korean ? "줄이기" : "Minimize"}><X size={17} /></button></div>

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
        <button type="button" onClick={startCaseConversation} className="rounded-xl border border-[#d7b64d]/45 bg-[#d7b64d]/10 p-3 text-left hover:bg-[#d7b64d]/15"><MessageCircle size={19} className="text-[#f3d36a]" /><div className="mt-2 text-sm font-semibold">{korean ? "내 사건 이야기하기" : "Tell my story"}</div></button>
        <button type="button" onClick={() => setMode("story")} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:bg-white/[0.06]"><FileText size={19} className="text-[#f3d36a]" /><div className="mt-2 text-sm font-semibold">{korean ? "사건 기록" : "Case record"}</div></button>
        <button type="button" onClick={() => setMode("evidence")} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:bg-white/[0.06]"><FolderOpen size={19} className="text-[#f3d36a]" /><div className="mt-2 text-sm font-semibold">{korean ? "증거 보관" : "Evidence"}</div></button>
        <button type="button" onClick={() => setMode("ai")} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:bg-white/[0.06]"><Sparkles size={19} className="text-[#f3d36a]" /><div className="mt-2 text-sm font-semibold">{korean ? "AI에게 물어보기" : "Ask my AI"}</div></button>
        <button type="button" onClick={() => setMode("lawyer")} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:bg-white/[0.06]"><Scale size={19} className="text-[#f3d36a]" /><div className="mt-2 text-sm font-semibold">{korean ? "변호사 준비" : "Prepare for lawyer"}</div></button>
      </div>

      {mode === "home" ? <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/75">{korean ? "먼저 ‘내 사건 이야기하기’를 눌러 편하게 말씀해 주세요. 올리면 고객의 말, AI 정리본, 녹음이 사건 기록에 자동 저장됩니다." : "Start with ‘Tell my story’. Your words, AI summary and recording are saved automatically in Case record."}</div> : null}

      {mode === "story" ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-3"><div><div className="text-sm font-semibold text-[#f3d36a]">{korean ? "저장된 사건 기록" : "Saved case records"}</div><div className="mt-1 text-xs text-white/55">{korean ? "말한 내용과 AI 정리본을 수정하고, 녹음을 듣거나 삭제하고, 필요한 곳에 보낼 수 있습니다." : "Edit your words and AI summary, play/delete recordings, and prepare the record for sharing."}</div></div><div className="text-xs text-white/45">{storyEntries.length}{korean ? "건" : " records"}</div></div>

          <div className="space-y-3">
            {storyEntries.length ? storyEntries.map((entry) => {
              const editing = editingId === entry.id;
              return (
                <article key={entry.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2"><div className="text-xs font-semibold text-[#f3d36a]">{new Date(entry.recorded_at).toLocaleString()}</div>{entry.audio_document_id ? <div className="flex gap-2"><button type="button" className={smallButton} onClick={() => void playAudio(entry)}>{playingId === entry.id ? (korean ? "재생 중…" : "Playing…") : (korean ? "▶ 녹음 듣기" : "▶ Play recording")}</button><button type="button" className={smallButton} onClick={() => void deleteAudio(entry)}>{korean ? "녹음 삭제" : "Delete recording"}</button></div> : null}</div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3"><div className="mb-2 flex items-center justify-between gap-2"><div className="text-xs font-semibold text-white/55">{korean ? "내가 이야기한 내용" : "My words"}</div>{editing ? <button type="button" className={smallButton} onClick={() => startVoiceEdit(entry, "raw")}>{listening === `${entry.id}:raw` ? (korean ? "듣는 중…" : "Listening…") : (korean ? "🎙 말로 수정" : "🎙 Voice edit")}</button> : null}</div>{editing ? <textarea className="rc-input min-h-36 font-sans text-sm leading-6" value={draftRaw} onChange={(event) => setDraftRaw(event.target.value)} /> : <div className="whitespace-pre-wrap text-sm leading-6 text-white/85">{entry.raw_transcript}</div>}</div>
                    <div className="rounded-lg border border-[#d7b64d]/20 bg-[#d7b64d]/[0.04] p-3"><div className="mb-2 flex items-center justify-between gap-2"><div className="text-xs font-semibold text-[#f3d36a]">{korean ? "AI 정리" : "AI summary"}</div>{editing ? <button type="button" className={smallButton} onClick={() => startVoiceEdit(entry, "ai")}>{listening === `${entry.id}:ai` ? (korean ? "듣는 중…" : "Listening…") : (korean ? "🎙 말로 수정" : "🎙 Voice edit")}</button> : null}</div>{editing ? <textarea className="rc-input min-h-36 font-sans text-sm leading-6" value={draftAi} onChange={(event) => setDraftAi(event.target.value)} /> : <div className="whitespace-pre-wrap text-sm leading-6 text-white/80">{entry.ai_summary || (korean ? "AI 정리 저장 중 또는 아직 없음" : "AI summary is still saving or not available yet")}</div>}</div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {editing ? <><button type="button" disabled={savingEntry} onClick={() => void saveEntry(entry.id)} className="rounded-lg border border-[#d7b64d] bg-[#7A0C2E] px-3 py-1.5 text-xs font-semibold text-[#ffe18a] disabled:opacity-50">{savingEntry ? (korean ? "저장 중…" : "Saving…") : (korean ? "수정 저장" : "Save changes")}</button><button type="button" className={smallButton} onClick={() => setEditingId("")}>{korean ? "취소" : "Cancel"}</button></> : <button type="button" className={smallButton} onClick={() => beginEdit(entry)}>{korean ? "수정" : "Edit"}</button>}
                    <button type="button" className={smallButton} onClick={() => void copyText(recordText(entry))}>{korean ? "복사" : "Copy"}</button>
                    <button type="button" className={smallButton} onClick={() => sendByEmail(entry, "lawyer")}>{korean ? "변호사에게" : "To lawyer"}</button>
                    <button type="button" className={smallButton} onClick={() => void prepareCourt(entry)}>{korean ? "법원·재판 준비용" : "Court prep"}</button>
                    <button type="button" className={smallButton} onClick={() => sendByEmail(entry, "other")}>{korean ? "다른 사람에게" : "Share with someone"}</button>
                  </div>
                </article>
              );
            }) : <div className="rounded-xl border border-white/10 bg-black/20 p-5 text-sm text-white/50">{korean ? "아직 저장된 사건 기록이 없습니다. ‘내 사건 이야기하기’에서 말씀한 뒤 ‘내 말 올리기’를 누르면 여기에 자동 저장됩니다." : "No case records saved yet. Use ‘Tell my story’ and send your words; the record will appear here automatically."}</div>}
          </div>
        </div>
      ) : null}

      {mode === "evidence" ? <div className="mt-4 space-y-3"><div className="grid gap-2 md:grid-cols-2"><input className="rc-input" value={evidenceTitle} onChange={(event) => setEvidenceTitle(event.target.value)} placeholder={korean ? "증거 제목" : "Evidence title"} /><input className="rc-input" type="date" value={evidenceDate} onChange={(event) => setEvidenceDate(event.target.value)} /></div><textarea className="rc-input min-h-20 font-sans text-sm" value={evidenceDescription} onChange={(event) => setEvidenceDescription(event.target.value)} placeholder={korean ? "이 증거가 무엇을 보여주는지 간단히 적으세요." : "Briefly say what this evidence shows."} /><input ref={fileRef} className="block w-full text-sm text-white/70" type="file" accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx" /><button type="button" disabled={uploading} onClick={() => void addEvidence()} className="rounded-lg border border-[#d7b64d] bg-[#7A0C2E] px-5 py-2 text-sm font-semibold text-[#ffe18a] disabled:opacity-50">{uploading ? (korean ? "보관 중…" : "Saving…") : (korean ? "증거 보관" : "Save evidence")}</button><div className="space-y-2 pt-2">{evidence.length ? evidence.map((item) => { const document = item.document_id ? documentById.get(item.document_id) : null; return <div key={item.id} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm"><div className="font-semibold text-white">{item.title}</div><div className="mt-1 text-xs text-white/55">{item.event_date || new Date(item.created_at).toLocaleDateString()}{document ? ` · ${document.filename}` : ""}</div>{item.description ? <div className="mt-2 text-white/70">{item.description}</div> : null}</div>; }) : <div className="text-sm text-white/50">{korean ? "아직 보관한 증거가 없습니다." : "No evidence saved yet."}</div>}</div></div> : null}

      {mode === "ai" || mode === "lawyer" ? <div className="mt-4"><p className="mb-2 text-sm text-white/70">{mode === "ai" ? (korean ? "아래 질문을 복사해서 본인이 사용하는 ChatGPT, Claude, Gemini 등 원하는 AI에 붙여넣으세요." : "Copy this question into the AI you use.") : (korean ? "이 질문을 AI에 붙여넣으면 변호사에게 보낼 사건 요약 초안을 만들도록 요청할 수 있습니다." : "Use this prompt to ask your AI for a lawyer-ready summary draft.")}</p><textarea readOnly className="rc-input min-h-52 font-sans text-xs leading-5" value={mode === "ai" ? askAiPrompt : lawyerPrompt} /><button type="button" onClick={() => void copyText(mode === "ai" ? askAiPrompt : lawyerPrompt)} className="mt-3 rounded-lg border border-[#d7b64d] bg-[#7A0C2E] px-5 py-2 text-sm font-semibold text-[#ffe18a]">{korean ? "복사" : "Copy"}</button></div> : null}

      {mode !== "home" ? <button type="button" className="mt-4 text-sm text-[#f3d36a] underline" onClick={() => setMode("home")}>{korean ? "처음으로" : "Back to start"}</button> : null}
      {status ? <div className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/70">{status}</div> : null}
    </section>
  );
}
