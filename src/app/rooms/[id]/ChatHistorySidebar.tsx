"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, GripVertical, Pencil, Save, Trash2, X } from "lucide-react";

type Message = {
  id: string;
  content: string;
  authorType?: string;
  author_type?: string;
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

export default function ChatHistorySidebar() {
  const pathname = usePathname();
  const currentId = pathname.split("/").filter(Boolean).pop() || "";
  const [savedItems, setSavedItems] = useState<ImportantConversation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [viewing, setViewing] = useState<ImportantConversation | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const dragging = useRef(false);
  const previousExpandedWidth = useRef(DEFAULT_WIDTH);

  const visibleItems = savedItems.filter((item) => item.roomId === currentId);

  async function loadSavedItems() {
    try {
      const res = await fetch("/api/user/preferences", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const items = data?.preferences?.importantConversations;
      if (Array.isArray(items)) {
        setSavedItems(items.filter((item): item is ImportantConversation => Boolean(
          item &&
          typeof item.id === "string" &&
          typeof item.roomId === "string" &&
          typeof item.title === "string" &&
          typeof item.content === "string" &&
          typeof item.createdAt === "string"
        )));
      }
    } catch {}
    finally { setLoaded(true); }
  }

  async function persistItems(next: ImportantConversation[]) {
    const res = await fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ importantConversations: next }),
    });
    if (!res.ok) throw new Error("중요 대화를 저장하지 못했습니다.");
    setSavedItems(next);
  }

  async function saveCurrentConversation() {
    if (!currentId || saving) return;
    setSaving(true);
    setSaveMessage("");
    try {
      const res = await fetch(`/api/rooms/${currentId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("현재 대화를 불러오지 못했습니다.");
      const data = await res.json();
      const messages: Message[] = Array.isArray(data.messages) ? data.messages : [];
      const meaningful = messages.filter((message) => {
        const type = message.authorType || message.author_type || "";
        return type !== "system" && cleanText(message.content);
      });
      if (!meaningful.length) throw new Error("저장할 대화가 없습니다.");

      let startIndex = -1;
      for (let i = meaningful.length - 1; i >= 0; i -= 1) {
        if ((meaningful[i].authorType || meaningful[i].author_type) === "user") {
          startIndex = i;
          break;
        }
      }

      const conversation = startIndex >= 0 ? meaningful.slice(startIndex) : meaningful.slice(-8);
      const firstUser = conversation.find((message) => (message.authorType || message.author_type) === "user");
      const titleBase = cleanText(firstUser?.content || conversation[0]?.content || "중요 대화").replace(/\s+/g, " ");
      const title = titleBase.slice(0, 58) || "중요 대화";
      const content = conversation.map((message) => {
        const type = message.authorType || message.author_type || "";
        const label = type === "user" ? "Harry" : "AI";
        return `${label}\n${cleanText(message.content)}`;
      }).join("\n\n").slice(0, 20000);

      const item: ImportantConversation = {
        id: `important-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        roomId: currentId,
        title,
        content,
        createdAt: new Date().toISOString(),
      };

      await persistItems([item, ...savedItems].slice(0, 100));
      setSaveMessage("저장됨");
      window.setTimeout(() => setSaveMessage(""), 1200);
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function saveTitle(item: ImportantConversation) {
    const title = editingTitle.trim().slice(0, 120);
    if (!title) return;
    const next = savedItems.map((saved) => saved.id === item.id ? { ...saved, title } : saved);
    try {
      await persistItems(next);
      if (viewing?.id === item.id) setViewing({ ...viewing, title });
      setEditingId(null);
      setEditingTitle("");
    } catch {}
  }

  async function removeSavedItem(item: ImportantConversation) {
    const next = savedItems.filter((saved) => saved.id !== item.id);
    try {
      await persistItems(next);
      if (viewing?.id === item.id) setViewing(null);
    } catch {}
  }

  useEffect(() => { void loadSavedItems(); }, [currentId]);

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
      <button type="button" onClick={toggleCollapsed} className="fixed left-0 top-1/2 z-50 flex h-16 w-9 -translate-y-1/2 items-center justify-center rounded-r-xl border border-l-0 border-white/20 bg-black/90 text-[var(--gold-soft)] shadow-lg hover:bg-white/10" title="왼쪽 저장 목록 열기">
        <ChevronRight size={22} />
      </button>
    );
  }

  return (
    <>
      <aside className="sticky top-0 hidden h-screen shrink-0 self-start overflow-visible border-r border-white/10 bg-black/20 lg:flex lg:flex-col" style={{ width }}>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
          <button
            type="button"
            onClick={() => void saveCurrentConversation()}
            disabled={saving}
            className="mb-2 flex h-10 w-full items-center rounded-lg border border-[var(--gold)]/60 bg-[var(--gold)]/10 px-3 text-left text-sm font-medium text-[var(--gold-soft)] hover:bg-[var(--gold)]/15 disabled:opacity-50"
            title="현재 질문과 답변을 이 목록에 저장"
          >
            <Save size={13} className="mr-2 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{saving ? "저장 중…" : "현재 대화 저장"}</span>
          </button>

          {saveMessage ? <div className="mb-2 px-2 text-[10px] text-[var(--muted)]">{saveMessage}</div> : null}

          <div className="space-y-1">
            {visibleItems.map((item) => {
              const editing = editingId === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => { if (!editing) setViewing(item); }}
                  className="group flex h-10 cursor-pointer items-center rounded-lg border border-[var(--gold)]/60 bg-[var(--gold)]/10 hover:bg-[var(--gold)]/15"
                  title="클릭하면 저장한 제목과 내용을 봅니다"
                >
                  {editing ? (
                    <input
                      autoFocus
                      value={editingTitle}
                      onChange={(event) => setEditingTitle(event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") { event.preventDefault(); void saveTitle(item); }
                        if (event.key === "Escape") { setEditingId(null); setEditingTitle(""); }
                      }}
                      className="ml-2 min-w-0 flex-1 rounded border border-[var(--gold)]/50 bg-black/50 px-2 py-1.5 text-sm text-white outline-none"
                      maxLength={120}
                    />
                  ) : (
                    <span className="min-w-0 flex-1 truncate px-3 py-2 text-sm text-[var(--gold-soft)]">{item.title}</span>
                  )}

                  {editing ? (
                    <>
                      <button type="button" onClick={(event) => { event.stopPropagation(); void saveTitle(item); }} className="rounded-md p-1.5 text-emerald-300 hover:bg-emerald-500/10" title="제목 저장"><Check size={13} /></button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); setEditingId(null); setEditingTitle(""); }} className="rounded-md p-1.5 text-[var(--muted)] hover:bg-white/10" title="취소"><X size={13} /></button>
                    </>
                  ) : (
                    <button type="button" onClick={(event) => { event.stopPropagation(); setEditingId(item.id); setEditingTitle(item.title); }} className="rounded-md p-1.5 text-[var(--muted)] hover:bg-white/10 hover:text-[var(--gold-soft)]" title="제목 수정"><Pencil size={13} /></button>
                  )}
                  <button type="button" onClick={(event) => { event.stopPropagation(); void removeSavedItem(item); }} className="mr-1 rounded-md p-1.5 text-[var(--muted)] hover:bg-red-500/10 hover:text-red-300" title="저장한 대화 삭제"><Trash2 size={14} /></button>
                </div>
              );
            })}

            {loaded && visibleItems.length === 0 ? <p className="p-2 text-xs text-[var(--muted)]">저장한 중요한 대화가 없습니다.</p> : null}
            {!loaded ? <p className="p-2 text-xs text-[var(--muted)]">불러오는 중…</p> : null}
          </div>
        </div>

        <button type="button" onMouseDown={startResize} onDoubleClick={toggleCollapsed} className="absolute right-0 top-0 z-30 flex h-full w-3 translate-x-1/2 cursor-col-resize items-center justify-center"><GripVertical size={14} className="text-white/35" /></button>
        <button type="button" onClick={toggleCollapsed} className="fixed left-0 top-1/2 z-[100] flex h-16 w-9 -translate-y-1/2 items-center justify-center rounded-r-xl border border-l-0 border-white/20 bg-black/90 text-[var(--gold-soft)] shadow-lg hover:bg-white/10" title="왼쪽 저장 목록 닫기"><ChevronLeft size={22} /></button>
      </aside>

      {viewing ? (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/70 p-4" onClick={() => setViewing(null)} role="presentation">
          <div className="flex max-h-[82vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border-2 border-[#FFD700] bg-[#081321] shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
              <div className="min-w-0 flex-1 truncate font-semibold text-[#FFD700]">{viewing.title}</div>
              <button type="button" onClick={() => setViewing(null)} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10" title="닫기"><X size={16} /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words px-5 py-4 text-sm leading-6 text-[#E8E6DD]">{viewing.content}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
