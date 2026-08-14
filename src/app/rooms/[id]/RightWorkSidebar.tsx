"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, GripVertical, Plus, Search, Trash2 } from "lucide-react";

const DEFAULT_WIDTH = 225;
const MIN_WIDTH = 175;
const MAX_WIDTH = 390;

const DEFAULT_APPS = ["chatgpt", "email", "instagram", "youtube", "drive", "calendar", "files", "netflix", "tasks", "approval"];

type AppItem = {
  id: string;
  title: string;
  description: string;
  url?: string;
  brandLabel: string;
  brandSlug?: string;
  brandColor?: string;
  brandBg: string;
  brandText: string;
};

type LocalFile = { name: string; size: number; url: string };

const APP_CATALOG: AppItem[] = [
  { id: "chatgpt", title: "ChatGPT", description: "내 ChatGPT", url: "https://chatgpt.com", brandLabel: "ChatGPT", brandSlug: "openai", brandColor: "FFFFFF", brandBg: "#10a37f", brandText: "#ffffff" },
  { id: "email", title: "Email", description: "내 이메일", url: "https://mail.google.com", brandLabel: "Gmail", brandSlug: "gmail", brandBg: "#ffffff", brandText: "#202124" },
  { id: "instagram", title: "Instagram", description: "내 Instagram", url: "https://www.instagram.com", brandLabel: "Instagram", brandSlug: "instagram", brandColor: "FFFFFF", brandBg: "linear-gradient(135deg,#833AB4,#E1306C,#F77737)", brandText: "#ffffff" },
  { id: "youtube", title: "YouTube", description: "내 YouTube", url: "https://www.youtube.com", brandLabel: "YouTube", brandSlug: "youtube", brandColor: "FF0000", brandBg: "#ffffff", brandText: "#111111" },
  { id: "drive", title: "Google Drive", description: "내 Drive", url: "https://drive.google.com", brandLabel: "Google Drive", brandSlug: "googledrive", brandBg: "#ffffff", brandText: "#202124" },
  { id: "calendar", title: "Google Calendar", description: "내 Calendar", url: "https://calendar.google.com", brandLabel: "Calendar", brandSlug: "googlecalendar", brandBg: "#ffffff", brandText: "#202124" },
  { id: "files", title: "My Files", description: "내 컴퓨터 파일", brandLabel: "My Files", brandBg: "#f6c453", brandText: "#111827" },
  { id: "netflix", title: "Netflix", description: "내 Netflix", url: "https://www.netflix.com", brandLabel: "NETFLIX", brandSlug: "netflix", brandColor: "E50914", brandBg: "#080808", brandText: "#E50914" },
  { id: "tasks", title: "Tasks", description: "내 할 일 관리", brandLabel: "Tasks", brandBg: "#6d5dfc", brandText: "#ffffff" },
  { id: "approval", title: "Approval", description: "승인 작업 보기", brandLabel: "Approval", brandBg: "#16845b", brandText: "#ffffff" },
  { id: "docs", title: "Documents", description: "문서 작업", url: "https://docs.google.com", brandLabel: "Google Docs", brandSlug: "googledocs", brandBg: "#ffffff", brandText: "#202124" },
  { id: "claude", title: "Claude", description: "내 Claude", url: "https://claude.ai", brandLabel: "Claude", brandSlug: "claude", brandColor: "D97757", brandBg: "#f5eee6", brandText: "#3b2f2a" },
  { id: "gemini", title: "Gemini", description: "내 Gemini", url: "https://gemini.google.com", brandLabel: "Gemini", brandSlug: "googlegemini", brandColor: "8E75B2", brandBg: "#ffffff", brandText: "#3f51b5" },
  { id: "grok", title: "Grok", description: "내 Grok", url: "https://grok.com", brandLabel: "Grok", brandBg: "#ffffff", brandText: "#111111" },
];

function BrandBadge({ app, onClick }: { app: AppItem; onClick?: () => void }) {
  const iconUrl = app.brandSlug
    ? `https://cdn.simpleicons.org/${app.brandSlug}${app.brandColor ? `/${app.brandColor}` : ""}`
    : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-[78px] shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-lg border border-white/15 px-2 shadow-sm transition hover:brightness-110"
      style={{ background: app.brandBg, color: app.brandText }}
      title={app.title}
      aria-label={app.title}
    >
      {iconUrl ? (
        <img src={iconUrl} alt="" className="h-5 w-5 shrink-0 object-contain" draggable={false} />
      ) : (
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-black/15 text-[10px] font-black">
          {app.id === "files" ? "F" : app.id === "tasks" ? "✓" : app.id === "approval" ? "A" : "G"}
        </span>
      )}
      <span className="min-w-0 truncate text-[9px] font-black leading-none tracking-tight">{app.brandLabel}</span>
    </button>
  );
}

export default function RightWorkSidebar() {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(DEFAULT_APPS);
  const [localFiles, setLocalFiles] = useState<LocalFile[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const dragging = useRef(false);
  const previousWidth = useRef(DEFAULT_WIDTH);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (Array.isArray(parsed) && parsed.length) setSelectedIds(parsed.filter((id) => typeof id === "string"));
      }
    } catch {}
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem("royalcommand:right-panel-apps", JSON.stringify(selectedIds)); } catch {}
  }, [selectedIds]);

  useEffect(() => {
    function move(event: MouseEvent) {
      if (!dragging.current) return;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - event.clientX));
      setWidth(next);
      previousWidth.current = next;
    }
    function up() {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try { window.localStorage.setItem("royalcommand:right-panel-width", String(previousWidth.current)); } catch {}
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, []);

  const selectedApps = selectedIds.map((id) => APP_CATALOG.find((app) => app.id === id)).filter(Boolean) as AppItem[];
  const searchResults = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return [];
    return APP_CATALOG.filter((app) => `${app.title} ${app.description}`.toLowerCase().includes(clean));
  }, [query]);

  function startResize(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    dragging.current = true;
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
    if (app.id === "files") { fileInputRef.current?.click(); return; }
    if (app.url) window.open(app.url, "_blank", "noopener,noreferrer");
  }

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return setDragId(null);
    setSelectedIds((prev) => {
      const next = [...prev];
      const from = next.indexOf(dragId);
      const to = next.indexOf(targetId);
      if (from < 0 || to < 0) return prev;
      next.splice(from, 1);
      next.splice(to, 0, dragId);
      return next;
    });
    setDragId(null);
  }

  function onFilesPicked(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files || []);
    if (!picked.length) return;
    setLocalFiles((prev) => [...prev, ...picked.map((file) => ({ name: file.name, size: file.size, url: URL.createObjectURL(file) }))]);
    event.target.value = "";
  }

  function deleteLocalFile(index: number) {
    setLocalFiles((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== index);
    });
  }

  if (collapsed) {
    return <button type="button" onClick={toggle} className="fixed right-0 top-1/2 z-[100] flex h-12 w-7 -translate-y-1/2 items-center justify-center rounded-l-lg border border-r-0 border-white/20 bg-[#07111f] text-[var(--gold-soft)] shadow-xl" title="오른쪽 앱 패널 열기"><ChevronLeft size={18} /></button>;
  }

  return (
    <aside className="relative z-40 flex h-screen shrink-0 flex-col border-l border-white/10 bg-[#07111f]" style={{ width }}>
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onFilesPicked} />
      <button type="button" onMouseDown={startResize} className="absolute left-0 top-0 z-50 flex h-full w-3 -translate-x-1/2 cursor-col-resize items-center justify-center" title="폭 조절"><GripVertical size={12} className="text-white/35" /></button>
      <button type="button" onClick={toggle} className="absolute left-0 top-1/2 z-50 flex h-12 w-7 -translate-x-full -translate-y-1/2 items-center justify-center rounded-l-lg border border-r-0 border-white/20 bg-[#07111f] text-[var(--gold-soft)] shadow-xl" title="오른쪽 패널 닫기"><ChevronRight size={18} /></button>

      <div className="shrink-0 border-b border-white/10 p-2">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="앱, 파일, AI 찾기" className="w-full rounded-lg border border-white/15 bg-black/30 py-2 pl-8 pr-2 text-xs outline-none placeholder:text-[var(--muted)] focus:border-[var(--gold)]/60" />
        </div>
        {searchResults.length > 0 && <div className="mt-1.5 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-[#0a1626] p-1 shadow-xl">
          {searchResults.map((app) => {
            const added = selectedIds.includes(app.id);
            return <button key={app.id} type="button" onClick={() => added ? openApp(app) : addApp(app.id)} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left hover:bg-white/5"><BrandBadge app={app} /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{app.title}</span><span className="block truncate text-[9px] text-[var(--muted)]">{app.description}</span></span>{!added && <Plus size={13} className="text-[var(--gold-soft)]" />}</button>;
          })}
        </div>}
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
        {selectedApps.map((app) => (
          <div key={app.id} draggable onDragStart={() => setDragId(app.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(app.id)} className={`group flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/20 px-1.5 py-1.5 transition hover:border-[var(--gold)]/30 hover:bg-white/[0.04] ${dragId === app.id ? "opacity-45" : ""}`}>
            <BrandBadge app={app} onClick={() => openApp(app)} />
            <div className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-semibold">{app.title}</span>
              <span className="block truncate text-[8px] leading-3 text-[var(--muted)]">{app.description}</span>
            </div>
            <button type="button" onClick={() => removeApp(app.id)} className="rounded p-0.5 text-white/25 hover:bg-red-500/10 hover:text-red-300" title="삭제"><Trash2 size={10} /></button>
            <GripVertical size={11} className="shrink-0 cursor-grab text-white/30 active:cursor-grabbing" />
          </div>
        ))}

        {localFiles.length > 0 && <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-1.5">
          <div className="mb-1 px-1 text-[9px] font-semibold text-[var(--gold-soft)]">선택한 파일</div>
          {localFiles.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center gap-1 rounded px-1 py-1 text-[10px] hover:bg-white/[0.03]"><a href={file.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate">{file.name}</a><button type="button" onClick={() => deleteLocalFile(index)} className="rounded p-1 text-[var(--muted)] hover:text-red-300"><Trash2 size={10} /></button></div>)}
        </div>}
      </div>

      <a href="/" className="m-2 mt-0 block shrink-0 rounded-xl border border-[var(--gold)]/25 bg-[var(--gold)]/5 p-2 text-left hover:bg-[var(--gold)]/10" aria-label="스폰서 광고 영역">
        <div className="text-[8px] font-semibold uppercase tracking-[0.14em] text-[var(--gold-soft)]">Sponsored</div>
        <div className="mt-0.5 text-[11px] font-semibold">광고 영역</div>
        <div className="mt-0.5 text-[9px] leading-3 text-[var(--muted)]">고객 맞춤 광고 자리</div>
      </a>
    </aside>
  );
}
