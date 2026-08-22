"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { File, LogOut, Search } from "lucide-react";
import RightRoomFinder from "./RightRoomFinder";
import {
  APP_CATALOG,
  DEFAULT_APPS,
  appSearchText,
  findAppById,
  type AppItem,
} from "./rightMenuAppCatalog";

const ROW_HEIGHT = 28;
const DEFAULT_PACK_MIGRATION_KEY = "royalcommand:right-panel-default-pack-v1";
const BRAND_ICON_OVERRIDES: Record<string, string> = {
  grok: "/rc-ai-logos/xai.svg",
  deepseek: "/brand-logos/deepseek.svg",
  kakaotalk: "/brand-logos/kakaotalk.svg",
};

type LocalFile = { name: string; size: number; url: string };
type SearchItem =
  | { type: "app"; id: string; title: string; app: AppItem }
  | { type: "file"; id: string; title: string; file: LocalFile };

function validAppIds(value: unknown) {
  if (!Array.isArray(value)) return null;
  return Array.from(new Set(value.filter((id): id is string =>
    typeof id === "string" && Boolean(findAppById(id))
  )));
}

function iconSources(app: AppItem) {
  const siteIcon = app.url
    ? `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(app.url)}&sz=64`
    : undefined;
  const simpleIcon = app.brandSlug
    ? `https://cdn.simpleicons.org/${app.brandSlug}${app.brandColor ? `/${app.brandColor}` : ""}`
    : undefined;
  return Array.from(new Set([
    BRAND_ICON_OVERRIDES[app.id],
    siteIcon,
    app.localLogo,
    simpleIcon,
  ].filter((source): source is string => Boolean(source))));
}

function AppIcon({ app }: { app: AppItem }) {
  const sources = iconSources(app);
  const [sourceIndex, setSourceIndex] = useState(0);
  const src = sources[sourceIndex];

  useEffect(() => {
    setSourceIndex(0);
  }, [app.id]);

  if (!src) {
    return (
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-white/10 text-[9px] font-bold text-white">
        {app.fallback || app.title.slice(0, 1)}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className="h-5 w-5 shrink-0 object-contain"
      draggable={false}
      onError={() => setSourceIndex((index) => index + 1)}
    />
  );
}

export default function RightWorkSidebar() {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [localFiles, setLocalFiles] = useState<LocalFile[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuScrollRef = useRef<HTMLDivElement>(null);
  const preferencesReady = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      let local: string[] | null = null;
      let starterPackMigrated = false;
      try {
        const raw = window.localStorage.getItem("royalcommand:right-panel-apps");
        local = raw !== null ? validAppIds(JSON.parse(raw)) : null;
        starterPackMigrated = window.localStorage.getItem(DEFAULT_PACK_MIGRATION_KEY) === "1";
      } catch {}

      let account: string[] | null = null;
      try {
        const res = await fetch("/api/user/preferences", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          account = validAppIds(data?.preferences?.rightPanelApps);
        }
      } catch {}

      if (cancelled) return;

      const restoredBase = local ?? account ?? [];
      const restored = starterPackMigrated
        ? (restoredBase.length ? restoredBase : [...DEFAULT_APPS])
        : Array.from(new Set([...restoredBase, ...DEFAULT_APPS]));

      setSelectedIds(restored);
      try {
        window.localStorage.setItem("royalcommand:right-panel-apps", JSON.stringify(restored));
        window.localStorage.setItem(DEFAULT_PACK_MIGRATION_KEY, "1");
        window.localStorage.removeItem("royalcommand:right-panel-collapsed");
        window.localStorage.removeItem("royalcommand:right-panel-width");
      } catch {}
      preferencesReady.current = true;

      if (JSON.stringify(restored) !== JSON.stringify(account)) {
        void fetch("/api/user/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rightPanelApps: restored }),
          keepalive: true,
        }).catch(() => undefined);
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!preferencesReady.current) return;
    try { window.localStorage.setItem("royalcommand:right-panel-apps", JSON.stringify(selectedIds)); } catch {}
    void fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rightPanelApps: selectedIds }),
      keepalive: true,
    }).catch(() => undefined);
  }, [selectedIds]);

  const cleanQuery = query.trim().toLowerCase();

  const selectedApps = selectedIds
    .map((id) => findAppById(id))
    .filter(Boolean) as AppItem[];

  const visibleSelectedApps = useMemo(() => {
    if (!cleanQuery) return selectedApps;
    return selectedApps.filter((app) => appSearchText(app).includes(cleanQuery));
  }, [selectedApps, cleanQuery]);

  const visibleLocalFiles = useMemo(() => {
    if (!cleanQuery) return localFiles;
    return localFiles.filter((file) => file.name.toLowerCase().includes(cleanQuery));
  }, [localFiles, cleanQuery]);

  const extraAppMatches = useMemo<SearchItem[]>(() => {
    if (!cleanQuery) return [];
    return APP_CATALOG
      .filter((app) => !selectedIds.includes(app.id))
      .filter((app) => appSearchText(app).includes(cleanQuery))
      .map((app) => ({ type: "app", id: `app-${app.id}`, title: app.title, app }));
  }, [cleanQuery, selectedIds]);

  const hasVisibleResults = visibleSelectedApps.length > 0 || visibleLocalFiles.length > 0 || extraAppMatches.length > 0;

  function isCompactMobile() {
    return typeof window !== "undefined" && window.innerWidth <= 1200;
  }

  function openApp(app: AppItem) {
    if (app.id === "files") {
      fileInputRef.current?.click();
      return;
    }
    if (app.url) window.open(app.url, "_blank", "noopener,noreferrer");
  }

  function handleAppClick(app: AppItem) {
    if (cleanQuery) {
      setQuery("");
      return;
    }
    if (isCompactMobile() && !mobileExpanded) {
      setMobileExpanded(true);
      return;
    }
    openApp(app);
    if (isCompactMobile()) setMobileExpanded(false);
  }

  function removeApp(id: string) {
    setSelectedIds((prev) => prev.filter((item) => item !== id));
  }

  function addOnly(app: AppItem) {
    if (!selectedIds.includes(app.id)) setSelectedIds((prev) => [...prev, app.id]);
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

  function scrollMenuFromAnywhere(event: React.WheelEvent<HTMLElement>) {
    const scroller = menuScrollRef.current;
    if (!scroller || event.deltaY === 0) return;
    scroller.scrollTop += event.deltaY;
    event.preventDefault();
  }

  return (
    <aside
      className="rc-right-work-sidebar relative z-40 flex h-screen w-[170px] min-w-[170px] max-w-[170px] shrink-0 flex-col bg-[#07111f]"
      data-mobile-expanded={mobileExpanded ? "true" : "false"}
      style={{ borderLeft: "4px solid #FFD700", boxShadow: "-1px 0 0 #FFD700" }}
      onWheel={scrollMenuFromAnywhere}
    >
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onFilesPicked} />

      <div className="rc-right-search shrink-0 px-1.5 py-1.5">
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const firstApp = visibleSelectedApps[0] || (extraAppMatches[0]?.type === "app" ? extraAppMatches[0].app : undefined);
              if (firstApp) {
                e.preventDefault();
                addOnly(firstApp);
              }
            }}
            placeholder="앱, 파일, AI 찾기"
            className="h-8 w-full rounded-md border border-white/12 bg-black/25 pl-7 pr-2 text-[10px] outline-none placeholder:text-[var(--muted)] focus:border-[var(--gold)]/60"
          />
        </div>
      </div>

      <RightRoomFinder />

      <div ref={menuScrollRef} className="rc-right-menu min-h-0 flex-1 overflow-y-auto px-1.5 pb-[118px]">
        {visibleSelectedApps.map((app) => (
          <div
            key={app.id}
            draggable={!cleanQuery}
            onDragStart={() => setDragId(app.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(app.id)}
            className={`rc-right-row group flex w-full items-center ${dragId === app.id ? "opacity-45" : ""}`}
            style={{ height: ROW_HEIGHT }}
          >
            <button
              type="button"
              onClick={() => handleAppClick(app)}
              className="rc-right-app-button flex h-full min-w-0 flex-1 items-center gap-2 px-1.5 text-left hover:bg-white/[0.05]"
              title={app.title}
            >
              <AppIcon app={app} />
              <span className="rc-right-app-title min-w-0 flex-1 truncate text-[10px] font-semibold leading-none">{app.title}</span>
            </button>
            <button type="button" onClick={() => removeApp(app.id)} className="rc-right-remove mr-0.5 grid h-6 w-6 shrink-0 place-items-center bg-transparent text-white/55 hover:text-white/90" title="메뉴에서 빼기">
              <LogOut size={15} />
            </button>
          </div>
        ))}

        {visibleLocalFiles.map((file) => {
          const index = localFiles.indexOf(file);
          return (
            <div key={`${file.name}-${index}`} className="rc-right-row group flex h-7 w-full items-center">
              <a href={file.url} target="_blank" rel="noreferrer" className="rc-right-app-button flex h-full min-w-0 flex-1 items-center gap-2 px-1.5 hover:bg-white/[0.05]" title={file.name}>
                <File size={15} className="shrink-0 text-[var(--gold-soft)]" />
                <span className="rc-right-app-title min-w-0 flex-1 truncate text-[10px]">{file.name}</span>
              </a>
              <button type="button" onClick={() => removeLocalFile(index)} className="rc-right-remove mr-0.5 grid h-6 w-6 shrink-0 place-items-center bg-transparent text-white/55 hover:text-white/90" title="메뉴에서 빼기">
                <LogOut size={15} />
              </button>
            </div>
          );
        })}

        {extraAppMatches.map((item) => item.type === "app" ? (
          <button key={item.id} type="button" onClick={() => addOnly(item.app)} className="flex h-7 w-full items-center gap-2 px-1.5 text-left hover:bg-white/[0.05]" title={`${item.title} 메뉴에 추가`}>
            <AppIcon app={item.app} />
            <span className="min-w-0 flex-1 truncate text-[10px] font-semibold leading-none">{item.title}</span>
            <span className="text-[9px] text-[var(--gold-soft)]">+</span>
          </button>
        ) : null)}

        {cleanQuery && !hasVisibleResults ? (
          <div className="px-2 py-3 text-[10px] text-[var(--muted)]">찾는 항목이 없습니다.</div>
        ) : null}
      </div>
    </aside>
  );
}
