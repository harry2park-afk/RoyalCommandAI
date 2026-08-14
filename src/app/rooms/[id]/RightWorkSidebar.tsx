"use client";

import { type ChangeEvent, type DragEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderOpen,
  GripVertical,
  HardDrive,
  Mail,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

const DEFAULT_WIDTH = 360;
const MIN_WIDTH = 280;
const MAX_WIDTH = 600;

const DEFAULT_APPS = [
  "chatgpt",
  "email",
  "instagram",
  "youtube",
  "drive",
  "calendar",
  "files",
  "netflix",
  "tasks",
  "approval",
];

type AppItem = {
  id: string;
  title: string;
  description: string;
  url?: string;
  icon: "mail" | "instagram" | "youtube" | "drive" | "calendar" | "files" | "tasks" | "approval" | "netflix" | "ai" | "docs";
};

type LocalFile = { name: string; size: number; url: string };

const APP_CATALOG: AppItem[] = [
  { id: "chatgpt", title: "ChatGPT", description: "내 ChatGPT 계정 열기", url: "https://chatgpt.com", icon: "ai" },
  { id: "email", title: "Email", description: "내 이메일 열기", url: "https://mail.google.com", icon: "mail" },
  { id: "instagram", title: "Instagram", description: "내 Instagram 열기", url: "https://www.instagram.com", icon: "instagram" },
  { id: "youtube", title: "YouTube", description: "내 YouTube 열기", url: "https://www.youtube.com", icon: "youtube" },
  { id: "drive", title: "Google Drive", description: "내 Drive 열기", url: "https://drive.google.com", icon: "drive" },
  { id: "calendar", title: "Google Calendar", description: "내 Calendar 열기", url: "https://calendar.google.com", icon: "calendar" },
  { id: "files", title: "My Files", description: "내 컴퓨터 파일 선택", icon: "files" },
  { id: "netflix", title: "Netflix", description: "내 Netflix 열기", url: "https://www.netflix.com", icon: "netflix" },
  { id: "tasks", title: "Tasks", description: "내 할 일 관리", icon: "tasks" },
  { id: "approval", title: "Approval", description: "승인할 작업 모아보기", icon: "approval" },
  { id: "docs", title: "Documents", description: "문서 작업 바로가기", url: "https://docs.google.com", icon: "docs" },
  { id: "claude", title: "Claude", description: "내 Claude 계정 열기", url: "https://claude.ai", icon: "ai" },
  { id: "gemini", title: "Gemini", description: "내 Gemini 계정 열기", url: "https://gemini.google.com", icon: "ai" },
  { id: "grok", title: "Grok", description: "내 Grok 계정 열기", url: "https://grok.com", icon: "ai" },
];

function badgeFor(app: AppItem) {
  const common = "grid h-11 w-11 shrink-0 place-items-center rounded-2xl border text-sm font-black shadow-sm";
  if (app.id === "chatgpt") return <span className={`${common} border-emerald-300/30 bg-emerald-400/15 text-emerald-200`}>GPT</span>;
  if (app.id === "email") return <span className={`${common} border-red-300/30 bg-red-400/15 text-red-200`}><Mail size={21} /></span>;
  if (app.id === "instagram") return <span className={`${common} border-pink-300/30 bg-gradient-to-br from-fuchsia-500/25 via-pink-500/20 to-amber-400/20 text-pink-100`}>IG</span>;
  if (app.id === "youtube") return <span className={`${common} border-red-300/30 bg-red-500/15 text-red-200`}>▶</span>;
  if (app.id === "drive") return <span className={`${common} border-sky-300/30 bg-sky-400/15 text-sky-200`}><HardDrive size={21} /></span>;
  if (app.id === "calendar") return <span className={`${common} border-blue-300/30 bg-blue-400/15 text-blue-200`}><CalendarDays size={21} /></span>;
  if (app.id === "files") return <span className={`${common} border-amber-300/30 bg-amber-400/15 text-amber-200`}><FolderOpen size={21} /></span>;
  if (app.id === "netflix") return <span className={`${common} border-red-300/30 bg-red-500/15 text-red-200`}>N</span>;
  if (app.id === "tasks") return <span className={`${common} border-cyan-300/30 bg-cyan-400/15 text-cyan-200`}><CheckSquare size={21} /></span>;
  if (app.id === "approval") return <span className={`${common} border-violet-300/30 bg-violet-400/15 text-violet-200`}>✓</span>;
  if (app.id === "docs") return <span className={`${common} border-indigo-300/30 bg-indigo-400/15 text-indigo-200`}><FileText size={21} /></span>;
  return <span className={`${common} border-white/15 bg-white/5 text-[var(--gold-soft)]`}>AI</span>;
}

export default function RightWorkSidebar() {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(DEFAULT_APPS);
  const [localFiles, setLocalFiles] = useState<LocalFile[]>([]);
  const draggingPanel = useRef(false);
  const previousWidth = useRef(DEFAULT_WIDTH);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draggedAppId = useRef<string | null>(null);

  useEffect(() => {
    try {
      const savedWidth = Number(window.localStorage.getItem("royalcommand:right-panel-width") || DEFAULT_WIDTH);
      const savedCollapsed = window.localStorage.getItem("royalcommand:right-panel-collapsed") === "1";
      const savedApps = window.localStorage.getItem("royalcommand:right-panel-apps");
      if (Number.isFinite(savedWidth)) {
        const safe = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, savedWidth));
        setWidth(safe);
        previousWidth.current = safe;
      }
      setCollapsed(savedCollapsed);
      if (savedApps) {
        const parsed = JSON.parse(savedApps);
        if (Array.isArray(parsed) && parsed.length) {
          const valid = parsed.filter((id) => typeof id === "string" && APP_CATALOG.some((app) => app.id === id));
          if (valid.length) setSelectedIds(valid);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem("royalcommand:right-panel-apps", JSON.stringify(selectedIds)); } catch {}
  }, [selectedIds]);

  useEffect(() => {
    function move(event: MouseEvent) {
      if (!draggingPanel.current) return;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - event.clientX));
      setWidth(next);
      previousWidth.current = next;
    }
    function up() {
      if (!draggingPanel.current) return;
      draggingPanel.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try { window.localStorage.setItem("royalcommand:right-panel-width", String(previousWidth.current)); } catch {}
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  const selectedApps = selectedIds.map((id) => APP_CATALOG.find((app) => app.id === id)).filter(Boolean) as AppItem[];
  const searchResults = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return [];
    return APP_CATALOG.filter((app) => `${app.title} ${app.description}`.toLowerCase().includes(clean));
  }, [query]);

  function startResize(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    draggingPanel.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    try { window.localStorage.setItem("royalcommand:right-panel-collapsed", next ? "1" : "0"); } catch {}
  }

  function addApp(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev : [...prev, id]);
    setQuery("");
  }

  function removeApp(id: string) {
    setSelectedIds((prev) => prev.filter((item) => item !== id));
  }

  function openApp(app: AppItem) {
    if (app.id === "files") {
      fileInputRef.current?.click();
      return;
    }
    if (app.url) window.open(app.url, "_blank", "noopener,noreferrer");
  }

  function onFilesPicked(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files || []);
    if (!picked.length) return;
    setLocalFiles((prev) => [
      ...prev,
      ...picked.map((file) => ({ name: file.name, size: file.size, url: URL.createObjectURL(file) })),
    ]);
    event.target.value = "";
  }

  function deleteLocalFile(index: number) {
    setLocalFiles((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== index);
    });
  }

  function onAppDragStart(event: DragEvent<HTMLDivElement>, id: string) {
    draggedAppId.current = id;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  }

  function onAppDrop(event: DragEvent<HTMLDivElement>, targetId: string) {
    event.preventDefault();
    const sourceId = draggedAppId.current || event.dataTransfer.getData("text/plain");
    if (!sourceId || sourceId === targetId) return;
    setSelectedIds((prev) => {
      const from = prev.indexOf(sourceId);
      const to = prev.indexOf(targetId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    draggedAppId.current = null;
  }

  if (collapsed) {
    return (
      <button type="button" onClick={toggle} className="fixed right-0 top-1/2 z-[100] flex h-16 w-9 -translate-y-1/2 items-center justify-center rounded-l-xl border border-r-0 border-white/20 bg-[#07111f] text-[var(--gold-soft)] shadow-xl" title="오른쪽 앱 패널 열기" aria-label="오른쪽 앱 패널 열기">
        <ChevronLeft size={22} />
      </button>
    );
  }

  return (
    <aside className="relative z-40 flex h-screen shrink-0 flex-col border-l border-white/10 bg-[#07111f]" style={{ width }}>
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onFilesPicked} />

      <button type="button" onMouseDown={startResize} className="absolute left-0 top-0 z-50 flex h-full w-4 -translate-x-1/2 cursor-col-resize items-center justify-center" title="좌우로 끌어서 폭 조절" aria-label="오른쪽 앱 패널 폭 조절">
        <GripVertical size={15} className="text-white/40" />
      </button>
      <button type="button" onClick={toggle} className="absolute left-0 top-1/2 z-50 flex h-16 w-9 -translate-x-full -translate-y-1/2 items-center justify-center rounded-l-xl border border-r-0 border-white/20 bg-[#07111f] text-[var(--gold-soft)] shadow-xl" title="오른쪽 앱 패널 닫기" aria-label="오른쪽 앱 패널 닫기">
        <ChevronRight size={22} />
      </button>

      <div className="shrink-0 border-b border-white/10 p-3">
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="앱, 파일, AI 찾기" className="w-full rounded-xl border border-white/15 bg-black/30 py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--gold)]/60" />
        </div>
        {searchResults.length > 0 ? (
          <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-[#0a1626] p-1.5 shadow-xl">
            {searchResults.map((app) => {
              const added = selectedIds.includes(app.id);
              return (
                <button key={app.id} type="button" onClick={() => added ? openApp(app) : addApp(app.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-white/5">
                  {badgeFor(app)}
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{app.title}</span><span className="block truncate text-[10px] text-[var(--muted)]">{app.description}</span></span>
                  {!added ? <Plus size={16} className="text-[var(--gold-soft)]" /> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          {selectedApps.map((app) => (
            <div
              key={app.id}
              draggable
              onDragStart={(event) => onAppDragStart(event, app.id)}
              onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
              onDrop={(event) => onAppDrop(event, app.id)}
              className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 transition hover:border-[var(--gold)]/35 hover:bg-white/[0.04]"
            >
              {badgeFor(app)}
              <button type="button" onClick={() => openApp(app)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-semibold">{app.title}</span>
                <span className="mt-0.5 block truncate text-[11px] text-[var(--muted)]">{app.description}</span>
              </button>
              <button type="button" onClick={() => openApp(app)} className="shrink-0 rounded-lg border border-white/10 px-2 py-1.5 text-[10px] font-semibold text-[var(--gold-soft)] hover:bg-white/5" title={`${app.title} 열기`}>
                열기
              </button>
              <button type="button" onClick={() => removeApp(app.id)} className="shrink-0 rounded-lg p-1.5 text-white/35 hover:bg-red-500/10 hover:text-red-300" title="패널에서 제거" aria-label={`${app.title} 제거`}>
                <Trash2 size={14} />
              </button>
              <span className="shrink-0 cursor-grab rounded-lg p-1.5 text-white/30 group-hover:text-white/60" title="끌어서 순서 변경">
                <GripVertical size={17} />
              </span>
            </div>
          ))}
        </div>

        {localFiles.length > 0 ? (
          <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-2">
            <div className="mb-1 px-1 text-[11px] font-semibold text-[var(--gold-soft)]">이번 세션에서 선택한 파일</div>
            {localFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-lg px-1 py-1.5 text-xs hover:bg-white/[0.03]">
                <a href={file.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate" title={file.name}>{file.name}</a>
                <button type="button" onClick={() => deleteLocalFile(index)} className="rounded p-1 text-[var(--muted)] hover:text-red-300" title="목록에서 지우기"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <a href="/" className="m-3 mt-0 block shrink-0 rounded-2xl border border-[var(--gold)]/25 bg-[var(--gold)]/5 p-3 text-left hover:bg-[var(--gold)]/10" aria-label="스폰서 광고 영역">
        <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--gold-soft)]">Sponsored</div>
        <div className="mt-1 text-sm font-semibold">광고 영역</div>
        <div className="mt-1 text-[10px] leading-4 text-[var(--muted)]">광고 네트워크 연결 후 고객이 광고를 눌러 상품·서비스를 확인하는 자리입니다.</div>
      </a>
    </aside>
  );
}
