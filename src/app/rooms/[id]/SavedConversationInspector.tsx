"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";

type SavedConversation = {
  id: string;
  roomId: string;
  title: string;
  content: string;
  createdAt: string;
};

type PanelPosition = { left: number; top: number };

export default function SavedConversationInspector() {
  const params = useParams<{ id: string }>();
  const roomId = params?.id || "";
  const [items, setItems] = useState<SavedConversation[]>([]);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState("");
  const [position, setPosition] = useState<PanelPosition>({ left: 210, top: 310 });

  async function loadSaved() {
    if (!roomId) return;
    setLoading(true);
    try {
      const response = await fetch("/api/user/preferences", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      const saved = Array.isArray(data?.preferences?.importantConversations)
        ? data.preferences.importantConversations as SavedConversation[]
        : [];
      setItems(saved.filter((item) => item?.roomId === roomId).slice(0, 12));
    } catch {
      // Keep the inspector non-blocking if preferences are temporarily unavailable.
    } finally {
      setLoading(false);
    }
  }

  function positionFrom(button: HTMLButtonElement) {
    const rect = button.getBoundingClientRect();
    const width = 390;
    const left = Math.min(window.innerWidth - width - 12, Math.max(12, rect.right + 8));
    const top = Math.min(window.innerHeight - 300, Math.max(72, rect.top - 4));
    setPosition({ left, top });
  }

  useEffect(() => {
    const findSaveButton = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return null;
      const button = target.closest<HTMLButtonElement>("button");
      if (!button) return null;
      return (button.textContent || "").trim() === "SAVE" ? button : null;
    };

    const onMouseOver = (event: MouseEvent) => {
      const button = findSaveButton(event.target);
      if (!button) return;
      positionFrom(button);
      setOpen(true);
      void loadSaved();
    };

    const onMouseOut = (event: MouseEvent) => {
      if (pinned) return;
      const button = findSaveButton(event.target);
      if (!button) return;
      const next = event.relatedTarget;
      if (next instanceof Element && next.closest("[data-rc-saved-inspector]")) return;
      window.setTimeout(() => setOpen((current) => pinned ? current : false), 180);
    };

    const onClick = (event: MouseEvent) => {
      const button = findSaveButton(event.target);
      if (button) {
        positionFrom(button);
        window.setTimeout(() => {
          void loadSaved();
          setPinned(true);
          setOpen(true);
        }, 900);
        return;
      }

      const target = event.target;
      if (target instanceof Element && target.closest("[data-rc-saved-inspector]")) return;
      setPinned(false);
      setOpen(false);
    };

    document.addEventListener("mouseover", onMouseOver, true);
    document.addEventListener("mouseout", onMouseOut, true);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("mouseover", onMouseOver, true);
      document.removeEventListener("mouseout", onMouseOut, true);
      document.removeEventListener("click", onClick, true);
    };
  }, [roomId, pinned]);

  if (!open) return null;

  return (
    <aside
      data-rc-saved-inspector
      className="fixed z-[700] w-[390px] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-emerald-400/45 bg-[#07111f]/98 text-white shadow-[0_20px_60px_rgba(0,0,0,.65)] backdrop-blur-md"
      style={{ left: position.left, top: position.top }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => { if (!pinned) setOpen(false); }}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-300" />
          <div>
            <div className="text-xs font-semibold text-emerald-200">Saved Conversations</div>
            <div className="text-[10px] text-white/50">{items.length} saved in this Room</div>
          </div>
        </div>
        <button type="button" onClick={() => { setPinned(false); setOpen(false); }} className="grid h-7 w-7 place-items-center rounded-md text-white/60 hover:bg-white/5" title="Close"><X size={14} /></button>
      </div>

      <div className="max-h-[330px] overflow-y-auto p-2">
        {loading && !items.length ? <div className="p-4 text-center text-[11px] text-white/50">Checking saved conversations…</div> : null}
        {!loading && !items.length ? <div className="p-4 text-center text-[11px] text-white/50">No saved conversations in this Room yet.</div> : null}
        <div className="space-y-1.5">
          {items.map((item) => {
            const expanded = expandedId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setExpandedId(expanded ? "" : item.id)}
                className="block w-full rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-left hover:border-emerald-300/35 hover:bg-white/[0.045]"
                title="Click to view saved content"
              >
                <div className="truncate text-[11px] font-semibold text-[#f3d98c]">✓ {item.title}</div>
                <div className={`mt-1 whitespace-pre-wrap text-[10px] leading-4 text-white/65 ${expanded ? "" : "line-clamp-3"}`}>
                  {item.content || "Saved conversation"}
                </div>
                <div className="mt-1 text-[9px] text-emerald-300/70">{expanded ? "Click to collapse" : "Click to view more"}</div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
