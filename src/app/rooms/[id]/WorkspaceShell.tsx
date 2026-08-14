"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import { Check, GripVertical, Plus, Trash2 } from "lucide-react";

type Room = { id: string; name: string; status?: string };
type Task = { id: string; text: string; done: boolean };

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const task = value as Record<string, unknown>;
  return typeof task.id === "string" && typeof task.text === "string" && typeof task.done === "boolean";
}

export default function WorkspaceShell({ children }: { children: ReactNode }) {
  const params = useParams<{ id: string | string[] }>();
  const router = useRouter();
  const rawRoomId = params?.id;
  const roomId = Array.isArray(rawRoomId) ? rawRoomId[0] : rawRoomId || "";
  const [rooms, setRooms] = useState<Room[]>([]);
  const [leftWidth, setLeftWidth] = useState(250);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const dragging = useRef(false);

  useEffect(() => {
    try {
      const savedWidth = Number(window.localStorage.getItem("royalcommand:left-panel-width") || 250);
      if (Number.isFinite(savedWidth)) setLeftWidth(Math.min(420, Math.max(190, savedWidth)));

      const savedTasks = window.localStorage.getItem("royalcommand:work-board");
      if (savedTasks) {
        const parsed: unknown = JSON.parse(savedTasks);
        if (Array.isArray(parsed)) setTasks(parsed.filter(isTask));
        else window.localStorage.removeItem("royalcommand:work-board");
      }
    } catch {
      window.localStorage.removeItem("royalcommand:work-board");
    }
    void loadRooms();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("royalcommand:left-panel-width", String(leftWidth));
    } catch {
      // Workspace still works if browser storage is blocked.
    }
  }, [leftWidth]);

  useEffect(() => {
    try {
      window.localStorage.setItem("royalcommand:work-board", JSON.stringify(tasks));
    } catch {
      // Workspace still works if browser storage is blocked.
    }
  }, [tasks]);

  useEffect(() => {
    function move(e: MouseEvent) {
      if (!dragging.current) return;
      setLeftWidth(Math.min(420, Math.max(190, e.clientX)));
    }
    function up() { dragging.current = false; }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  async function loadRooms() {
    try {
      const res = await fetch("/api/rooms", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setRooms(Array.isArray(data.rooms) ? data.rooms : []);
    } catch {
      setRooms([]);
    }
  }

  async function deleteRoom(id: string) {
    if (!window.confirm("이 채팅을 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/rooms/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setRooms((prev) => prev.filter((room) => room.id !== id));
    if (id === roomId) router.push("/dashboard");
  }

  function addTask() {
    const text = newTask.trim();
    if (!text) return;
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setTasks((prev) => [{ id, text, done: false }, ...prev]);
    setNewTask("");
  }

  return (
    <div className="flex min-h-screen w-full overflow-hidden">
      <aside
        className="relative hidden shrink-0 border-r border-white/10 bg-black/30 lg:flex lg:flex-col"
        style={{ width: leftWidth }}
      >
        <div className="border-b border-white/10 px-3 py-3">
          <div className="text-sm font-semibold text-[var(--gold-soft)]">채팅 목록</div>
          <div className="mt-1 text-[10px] text-[var(--muted)]">오래된 채팅은 아래로 이동합니다.</div>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {rooms.map((room) => (
            <div key={room.id} className={`group flex items-center rounded-xl border ${room.id === roomId ? "border-[var(--gold)] bg-[var(--gold)]/10" : "border-transparent hover:border-white/10 hover:bg-white/[0.03]"}`}>
              <Link href={`/rooms/${room.id}`} className="min-w-0 flex-1 truncate px-3 py-2 text-sm" title={room.name}>
                {room.name}
              </Link>
              <button
                type="button"
                onClick={() => void deleteRoom(room.id)}
                className="mr-1 rounded-lg p-2 text-[var(--muted)] opacity-60 hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100"
                title="채팅 삭제"
                aria-label={`${room.name} delete`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); dragging.current = true; }}
          className="absolute right-0 top-0 flex h-full w-3 translate-x-1/2 cursor-col-resize items-center justify-center"
          title="좌우로 끌어서 폭 조절"
        >
          <GripVertical size={14} className="text-white/20" />
        </button>
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>

      <aside className="hidden w-[340px] shrink-0 border-l border-white/10 bg-black/30 p-3 xl:flex xl:min-h-screen xl:flex-col">
        <div className="mb-3">
          <div className="text-sm font-semibold text-[var(--gold-soft)]">할 일 / 지시 보드</div>
          <div className="mt-1 text-[10px] text-[var(--muted)]">계속 보면서 Royal Command에 지시할 내용을 적어두세요.</div>
        </div>

        <div className="mb-3 flex gap-2">
          <input
            className="rc-input min-w-0 flex-1 !py-2 text-sm"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
            placeholder="할 일 입력…"
          />
          <button type="button" onClick={addTask} className="rc-btn rc-btn-primary !px-3" title="추가">
            <Plus size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto">
          {tasks.map((task) => (
            <div key={task.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => setTasks((prev) => prev.map((item) => item.id === task.id ? { ...item, done: !item.done } : item))}
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border ${task.done ? "border-[var(--gold)] bg-[var(--gold)] text-black" : "border-white/20"}`}
                  title="완료 표시"
                >
                  {task.done ? <Check size={13} /> : null}
                </button>
                <div className={`min-w-0 flex-1 whitespace-pre-wrap text-sm leading-5 ${task.done ? "text-[var(--muted)] line-through" : ""}`}>{task.text}</div>
                <button
                  type="button"
                  onClick={() => setTasks((prev) => prev.filter((item) => item.id !== task.id))}
                  className="rounded p-1 text-[var(--muted)] hover:bg-red-500/10 hover:text-red-300"
                  title="할 일 삭제"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {tasks.length === 0 ? <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-[var(--muted)]">아직 할 일이 없습니다.</div> : null}
        </div>
      </aside>
    </div>
  );
}
��B����	�ث� ���w&�fW'F�6�6��S׳G�6�74��S�'FW�B�v��FR�#"����'WGF�����6�FSࠢ�F�b6�74��S�&֖��r�f�W���fW&f��rג�WF�#�6���G&V����F�c���F�c����Р