"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

type Destination = "inbox" | "personal" | "case" | "evidence" | "lawyer_share";
type LegalCase = { id: string; case_number: number | null; title: string };

const CASE_DESTINATIONS = new Set<Destination>(["case", "evidence", "lawyer_share"]);

function caseLabel(item: LegalCase) {
  return `CASE-${String(item.case_number ?? "").padStart(6, "0")} · ${item.title}`;
}

export default function RCFileDestinationBridge() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState<Destination>("personal");
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [caseId, setCaseId] = useState("");
  const [loadingCases, setLoadingCases] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest<HTMLButtonElement>("button");
      if (!button) return;
      const text = (button.textContent || "").replace(/\s+/g, " ").trim();
      if (!(text.includes("중요 문서 추가") || text.includes("Add Important Document"))) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      fileRef.current?.click();
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  async function loadCases() {
    setLoadingCases(true);
    try {
      const response = await fetch(`/api/rooms/${roomId}/legal-cases`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({})) as { cases?: LegalCase[] };
      const next = Array.isArray(payload.cases) ? payload.cases : [];
      setCases(next);
      if (!caseId && next[0]?.id) setCaseId(next[0].id);
    } finally {
      setLoadingCases(false);
    }
  }

  function chooseDestination(next: Destination) {
    setDestination(next);
    setStatus("");
    if (CASE_DESTINATIONS.has(next) && cases.length === 0) void loadCases();
  }

  async function upload() {
    if (!files.length) return;
    if (CASE_DESTINATIONS.has(destination) && !caseId) {
      setStatus("사건을 먼저 선택해 주세요. / Choose a case first.");
      return;
    }

    setUploading(true);
    setStatus("");
    try {
      for (const file of files) {
        const form = new FormData();
        form.set("roomId", roomId);
        form.set("file", file);
        form.set("destinationType", destination);
        if (CASE_DESTINATIONS.has(destination)) form.set("caseId", caseId);
        const response = await fetch("/api/documents/upload", { method: "POST", body: form });
        const payload = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(payload.error || `Upload failed: ${file.name}`);
      }
      setStatus("저장 완료 / Saved");
      setFiles([]);
      if (fileRef.current) fileRef.current.value = "";
      window.setTimeout(() => setOpen(false), 450);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const destinationButton = (value: Destination, label: string) => (
    <button
      type="button"
      onClick={() => chooseDestination(value)}
      className={`rounded-xl border px-3 py-3 text-left text-sm ${destination === value ? "border-[#d7b64d] bg-[#d7b64d]/10 text-[#ffe18a]" : "border-white/10 bg-white/[0.03] text-white/80"}`}
    >
      {label}
    </button>
  );

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          const selected = Array.from(event.target.files || []);
          if (!selected.length) return;
          setFiles(selected);
          setDestination("personal");
          setCaseId("");
          setStatus("");
          setOpen(true);
        }}
      />

      {open ? (
        <div className="fixed inset-0 z-[620] grid place-items-center bg-black/65 p-4">
          <section className="w-full max-w-xl rounded-2xl border border-[#d7b64d]/70 bg-[#07111f] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-[#f3d36a]">파일을 어디에 저장할까요? / Save files to</div>
                <div className="mt-1 text-xs text-white/55">{files.map((file) => file.name).join(" · ")}</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70">닫기 / Close</button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {destinationButton("personal", "내 파일 / My files")}
              {destinationButton("case", "사건파일 / Case file")}
              {destinationButton("evidence", "증거 / Evidence")}
              {destinationButton("lawyer_share", "변호사 공유 / Lawyer share")}
              {destinationButton("inbox", "Inbox")}
            </div>

            {CASE_DESTINATIONS.has(destination) ? (
              <div className="mt-4">
                <div className="mb-2 text-xs font-semibold text-white/65">사건 선택 / Choose case</div>
                {loadingCases ? (
                  <div className="text-sm text-white/50">불러오는 중… / Loading…</div>
                ) : cases.length ? (
                  <select value={caseId} onChange={(event) => setCaseId(event.target.value)} className="w-full rounded-xl border border-white/15 bg-black/30 p-3 text-sm text-white">
                    <option value="">사건을 선택하세요 / Choose a case</option>
                    {cases.map((item) => <option key={item.id} value={item.id}>{caseLabel(item)}</option>)}
                  </select>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/55">저장할 사건이 없습니다. 먼저 사건파일을 만들어 주세요. / No case file yet.</div>
                )}
              </div>
            ) : null}

            {status ? <div className="mt-3 text-sm text-[#f3d36a]">{status}</div> : null}

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/70">취소 / Cancel</button>
              <button type="button" disabled={uploading} onClick={() => void upload()} className="rounded-xl border border-[#d7b64d] bg-[#7A0C2E] px-5 py-2 text-sm font-semibold text-[#ffe18a] disabled:opacity-50">
                {uploading ? "보내는 중… / Sending…" : "보내기 / Send"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
