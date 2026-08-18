"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, GripVertical, Save, Trash2, X } from "lucide-react";

type Message = {
  id: string;
  content: string;
  authorType?: string;
  author_type?: string;
  created_at?: string;
  createdAt?: string;
};

type ChatBox = {
  id: string;
  ids: string[];
  title: string;
  content: string;
  createdAt: string;
};

type ImportantConversation = {
  id: string;
  roomId: string;
  title: string;
  content: string;
  createdAt: string;
};

const MIN_WIDTH = 12;
const DEFAULT_WIDTH = 240;
const MAX_WIDTH = 420;

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function messageType(message: Message) {
  return message.authorType || message.author_type || "";
}

function messageTime(message: Message) {
  return message.created_at || message.createdAt || new Date().toISOString();
}

function buildBoxes(messages: Message[], titles: Record<string, string>, roomId: string): ChatBox[] {
  const boxes: ChatBox[] = [];
  let current: Message[] = [];

  const pushCurrent = () => {
    if (!current.length) return;
    const userMessage = current.find((message) => messageType(message) === "user");
    if (!userMessage) { current = []; return; }
    const key = `${roomId}:${userMessage.id}`;
    const fallbackTitle = cleanText(userMessage.content).replace(/\s+/g, " ").slice(0, 70) || "Conversation";
    const content = current.map((message) => {
      const label = messageType(message) === "user" ? "Harry" : "AI";
      return `${label}\n${cleanText(message.content)}`;
    }).join("\n\n");
    boxes.push({
      id: userMessage.id,
      ids: current.map((message) => message.id),
      title: titles[key] || fallbackTitle,
      content,
      createdAt: messageTime(userMessage),
    });
    current = [];
  };

  for (const message of messages) {
    if (!cleanText(message.content) || messageType(message) === "system") continue;
    if (messageType(message) === "user") {
      pushCurrent();
      current = [message];
    } else if (current.length) {
      current.push(message);
    }
  }
  pushCurrent();
  return boxes.reverse();
}

export default function ChatHistorySidebar() {
  const pathname = usePathname();
  const currentId = pathname.split("/").filter(Boolean).pop() || "";
  const [boxes, setBoxes] = useState<ChatBox[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [importantItems, setImportantItems] = useState<ImportantConversation[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [viewing, setViewing] = useState<ChatBox | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [status, setStatus] = useState("");
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const dragging = useRef(false);
  const previousExpandedWidth = useRef(DEFAULT_WIDTH);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allSelected = boxes.length > 0 && boxes.every((box) => selectedIds.includes(box.id));
  const selectedBoxes = useMemo(() => boxes.filter((box) => selectedIds.includes(box.id)), [boxes, selectedIds]);

  async function refreshHistory(nextTitles = titles) {
    if (!currentId) return;
    try {
      const res = await fetch(`/api/rooms/${currentId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const messages: Message[] = Array.isArray(data.messages) ? data.messages : [];
      const next = buildBoxes(messages, nextTitles, currentId);
      setBoxes(next);
      setSelectedIds((previous) => previous.filter((id) => next.some((box) => box.id === id)));
    } catch {}
    finally { setLoaded(true); }
  }

  async function saveTitle(box: ChatBox) {
    const title = editingTitle.trim().slice(0, 120);
    if (!title) return;
    const key = `${currentId}:${box.id}`;
    const nextTitles = { ...titles, [key]: title };
    const res = await fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatHistoryTitles: nextTitles }),
    });
    if (!res.ok) return;
    setTitles(nextTitles);
    setBoxes((previous) => previous.map((item) => item.id === box.id ? { ...item, title } : item));
    if (viewing?.id === box.id) setViewing({ ...viewing, title });
    setEditingId(null);
    setEditingTitle("");
  }

  async function deleteBoxes(targets: ChatBox[], ask = false) {
    if (!targets.length) return;
    if (ask && !window.confirm(`Delete ${targets.length} selected conversation${targets.length === 1 ? "" : "s"}?`)) return;
    const ids = Array.from(new Set(targets.flatMap((box) => box.ids)));
    const res = await fetch(`/api/rooms/${currentId}/messages`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) { setStatus("Delete failed"); return; }
    setSelectedIds([]);
    if (viewing && targets.some((box) => box.id === viewing.id)) setViewing(null);
    setStatus("Deleted");
    await refreshHistory();
    window.setTimeout(() => setStatus(""), 1200);
  }

  async function saveSelected() {
    if (!selectedBoxes.length) return;
    const existingKeys = new Set(importantItems.map((item) => `${item.roomId}:${item.content}`));
    const additions: ImportantConversation[] = selectedBoxes
      .filter((box) => !existingKeys.has(`${currentId}:${box.content}`))
      .map((box) => ({
        id: `important-${Date.now()}-${box.id}`,
        roomId: currentId,
        title: box.title,
        content: box.content.slice(0, 20000),
        createdAt: box.createdAt,
      }));
    const next = [...additions, ...importantItems].slice(0, 100);
    const res = await fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ importantConversations: next }),
    });
    if (!res.ok) { setStatus("Save failed"); return; }
    setImportantItems(next);
    setStatus(`${selectedBoxes.length} saved`);
    window.setTimeout(() => setStatus(""), 1200);
  }

  function toggleSelected(id: string) {
    setSelectedIds((previous) => previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]);
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : boxes.map((box) => box.id));
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/user/preferences", { cache: "no-store" });
        let nextTitles: Record<string, string> = {};
        if (res.ok) {
          const data = await res.json();
          if (data?.preferences?.chatHistoryTitles && typeof data.preferences.chatHistoryTitles === "object") {
            nextTitles = data.preferences.chatHistoryTitles;
            if (!cancelled) setTitles(nextTitles);
          }
          if (Array.isArray(data?.preferences?.importantConversations) && !cancelled) {
            setImportantItems(data.preferences.importantConversations);
          }
        }
        if (!cancelled) await refreshHistory(nextTitles);
      } catch { if (!cancelled) setLoaded(true); }
    })();
    return () => { cancelled = true; };
  }, [currentId]);

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const observer = new MutationObserver(() => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => { void refreshHistory(); }, 700);
    });
    observer.observe(main, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [currentId, titles]);

  useEffect(() => {
    try {
      const savedWidth = Number(window.localStorage.getItem("royalcommand:chat-sidebar-width"));
      const savedCollapsed = window.localStorage.getItem("royalcommand:chat-sidebar-collapsed") === "1";
      if (Number.isFinite(savedWidth) && savedWidth >= MIN_WIDTH && savedWidth <= MAX_WIDTH) {
        setWidth(savedWidth);
        if (savedWidth > 80) previousExpandedWidth.current = savedWidth;
      }
      setCollapsed(savedCollapsed);
    } catch {}
  }, []);

  useEffect(() => {
    function onMove(event: MouseEvent) {
      if (!dragging.current) return;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, event.clientX));
      setCollapsed(false);
      setWidth(next);
      if (next > 80) previousExpandedWidth.current = next;
    }
    function onUp() {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try { window.localStorage.setItem("royalcommand:chat-sidebar-width", String(width)); } catch {}
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [width]);

  function startResize(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function toggleCollapsed() {
    const nextCollapsed = !collapsed;
    if (nextCollapsed) {
      if (width > 80) previousExpandedWidth.current = width;
      setCollapsed(true);
    } else {
      setCollapsed(false);
      setWidth(Math.max(180, previousExpandedWidth.current));
    }
    try { window.localStorage.setItem("royalcommand:chat-sidebar-collapsed", nextCollapsed ? "1" : "0"); } catch {}
  }

  if (collapsed) {
    return (
      <button type="button" onClick={toggleCollapsed} className="fixed left-0 top-1/2 z-50 flex h-16 w-9 -translate-y-1/2 items-center justify-center rounded-r-xl border border-l-0 border-white/20 bg-black/90 text-[var(--gold-soft)] shadow-lg hover:bg-white/10" title="Open conversation list">
        <ChevronRight size={22} />
      </button>
    );
  }

  return (
    <>
      <aside className="sticky top-0 hidden h-screen shrink-0 self-start overflow-visible border-r border-white/10 bg-black/20 lg:flex lg:flex-col" style={{ width }}>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
          <div className="mb-2 flex min-h-10 items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 p-1.5">
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-white/[0.04]">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all conversations" className="h-4 w-4 shrink-0 accent-[#d7b64d]" />
              <span className="truncate text-[11px] font-medium text-[var(--muted)]">Select All</span>
            </label>
            <button type="button" onClick={() => void saveSelected()} disabled={!selectedBoxes.length} className="flex h-8 items-center gap-1 rounded-md border border-[var(--gold)]/55 bg-[var(--gold)]/10 px-2 text-[10px] font-semibold text-[var(--gold-soft)] hover:bg-[var(--gold)]/15 disabled:cursor-not-allowed disabled:opacity-30" title="Save selected conversations">
              <Save size={13} /> SAVE
            </button>
            <button type="button" onClick={() => void deleteBoxes(selectedBoxes, true)} disabled={!selectedBoxes.length} className="flex h-8 items-center gap-1 rounded-md border border-red-400/35 bg-red-500/5 px-2 text-[10px] font-semibold text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-30" title="Delete selected conversations">
              <Trash2 size={13} /> DELETE
            </button>
          </div>

          {status ? <div className="mb-2 px-2 text-[10px] text-[var(--muted)]">{status}</div> : null}

          <div className="space-y-1">
            {boxes.map((box) => {
              const editing = editingId === box.id;
              const selected = selectedIds.includes(box.id);
              return (
                <div key={box.id} className={`group flex h-10 items-center rounded-lg border ${selected ? "border-[var(--gold)] bg-[var(--gold)]/15" : "border-[var(--gold)]/50 bg-[var(--gold)]/8"}`}>
                  {editing ? (
                    <input
                      autoFocus
                      value={editingTitle}
                      onChange={(event) => setEditingTitle(event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") { event.preventDefault(); void saveTitle(box); }
                        if (event.key === "Escape") { setEditingId(null); setEditingTitle(""); }
                      }}
                      className="ml-2 min-w-0 flex-1 rounded border border-[var(--gold)]/50 bg-black/50 px-2 py-1.5 text-sm text-white outline-none"
                      maxLength={120}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setViewing(box)}
                      onDoubleClick={(event) => { event.preventDefault(); setEditingId(box.id); setEditingTitle(box.title); }}
                      className="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm text-[var(--gold-soft)]"
                      title="Click: view conversation · Double-click: edit title"
                    >
                      {box.title}
                    </button>
                  )}

                  {editing ? (
                    <>
                      <button type="button" onClick={() => void saveTitle(box)} className="grid h-7 w-7 place-items-center text-emerald-300" title="Save title"><Check size={13} /></button>
                      <button type="button" onClick={() => { setEditingId(null); setEditingTitle(""); }} className="grid h-7 w-7 place-items-center text-[var(--muted)]" title="Cancel"><X size={13} /></button>
                    </>
                  ) : (
                    <input type="checkbox" checked={selected} onChange={() => toggleSelected(box.id)} onClick={(event) => event.stopPropagation()} aria-label={`Select ${box.title}`} className="mr-1 h-4 w-4 shrink-0 accent-[#d7b64d]" />
                  )}
                  <button type="button" onClick={() => void deleteBoxes([box])} className="mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-md text-[var(--muted)] hover:bg-red-500/10 hover:text-red-300" title="Delete this conversation"><Trash2 size={14} /></button>
                </div>
              );
            })}

            {loaded && boxes.length === 0 ? <p className="p-2 text-xs text-[var(--muted)]">No conversations yet.</p> : null}
            {!loaded ? <p className="p-2 text-xs text-[var(--muted)]">Loading conversations…</p> : null}
          </div>
        </div>

        <button type="button" onMouseDown={startResize} onDoubleClick={toggleCollapsed} className="absolute right-0 top-0 z-30 flex h-full w-3 translate-x-1/2 cursor-col-resize items-center justify-center"><GripVertical size={14} className="text-white/35" /></button>
        <button type="button" onClick={toggleCollapsed} className="fixed left-0 top-1/2 z-[100] flex h-16 w-9 -translate-y-1/2 items-center justify-center rounded-r-xl border border-l-0 border-white/20 bg-black/90 text-[var(--gold-soft)] shadow-lg hover:bg-white/10" title="Close conversation list"><ChevronLeft size={22} /></button>
      </aside>

      {viewing ? (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/70 p-4" onClick={() => setViewing(null)} role="presentation">
          <div className="flex max-h-[82vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border-2 border-[#FFD700] bg-[#081321] shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
              <div className="min-w-0 flex-1 truncate font-semibold text-[#FFD700]">{viewing.title}</div>
              <button type="button" onClick={() => setViewing(null)} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10" title="Close"><X size={16} /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words px-5 py-4 text-sm leading-6 text-[#E8E6DD]">{viewing.content}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
