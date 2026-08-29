"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

type Destination = "inbox" | "personal" | "case" | "evidence" | "lawyer_share";
type LegalCase = { id: string; case_number: number | null; title: string };
type RoomItem = { id: string; name: string; status?: string };

const CASE_DESTINATIONS = new Set<Destination>(["case", "evidence", "lawyer_share"]);

function caseLabel(item: LegalCase) {
  return `CASE-${String(item.case_number ?? "").padStart(6, "0")} · ${item.title}`;
}

export default function RCFileDestinationBridge() {
  const params = useParams<{ id: string }>();
  const currentRoomId = params.id;
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState<Destination>("personal");
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [targetRoomId, setTargetRoomId] = useState(currentRoomId);
  const [projectKey, setProjectKey] = useState("");
  const [folderName, setFolderName] = useState("");
  const [displayTitle, setDisplayTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [caseId, setCaseId] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(false);
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

  async function loadRooms() {
    setLoadingRooms(true);
    try {
      const response = await fetch("/api/rooms", { cache: "no-store" });
      const payload = await response.json().catch(() => ({})) as { rooms?: RoomItem[] };
      const next = Array.isArray(payload.rooms)
        ? payload.rooms.filter((room) => room.id && room.status !== "archived")
        : [];
      setRooms(next);
      if (!next.some((room) => room.id === targetRoomId)) {
        setTargetRoomId(next.find((room) => room.id === currentRoomId)?.id || next[0]?.id || currentRoomId);
      }
    } finally {
      setLoadingRooms(false);
    }
  }

  async function loadCases(roomId: string) {
    setLoadingCases(true);
    try {
      const response = await fetch(`/api/rooms/${roomId}/legal-cases`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({})) as { cases?: LegalCase[] };
      const next = response.ok && Array.isArray(payload.cases) ? payload.cases : [];
      setCases(next);
      setCaseId(next[0]?.id || "");
    } finally {
      setLoadingCases(false);
    }
  }

  function chooseDestination(next: Destination) {
    setDestination(next);
    setStatus("");
    if (CASE_DESTINATIONS.has(next)) void loadCases(targetRoomId);
  }

  async function upload() {
    if (!files.length || !targetRoomId) return;
    if (CASE_DESTINATIONS.has(destination) && !caseId) {
      setStatus("사건을 먼저 선택해 주세요. / Choose a case first.");
      return;
    }

    setUploading(true);
    setStatus("");
    try {
      for (const file of files) {
        const form = new FormData();
        form.set("roomId", targetRoomId);
        form.set("file", file);
        form.set("destinationType", destination);
        if (CASE_DESTINATIONS.has(destination)) form.set("caseId", caseId);
        if (projectKey.trim()) form.set("projectKey", projectKey.trim());
        if (folderName.trim()) form.set("folderName", folderName.trim());
        if (displayTitle.trim()) form.set("displayTitle", displayTitle.trim());
        if (purpose.trim()) form.set("purpose", purpose.trim());

        const response = await fetch("/api/documents/upload", { method: "POST", body: form });
        const payload = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(payload.error || `Upload failed: ${file.name}`);
      }
      setStatus("저장 완료 / Saved");
      setFiles([]);
      if (fileRef.current) fileRef.current.value = "";
      window.setTimeout(() => setOpen(false), 500);
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
          setTargetRoomId(currentRoomId);
          setProjectKey("");
          setFolderName("");
          setDisplayTitle(selected.length === 1 ? selected[0].name : "");
          setPurpose("");
          setCaseId("");
          setCases([]);
          setStatus("");
          setOpen(true);
          void loadRooms();
        }}
      />

      {open ? (
        <div className="fixed inset-0 z-[620] grid place-items-center bg-black/65 p-4">
          <section className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#d7b64d]/70 bg-[#07111f] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-[#f3d36a]">파일 저장 / Save files</div>
                <div className="mt-1 text-xs text-white/55">파일 선택 → Room → 프로젝트/폴더 → 바로 저장</div>
                <div className="mt-1 text-xs text-white/45">{files.map((file) => file.name).join(" · ")}</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70">닫기 / Close</button>
            </div>

            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold text-white/65">1. 저장할 Room / Choose Room</div>
              {loadingRooms ? (
                <div className="text-sm text-white/50">Room 불러오는 중… / Loading Rooms…</div>
              ) : (
                <select
                  value={targetRoomId}
                  onChange={(event) => {
                    const next = event.target.value;
                    setTargetRoomId(next);
                    setCaseId("");
                    setCases([]);
                    if (CASE_DESTINATIONS.has(destination)) void loadCases(next);
                  }}
                  className="w-full rounded-xl border border-white/15 bg-black/30 p-3 text-sm text-white"
                >
                  {rooms.length === 0 ? <option value={currentRoomId}>현재 Room / Current Room</option> : null}
                  {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
                </select>
              )}
            </div>

            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold text-white/65">2. 저장 종류 / Storage type</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {destinationButton("personal", "일반 파일 / Files")}
                {destinationButton("inbox", "Inbox")}
                {destinationButton("case", "사건파일 / Case file")}
                {destinationButton("evidence", "증거 / Evidence")}
                {destinationButton("lawyer_share", "변호사 공유 / Lawyer share")}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs text-white/65">
                프로젝트 / Project
                <input value={projectKey} onChange={(event) => setProjectKey(event.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 p-3 text-sm text-white" placeholder="예: 2026 Tax, My Book, Course A" />
              </label>
              <label className="text-xs text-white/65">
                폴더 / Folder
                <input value={folderName} onChange={(event) => setFolderName(event.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 p-3 text-sm text-white" placeholder="예: 영수증, Chapter 1, 과제" />
              </label>
              <label className="text-xs text-white/65">
                표시 제목 / Title
                <input value={displayTitle} onChange={(event) => setDisplayTitle(event.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 p-3 text-sm text-white" placeholder="파일 제목" />
              </label>
              <label className="text-xs text-white/65">
                용도 / Purpose
                <input value={purpose} onChange={(event) => setPurpose(event.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 p-3 text-sm text-white" placeholder="회계, 집필, 교육, 개인자료…" />
              </label>
            </div>

            {CASE_DESTINATIONS.has(destination) ? (
              <div className="mt-4">
                <div className="mb-2 text-xs font-semibold text-white/65">3. 사건 선택 / Choose case</div>
                {loadingCases ? (
                  <div className="text-sm text-white/50">불러오는 중… / Loading…</div>
                ) : cases.length ? (
                  <select value={caseId} onChange={(event) => setCaseId(event.target.value)} className="w-full rounded-xl border border-white/15 bg-black/30 p-3 text-sm text-white">
                    <option value="">사건을 선택하세요 / Choose a case</option>
                    {cases.map((item) => <option key={item.id} value={item.id}>{caseLabel(item)}</option>)}
                  </select>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/55">선택한 Room에 사건파일이 없습니다. / No case file in this Room.</div>
                )}
              </div>
            ) : null}

            {status ? <div className="mt-3 text-sm text-[#f3d36a]">{status}</div> : null}

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/70">취소 / Cancel</button>
              <button type="button" disabled={uploading || !targetRoomId} onClick={() => void upload()} className="rounded-xl border border-[#d7b64d] bg-[#7A0C2E] px-5 py-2 text-sm font-semibold text-[#ffe18a] disabled:opacity-50">
                {uploading ? "저장 중… / Saving…" : "바로 저장 / Save now"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
