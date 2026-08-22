"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, GripVertical, Pencil, Save, Trash2, X } from "lucide-react";

type Conversation = {
  id: string;
  room_id: string;
  title: string;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
  last_message_at: string;
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

function activeKey(roomId: string) {
  return `royalcommand:room:${roomId}:active-conversation`;
}

function conversationTimestamp(conversation: Conversation) {
  return conversation.last_message_at || conversation.updated_at || conversation.created_at;
}

function shortChatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--/--";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

function fullChatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export default function ChatHistorySidebar() {
  const pathname = usePathname();
  const roomId = pathname.split("/").filter(Boolean).pop() || "";
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [importantItems, setImportantItems] = useState<ImportantConversation[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeId, setActiveId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [dateInfoId, setDateInfoId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const dragging = useRef(false);
  const previousExpandedWidth = useRef(DEFAULT_WIDTH);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visible = conversations.filter((item) => item.status !== "archived");
  const allSelected = visible.length > 0 && visible.every((item) => selectedIds.includes(item.id));
  const selectedConversations = useMemo(
    () => visible.filter((item) => selectedIds.includes(item.id)),
    [visible, selectedIds],
  );

  async function refreshHistory() {
    if (!roomId) return;
    try {
      const res = await fetch(`/api/rooms/${roomId}/conversations`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const next = Array.isArray(data.conversations) ? data.conversations as Conversation[] : [];
      setConversations(next);
      setSelectedIds((previous) => previous.filter((id) => next.some((item) => item.id === id && item.status !== "archived")));
      setDateInfoId((previous) => previous && next.some((item) => item.id === previous && item.status !== "archived") ? previous : null);
    } catch {}
    finally { setLoaded(true); }
  }

  async function openConversation(conversation: Conversation) {
    if (!roomId) return;
    try {
      await fetch(`/api/rooms/${roomId}/conversations/${conversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      window.sessionStorage.setItem(activeKey(roomId), conversation.id);
      setActiveId(conversation.id);
      window.location.reload();
    } catch {
      setStatus("Open failed");
    }
  }

  async function startNewChat() {
    if (!roomId) return;
    setStatus("Starting new chat…");
    try {
      const res = await fetch(`/api/rooms/${roomId}/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Chat" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.conversation?.id) throw new Error("New Chat failed");
      window.sessionStorage.setItem(activeKey(roomId), data.conversation.id);
      setActiveId(data.conversation.id);
      window.location.reload();
    } catch {
      setStatus("New Chat failed");
    }
  }

  function startVoiceCommand() {
    const w = window as typeof window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) { setStatus("Voice not supported"); return; }
    const recognition = new Recognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const text = event.results?.[0]?.[0]?.transcript || "";
      const textarea = document.querySelector('textarea[placeholder^="Type or speak your order"]');
      if (textarea instanceof HTMLTextAreaElement) {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
        if (setter) setter.call(textarea, text); else textarea.value = text;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        textarea.focus();
      }
    };
    recognition.onerror = () => setStatus("Voice failed");
    recognition.start();
  }

  async function saveTitle(conversation: Conversation) {
    const title = editingTitle.trim().slice(0, 120);
    if (!title) return;
    const res = await fetch(`/api/rooms/${roomId}/conversations/${conversation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) { setStatus("Rename failed"); return; }
    setConversations((previous) => previous.map((item) => item.id === conversation.id ? { ...item, title } : item));
    setEditingId(null);
    setEditingTitle("");
  }

  async function archiveSelected(ask = false) {
    if (!selectedConversations.length) return;
    if (ask && !window.confirm(`Delete ${selectedConversations.length} selected conversation${selectedConversations.length === 1 ? "" : "s"}?`)) return;
    try {
      await Promise.all(selectedConversations.map((item) => fetch(`/api/rooms/${roomId}/conversations/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      })));
      if (selectedIds.includes(activeId)) {
        window.sessionStorage.removeItem(activeKey(roomId));
        setActiveId("");
      }
      setSelectedIds([]);
      setDateInfoId(null);
      setStatus("Deleted");
      await refreshHistory();
      window.setTimeout(() => setStatus(""), 1200);
    } catch { setStatus("Delete failed"); }
  }

  async function saveSelected() {
    if (!selectedConversations.length) return;
    try {
      const additions: ImportantConversation[] = [];
      for (const item of selectedConversations) {
        const res = await fetch(`/api/rooms/${roomId}/conversations/${item.id}`, { cache: "no-store" });
        if (!res.ok) continue;
        const data = await res.json();
        const messages = Array.isArray(data.messages) ? data.messages : [];
        const content = messages.map((message: any) => `${message.author_type === "user" ? "User" : "AI"}\n${String(message.content || "")}`).join("\n\n");
        additions.push({
          id: `important-${Date.now()}-${item.id}`,
          roomId,
          title: item.title,
          content: content.slice(0, 20000),
          createdAt: item.created_at,
        });
      }
      const existing = new Set(importantItems.map((item) => `${item.roomId}:${item.title}:${item.createdAt}`));
      const next = [...additions.filter((item) => !existing.has(`${item.roomId}:${item.title}:${item.createdAt}`)), ...importantItems].slice(0, 100);
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importantConversations: next }),
      });
      if (!res.ok) throw new Error("save failed");

      const savedIds = selectedConversations.map((item) => item.id);
      const archiveResponses = await Promise.all(selectedConversations.map((item) => fetch(`/api/rooms/${roomId}/conversations/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      })));
      if (archiveResponses.some((response) => !response.ok)) throw new Error("saved conversation could not be removed from the active list");

      setImportantItems(next);
      setConversations((previous) => previous.map((item) => savedIds.includes(item.id) ? { ...item, status: "archived" } : item));
      if (savedIds.includes(activeId)) {
        window.sessionStorage.removeItem(activeKey(roomId));
        setActiveId("");
      }
      setSelectedIds([]);
      setDateInfoId(null);
      setStatus(`${savedIds.length} saved`);
      await refreshHistory();
      window.setTimeout(() => setStatus(""), 1200);
    } catch { setStatus("Save failed"); }
  }

  useEffect(() => {
    try { setActiveId(window.sessionStorage.getItem(activeKey(roomId)) || ""); } catch {}
    void refreshHistory();
    void (async () => {
      try {
        const res = await fetch("/api/user/preferences", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data?.preferences?.importantConversations)) setImportantItems(data.preferences.importantConversations);
      } catch {}
    })();
  }, [roomId]);

  useEffect(() => {
    if (!dateInfoId) return;
    const close = () => setDateInfoId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [dateInfoId]);

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
  }, [roomId]);

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
    <aside className="sticky top-0 hidden h-screen shrink-0 self-start overflow-visible border-r border-white/10 bg-black/20 lg:flex lg:flex-col" style={{ width }}>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
        <div id="rc-thread-tools" className="mb-2 rounded-lg border border-white/10 bg-black/20 p-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <button id="rc-new-chat-button" type="button" onClick={() => void startNewChat()} className="flex h-[30px] min-w-0 items-center justify-center rounded-lg border border-[#2A3B6E] bg-[#0b1524] px-2 text-[11px] font-semibold text-[#FFD700] hover:bg-white/[0.05]" title="Start a new blank conversation">+ New Chat</button>
            <button id="rc-voice-command-button" type="button" onClick={startVoiceCommand} className="flex h-[30px] min-w-0 items-center justify-center rounded-lg border border-[#2A3B6E] bg-[#0b1524] px-2 text-[11px] font-semibold text-[#FFD700] hover:bg-white/[0.05]" title="Voice Command">🎙 Voice</button>
          </div>
          <div className="mt-1 min-h-4 px-1 text-[10px] font-medium text-emerald-300">{status}</div>
        </div>

        <div className="mb-1 rounded-lg border border-white/10 bg-black/20 p-1.5">
          <label className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 hover:bg-white/[0.04]">
            <input type="checkbox" checked={allSelected} onChange={() => setSelectedIds(allSelected ? [] : visible.map((item) => item.id))} aria-label="Select all conversations" className="h-4 w-4 shrink-0 accent-[#d7b64d]" />
            <span className="text-[11px] font-medium text-[var(--muted)]">Select All</span>
          </label>
        </div>

        <div className="mb-2 grid grid-cols-2 gap-1.5">
          <button type="button" onClick={() => void saveSelected()} disabled={!selectedConversations.length} className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--gold)]/65 bg-[var(--gold)]/10 px-2 text-[11px] font-semibold text-[var(--gold-soft)] hover:bg-[var(--gold)]/15 disabled:cursor-not-allowed disabled:opacity-30"><Save size={14} /> SAVE</button>
          <button type="button" onClick={() => void archiveSelected(true)} disabled={!selectedConversations.length} className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-red-400/40 bg-red-500/5 px-2 text-[11px] font-semibold text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 size={14} /> DELETE</button>
        </div>

        <div className="space-y-1">
          {visible.map((conversation) => {
            const editing = editingId === conversation.id;
            const selected = selectedIds.includes(conversation.id);
            const active = activeId === conversation.id;
            const timestamp = conversationTimestamp(conversation);
            const dateOpen = dateInfoId === conversation.id;
            return (
              <div key={conversation.id} className={`group relative flex h-[30px] items-center rounded-lg border ${active ? "border-[#FFD700] bg-[#FFD700]/15" : selected ? "border-[var(--gold)] bg-[var(--gold)]/15" : "border-[var(--gold)]/50 bg-[var(--gold)]/8"}`}>
                {editing ? (
                  <>
                    <input autoFocus value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} onKeyDown={(event) => {
                      if (event.key === "Enter") { event.preventDefault(); void saveTitle(conversation); }
                      if (event.key === "Escape") { setEditingId(null); setEditingTitle(""); }
                    }} className="ml-1 min-w-0 flex-1 rounded border border-[var(--gold)]/50 bg-black/50 px-2 text-xs text-white outline-none" maxLength={120} />
                    <button type="button" onClick={() => void saveTitle(conversation)} className="grid h-6 w-6 shrink-0 place-items-center text-emerald-300"><Check size={13} /></button>
                    <button type="button" onClick={() => { setEditingId(null); setEditingTitle(""); }} className="mr-1 grid h-6 w-6 shrink-0 place-items-center text-[var(--muted)]"><X size={13} /></button>
                  </>
                ) : (
                  <>
                    <input type="checkbox" checked={selected} onChange={() => setSelectedIds((previous) => previous.includes(conversation.id) ? previous.filter((id) => id !== conversation.id) : [...previous, conversation.id])} onClick={(event) => event.stopPropagation()} className="ml-2 h-4 w-4 shrink-0 accent-[#2563eb]" />
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDateInfoId((current) => current === conversation.id ? null : conversation.id);
                      }}
                      className="ml-1 shrink-0 px-1 text-[8px] font-semibold tabular-nums text-cyan-300/80 hover:text-cyan-200"
                      title="Click to view full chat date and time"
                    >
                      {shortChatDate(timestamp)}
                    </button>
                    <button type="button" onClick={() => void openConversation(conversation)} onDoubleClick={(event) => { event.preventDefault(); setEditingId(conversation.id); setEditingTitle(conversation.title); }} className="min-w-0 flex-1 truncate px-1.5 text-left text-xs text-[var(--gold-soft)]" title="Click: open full conversation · Double-click: edit title">{conversation.title}</button>
                    <button type="button" onClick={(event) => { event.stopPropagation(); setEditingId(conversation.id); setEditingTitle(conversation.title); }} className="mr-1 grid h-6 w-6 shrink-0 place-items-center text-[#FFD700] hover:bg-white/[0.04]" title="Edit conversation title"><Pencil size={13} /></button>
                    {dateOpen ? (
                      <div
                        className="absolute left-7 top-full z-[160] mt-1 w-[190px] rounded-md border border-cyan-300/25 bg-[#07111f] px-2.5 py-2 text-[10px] leading-4 text-white shadow-xl"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="font-semibold text-cyan-200">Chat date & time</div>
                        <div className="mt-0.5 text-white/80">{fullChatDate(timestamp)}</div>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            );
          })}
          {loaded && visible.length === 0 ? <p className="p-2 text-xs text-[var(--muted)]">No conversations yet.</p> : null}
          {!loaded ? <p className="p-2 text-xs text-[var(--muted)]">Loading conversations…</p> : null}
        </div>
      </div>

      <button type="button" onMouseDown={(event) => { event.preventDefault(); dragging.current = true; document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; }} onDoubleClick={toggleCollapsed} className="absolute right-0 top-0 z-30 flex h-full w-3 translate-x-1/2 cursor-col-resize items-center justify-center"><GripVertical size={14} className="text-white/35" /></button>
      <button type="button" onClick={toggleCollapsed} className="fixed left-0 top-1/2 z-[100] flex h-8 w-5 -translate-y-1/2 items-center justify-center rounded-r-lg border border-l-0 border-[#d7bb68]/70 bg-black/95 text-[#FFD700] shadow-lg hover:bg-white/10" title="Close conversation list"><ChevronLeft size={11} strokeWidth={4} /></button>
    </aside>
  );
}
