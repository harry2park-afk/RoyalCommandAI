"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { File, LogOut, Search } from "lucide-react";

const ROW_HEIGHT = 28;
const DEFAULT_APPS = ["chatgpt", "email", "instagram", "youtube", "drive", "calendar", "files", "netflix", "tasks", "approval"];

type AppItem = {
  id: string;
  title: string;
  description: string;
  url?: string;
  brandSlug?: string;
  brandColor?: string;
  fallback?: string;
  localLogo?: string;
};

type LocalFile = { name: string; size: number; url: string };
type SearchItem =
  | { type: "app"; id: string; title: string; app: AppItem }
  | { type: "file"; id: string; title: string; file: LocalFile };

const APP_CATALOG: AppItem[] = [
  { id: "chatgpt", title: "ChatGPT", description: "내 ChatGPT", url: "https://chatgpt.com", localLogo: "/rc-ai-logos/chatgpt.svg", brandSlug: "openai", brandColor: "FFFFFF", fallback: "◎" },
  { id: "email", title: "Email", description: "내 이메일", url: "https://mail.google.com", brandSlug: "gmail", fallback: "M" },
  { id: "instagram", title: "Instagram", description: "내 Instagram", url: "https://www.instagram.com", brandSlug: "instagram", fallback: "I" },
  { id: "youtube", title: "YouTube", description: "내 YouTube", url: "https://www.youtube.com", brandSlug: "youtube", brandColor: "FF0000", fallback: "▶" },
  { id: "drive", title: "Google Drive", description: "내 Drive", url: "https://drive.google.com", brandSlug: "googledrive", fallback: "D" },
  { id: "calendar", title: "Google Calendar", description: "내 Calendar", url: "https://calendar.google.com", brandSlug: "googlecalendar", fallback: "31" },
  { id: "files", title: "My Files", description: "내 컴퓨터 파일", fallback: "F" },
  { id: "netflix", title: "Netflix", description: "내 Netflix", url: "https://www.netflix.com", brandSlug: "netflix", brandColor: "E50914", fallback: "N" },
  { id: "tasks", title: "Tasks", description: "내 할 일 관리", fallback: "✓" },
  { id: "approval", title: "Approval", description: "승인 작업 보기", fallback: "A" },
  { id: "docs", title: "Documents", description: "문서 작업", url: "https://docs.google.com", brandSlug: "googledocs", fallback: "D" },
  { id: "claude", title: "Claude", description: "내 Claude", url: "https://claude.ai", brandSlug: "claude", brandColor: "D97757", fallback: "C" },
  { id: "gemini", title: "Gemini", description: "내 Gemini", url: "https://gemini.google.com", brandSlug: "googlegemini", fallback: "G" },
  { id: "grok", title: "Grok", description: "내 Grok", url: "https://grok.com", fallback: "X" },
];

function AppIcon({ app }: { app: AppItem }) {
  const [failed, setFailed] = useState(false);
  const remote = app.brandSlug
    ? `https://cdn.simpleicons.org/${app.brandSlug}${app.brandColor ? `/${app.brandColor}` : ""}`
    : undefined;
  const src = app.localLogo || remote;

  if (!src || failed) {
    return (
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-white/10 text-[9px] font-bold text-white">
        {app.fallback || app.title.slice(0, 1)}
      </span>
    );
  }

  return <img src={src} alt="" className="h-5 w-5 shrink-0 object-contain" draggable={false} onError={() => setFailed(true)} />;
}

export default function RightWorkSidebar() {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(DEFAULT_APPS);
  const [localFiles, setLocalFiles] = useState<LocalFile[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const savedApps = window.localStorage.getItem("royalcommand:right-panel-apps");
      if (savedApps) {
        const parsed = JSON.parse(savedApps);
        if (Array.isArray(parsed) && parsed.length) setSelectedIds(parsed.filter((id) => typeof id === "string"));
      }
      window.localStorage.removeItem("royalcommand:right-panel-collapsed");
      window.localStorage.removeItem("royalcommand:right-panel-width");
    } catch {}
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem("royalcommand:right-panel-apps", JSON.stringify(selectedIds)); } catch {}
  }, [selectedIds]);

  const selectedApps = selectedIds
    .map((id) => APP_CATALOG.find((app) => app.id === id))
    .filter(Boolean) as AppItem[];

  const searchResults = useMemo<SearchItem[]>(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return [];

    const appMatches: SearchItem[] = APP_CATALOG
      .filter((app) => `${app.title} ${app.description}`.toLowerCase().includes(clean))
      .map((app) => ({ type: "app", id: `app-${app.id}`, title: app.title, app }));

    const fileMatches: SearchItem[] = localFiles
      .filter((file) => file.name.toLowerCase().includes(clean))
      .map((file, index) => ({ type: "file", id: `file-${index}-${file.name}`, title: file.name, file }));

    return [...fileMatches, ...appMatches];
  }, [query, localFiles]);

  function openApp(app: AppItem) {
    if (app.id === "files") {
      fileInputRef.current?.click();
      return;
    }
    if (app.url) window.open(app.url, "_blank", "noopener,noreferrer");
  }

  function removeApp(id: string) {
    setSelectedIds((prev) => prev.filter((item) => item !== id));
  }

  function addOrOpen(app: AppItem) {
    if (!selectedIds.includes(app.id)) setSelectedIds((prev) => [...prev, app.id]);
    openApp(app);
    setQuery("");
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
    setLocalFiles((prev) => [
      ...prev,
      ...picked.map((file) => ({ name: file.name, size: file.size, url: URL.createObjectURL(file) })),
    ]);
    event.target.value = "";
  }

  function removeLocalFile(index: number) {
    setLocalFiles((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== index);
    });
  }

  return (
    <aside className="relative z-40 flex h-screen w-[170px] min-w-[170px] max-w-[170px] shrink-0 flex-col bg-[#07111f]">
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onFilesPicked} />

      <div className="shrink-0 px-1.5 py-1.5">
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="앱, 파일, AI 찾기"
            className="h-8 w-full rounded-md border border-white/12 bg-black/25 pl-7 pr-2 text-[10px] outline-none placeholder:text-[var(--muted)] focus:border-[var(--gold)]/60"
          />
        </div>

        {query.trim() && (
          <div className="mt-1 max-h-44 overflow-y-auto border-y border-white/10 bg-[#07111f] py-0.5">
            {searchResults.length ? searchResults.map((item) => item.type === "file" ? (
              <a key={item.id} href={item.file.url} target="_blank" rel="noreferrer" onClick={() => setQuery("")} className="flex h-7 items-center gap-2 px-1.5 text-[10px] hover:bg-white/[0.05]">
                <File size={15} className="shrink-0 text-[var(--gold-soft)]" />
                <span className="min-w-0 flex-1 truncate">{item.title}</span>
              </a>
            ) : (
              <button key={item.id} type="button" onClick={() => addOrOpen(item.app)} className="flex h-7 w-full items-center gap-2 px-1.5 text-left text-[10px] hover:bg-white/[0.05]">
                <AppIcon app={item.app} />
                <span className="min-w-0 flex-1 truncate">{item.title}</span>
              </button>
            )) : (
              <div className="px-2 py-2 text-[10px] text-[var(--muted)]">찾는 항목이 없습니다.</div>
            )}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-[118px]">
        {selectedApps.map((app) => (
          <div
            key={app.id}
            draggable
            onDragStart={() => setDragId(app.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(app.id)}
            className={`group flex w-full items-center ${dragId === app.id ? "opacity-45" : ""}`}
            style={{ height: ROW_HEIGHT }}
          >
            <button
              type="button"
              onClick={() => openApp(app)}
              className="flex h-full min-w-0 flex-1 items-center gap-2 px-1.5 text-left hover:bg-white/[0.05]"
              title={app.title}
            >
              <AppIcon app={app} />
              <span className="min-w-0 flex-1 truncate text-[10px] font-semibold leading-none">{app.title}</span>
            </button>
            <button type="button" onClick={() => removeApp(app.id)} className="mr-0.5 grid h-6 w-6 shrink-0 place-items-center bg-transparent text-white/55 hover:text-white/90" title="메뉴에서 빼기">
              <LogOut size={15} />
            </button>
          </div>
        ))}

        {localFiles.map((file, index) => (
          <div key={`${file.name}-${index}`} className="group flex h-7 w-full items-center">
            <a href={file.url} target="_blank" rel="noreferrer" className="flex h-full min-w-0 flex-1 items-center gap-2 px-1.5 hover:bg-white/[0.05]" title={file.name}>
              <File size={15} className="shrink-0 text-[var(--gold-soft)]" />
              <span className="min-w-0 flex-1 truncate text-[10px]">{file.name}</span>
            </a>
            <button type="button" onClick={() => removeLocalFile(index)} className="mr-0.5 grid h-6 w-6 shrink-0 place-items-center bg-transparent text-white/55 hover:text-white/90" title="메뉴에서 빼기">
              <LogOut size={15} />
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
