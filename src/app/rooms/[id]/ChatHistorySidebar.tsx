"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, GripVertical, Pencil, Save, Trash2, X } from "lucide-react";

type Room = { id: string; name: string };
type Message = {
  id: string;
  content: string;
  authorType?: string;
  author_type?: string;
  created_at?: string;
  createdAt?: string;
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

function displayDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export default function ChatHistorySidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const currentId = pathname.split("/").filter(Boolean).pop() || "";
  const [rooms, setRooms] = useState<Room[]>([]);
  const [savedItems, setSavedItems] = useState<ImportantConversation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [viewing, setViewing] = useState<ImportantConversation | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingRoomName, setEditingRoomName] = useState("");
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const dragging = useRef(false);
  const previousExpandedWidth = useRef(DEFAULT_WIDTH);

  const visibleItems = savedItems.filter((item) => item.roomId === currentId);

  async function loadRooms() {
    try {
      const res = await fetch("/api/rooms", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.rooms)) setRooms(data.rooms);
    } catch {}
  }

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
      const next = [item, ...savedItems].slice(0, 100);
      await persistItems(next);
      setSaveMessage("저장됨");
      window.setTimeout(() => setSaveMessage(""), 1400);
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

  useEffect(() => {
    void loadRooms();
    void loadSavedItems();
  }, [currentId]);

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

  async function removeRoom(id: string) {
    if (!window.confirm("이 채팅방을 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/rooms/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setRooms((prev) => prev.filter((room) => room.id !== id));
    if (id === currentId) router.push("/dashboard");
  }

  async function saveRoomName(id: string) {
    const name = editingRoomName.trim().slice(0, 120);
    if (!name) return;
    const res = await fetch(`/api/rooms/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return;
    setRooms((prev) => prev.map((room) => room.id === id ? { ...room, name } : room));
    setEditingRoomId(null);
    setEditingRoomName("");
  }

  if (collapsed) {
    return (
      <button type="button" onClick={toggleCollapsed} className="fixed left-0 top-1/2 z-50 flex h-16 w-9 -translate-y-1/2 items-center justify-center rounded-r-xl border border-l-0 border-white/20 bg-black/90 text-[var(--gold-soft)] shadow-lg hover:bg-white/10" title="왼쪽 중요 대화 보관함 열기">
        <ChevronRight size={22} />
      </button>
    );
  }

  return (
    <>
      <aside className="sticky top-0 hidden h-screen shrink-0 self-start overflow-visible border-r border-white/10 bg-black/20 lg:flex lg:flex-col" style={{ width }}>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--gold-soft)]">중요 대화 보관함</div>
          </div>

          <button
            type="button"
            onClick={() => void saveCurrentConversation()}
            disabled={saving}
            className="mb-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--gold)]/50 bg-[var(--gold)]/10 px-2 text-xs font-semibold text-[var(--gold-soft)] hover:bg-[var(--gold)]/15 disabled:opacity-50"
            title="현재 질문과 AI 답변을 중요 대화로 저장"
          >
            <Save size={13} />
            {saving ? "저장 중…" : "현재 대화 저장"}
          </button>
          {saveMessage ? <div className="mb-2 px-1 text-[10px] text-[var(--muted)]">{saveMessage}</div> : null}

          <div className="space-y-1">
            {visibleItems.map((item) => {
              const editing = editingId === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => { if (!editing) setViewing(item); }}
                  className="flex h-10 cursor-pointer items-center gap-1 rounded-lg border border-white/10 bg-black/20 px-2 hover:border-[var(--gold)]/40 hover:bg-[var(--gold)]/5"
                  title="클릭하면 저장한 중요 대화 내용을 봅니다"
                >
                  <div className="min-w-0 flex flex-1 items-center gap-1.5 text-left">
                    <span className="shrink-0 text-[9px] font-medium text-[var(--muted)]">{displayDate(item.createdAt)}</span>
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
                        className="min-w-0 flex-1 rounded border border-[var(--gold)]/50 bg-black/50 px-1.5 py-1 text-xs text-white outline-none"
                        maxLength={120}
                      />
                    ) : (
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--gold-soft)]">{item.title}</span>
                    )}
                  </div>
                  {editing ? (
                    <>
                      <button type="button" onClick={(event) => { event.stopPropagation(); void saveTitle(item); }} className="shrink-0 rounded-md p-1 text-emerald-300 hover:bg-emerald-500/10" title="제목 저장"><Check size={13} /></button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); setEditingId(null); setEditingTitle(""); }} className="shrink-0 rounded-md p-1 text-[var(--muted)] hover:bg-white/10" title="취소"><X size={13} /></button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={(event) => { event.stopPropagation(); setEditingId(item.id); setEditingTitle(item.title); }} className="shrink-0 rounded-md p-1 text-[var(--muted)] hover:bg-white/10 hover:text-[var(--gold-soft)]" title="제목 수정"><Pencil size={12} /></button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); void removeSavedItem(item); }} className="shrink-0 rounded-md p-1 text-[var(--muted)] hover:bg-red-500/10 hover:text-red-300" title="저장한 중요 대화 삭제"><Trash2 size={13} /></button>
                    </>
                  )}
                </div>
              );
            })}
            {loaded && visibleItems.length === 0 ? <p className="p-2 text-xs text-[var(--muted)]">아직 저장한 중요 대화가 없습니다.</p> : null}
            {!loaded ? <p className="p-2 text-xs text-[var(--muted)]">중요 대화를 불러오는 중…</p> : null}
          </div>

          <div className="my-3 border-t border-white/10" />
          <div className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">채팅방</div>
          <div className="space-y-1">
            {rooms.map((room) => {
              const editing = editingRoomId === room.id;
              return (
                <div key={room.id} className={`group flex items-center rounded-lg border ${room.id === currentId ? "border-[var(--gold)]/60 bg-[var(--gold)]/10" : "border-transparent hover:bg-white/[0.03]"}`}>
                  {editing ? (
                    <input
                      autoFocus
                      value={editingRoomName}
                      onChange={(event) => setEditingRoomName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") { event.preventDefault(); void saveRoomName(room.id); }
                        if (event.key === "Escape") { setEditingRoomId(null); setEditingRoomName(""); }
                      }}
                      className="ml-2 min-w-0 flex-1 rounded border border-[var(--gold)]/50 bg-black/50 px-2 py-1.5 text-sm text-white outline-none"
                      maxLength={120}
                    />
                  ) : (
                    <Link href={`/rooms/${room.id}`} className="min-w-0 flex-1 truncate px-3 py-2 text-sm">{room.name}</Link>
                  )}
                  {editing ? (
                    <>
                      <button type="button" onClick={() => void saveRoomName(room.id)} className="rounded-md p-1.5 text-emerald-300 hover:bg-emerald-500/10" title="채팅방 이름 저장"><Check size={13} /></button>
                      <button type="button" onClick={() => { setEditingRoomId(null); setEditingRoomName(""); }} className="rounded-md p-1.5 text-[var(--muted)] hover:bg-white/10" title="취소"><X size={13} /></button>
                    </>
                  ) : (
                    <button type="button" onClick={() => { setEditingRoomId(room.id); setEditingRoomName(room.name); }} className="rounded-md p-1.5 text-[var(--muted)] hover:bg-white/10 hover:text-[var(--gold-soft)]" title="채팅방 이름 수정"><Pencil size={13} /></button>
                  )}
                  <button type="button" onClick={() => void removeRoom(room.id)} className="mr-1 rounded-md p-1.5 text-[var(--muted)] hover:bg-red-500/10 hover:text-red-300"><Trash2 size={14} /></button>
                </div>
              );
            })}
          </div>
        </div>

        <button type="button" onMouseDown={startResize} onDoubleClick={toggleCollapsed} className="absolute right-0 top-0 z-30 flex h-full w-3 translate-x-1/2 cursor-col-resize items-center justify-center"><GripVertical size={14} className="text-white/35" /></button>
        <button type="button" onClick={toggleCollapsed} className="fixed left-0 top-1/2 z-[100] flex h-16 w-9 -translate-y-1/2 items-center justify-center rounded-r-xl border border-l-0 border-white/20 bg-black/90 text-[var(--gold-soft)] shadow-lg hover:bg-white/10" title="왼쪽 중요 대화 보관함 닫기"><ChevronLeft size={22} /></button>
      </aside>

      {viewing ? (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/70 p-4" onClick={() => setViewing(null)} role="presentation">
          <div className="flex max-h-[82vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border-2 border-[#FFD700] bg-[#081321] shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-[#FFD700]">{viewing.title}</div>
                <div className="text-[10px] text-[var(--muted)]">{displayDate(viewing.createdAt)} · 저장된 중요 대화</div>
              </div>
              <button type="button" onClick={() => setViewing(null)} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10" title="닫기"><X size={16} /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words px-5 py-4 text-sm leading-6 text-[#E8E6DD]">{viewing.content}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
