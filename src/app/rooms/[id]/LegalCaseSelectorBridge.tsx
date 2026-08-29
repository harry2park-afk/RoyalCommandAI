"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FolderOpen, Plus, X } from "lucide-react";

type LegalCase = {
  id: string;
  case_number: number | null;
  title: string;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
};

function storageKey(roomId: string) {
  return `royalcommand:legal:${roomId}:active-case`;
}

function fileNumber(value: number | null) {
  return value ? `CASE-${String(value).padStart(6, "0")}` : "CASE";
}

export default function LegalCaseSelectorBridge() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const [open, setOpen] = useState(false);
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function loadCases() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/rooms/${roomId}/legal-cases`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({})) as { cases?: LegalCase[]; error?: string };
      if (!response.ok) {
        setError(payload.error || "사건 파일을 불러오지 못했습니다. / Could not load case files.");
        return;
      }
      setCases(Array.isArray(payload.cases) ? payload.cases.filter((item) => item.status !== "archived") : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const onClickCapture = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest<HTMLButtonElement>("button");
      if (!button) return;
      const text = (button.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
      const isTellStory = text.includes("내 사건 이야기하기") || text.includes("tell my story");
      if (!isTellStory) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setOpen(true);
      void loadCases();
    };

    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [roomId]);

  async function chooseCase(item: LegalCase) {
    setError("");
    try {
      const response = await fetch(`/api/rooms/${roomId}/legal-cases`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: item.id, title: item.title }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        setError(payload.error || "사건 파일을 선택하지 못했습니다. / Could not select case file.");
        return;
      }
    } catch {
      setError("사건 파일을 선택하지 못했습니다. / Could not select case file.");
      return;
    }

    window.sessionStorage.setItem(storageKey(roomId), item.id);
    window.sessionStorage.setItem(`${storageKey(roomId)}:title`, item.title);
    window.sessionStorage.setItem(`${storageKey(roomId)}:number`, fileNumber(item.case_number));
    window.dispatchEvent(new CustomEvent("rc:legal-case-selected", { detail: { caseId: item.id, title: item.title, caseNumber: item.case_number } }));
    setOpen(false);
    window.setTimeout(() => window.dispatchEvent(new CustomEvent("rc:ai-helper-open")), 30);
  }

  async function createCase() {
    const title = newTitle.trim();
    if (!title) {
      setError("새 사건 제목을 입력해 주세요. / Enter a title for the new case.");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const response = await fetch(`/api/rooms/${roomId}/legal-cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const payload = await response.json().catch(() => ({})) as { case?: LegalCase; error?: string };
      if (!response.ok || !payload.case) {
        setError(payload.error || "새 사건을 만들지 못했습니다. / Could not create case.");
        return;
      }
      setNewTitle("");
      await chooseCase(payload.case);
    } finally {
      setCreating(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[520] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <section className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[#d7b64d]/70 bg-[#07111f] shadow-[0_24px_80px_rgba(0,0,0,.75)]">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-xl font-semibold text-[#f3d36a]">어떤 사건에 추가할까요? / Choose a case file</h2>
            <p className="mt-1 text-sm text-white/65">기존 사건을 선택하거나 새 사건을 만든 뒤 말하기·타이핑을 시작하세요. / Select an existing case or create a new one before adding your story.</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full text-white/70 hover:bg-white/10" title="Close"><X size={18} /></button>
        </div>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto p-5">
          {loading ? <div className="text-sm text-white/60">사건 파일 불러오는 중… / Loading case files…</div> : null}
          {!loading && cases.length ? cases.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => void chooseCase(item)}
              className="flex w-full items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left hover:border-[#d7b64d]/55 hover:bg-[#d7b64d]/[0.06]"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#d7b64d]/35 bg-[#d7b64d]/10 text-[#f3d36a]"><FolderOpen size={21} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold tracking-wide text-[#f3d36a]">{fileNumber(item.case_number)}</span>
                <span className="mt-1 block truncate text-base font-semibold text-white">{item.title}</span>
                <span className="mt-1 block text-xs text-white/45">최근 수정 / Updated: {new Date(item.updated_at).toLocaleString()}</span>
              </span>
              <span className="text-sm font-semibold text-[#f3d36a]">선택 / Select →</span>
            </button>
          )) : null}

          {!loading && !cases.length ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">아직 사건 파일이 없습니다. 아래에서 첫 사건을 만들어 주세요. / No case files yet. Create your first case below.</div>
          ) : null}
        </div>

        <div className="border-t border-white/10 bg-black/20 p-5">
          <div className="mb-2 text-sm font-semibold text-[#f3d36a]">+ 새로운 사건 만들기 / New case</div>
          <div className="flex gap-2 max-sm:flex-col">
            <input
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void createCase(); } }}
              className="rc-input min-w-0 flex-1"
              placeholder="예: 돈을 빌려주고 못 받은 사건 / e.g. Unpaid loan matter"
              autoFocus
            />
            <button type="button" disabled={creating} onClick={() => void createCase()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d7b64d] bg-[#7A0C2E] px-5 py-2 font-semibold text-[#ffe18a] disabled:opacity-50"><Plus size={16} />{creating ? "만드는 중…" : "새 사건 만들기 / Create"}</button>
          </div>
          {error ? <div className="mt-3 rounded-lg border border-amber-400/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">{error}</div> : null}
        </div>
      </section>
    </div>
  );
}
