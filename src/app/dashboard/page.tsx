"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Check, Landmark, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { ROOM_TEMPLATES } from "@/lib/rooms/templates";

type Room = { id: string; name: string; description?: string; status: string };
type User = { id: string; email: string; fullName: string; defaultLanguage: string; mode: string };
type AnswerState = Record<string, string>;
type StepField = { id: string; label: string; placeholder?: string; options?: string[] };

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [templateId, setTemplateId] = useState("business");
  const [answers, setAnswers] = useState<AnswerState>({});
  const [builderOpen, setBuilderOpen] = useState(false);
  const [wish, setWish] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [deletingRoomId, setDeletingRoomId] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const textInputRef = useRef<HTMLInputElement | null>(null);

  const template = useMemo(
    () => ROOM_TEMPLATES.find((item) => item.id === templateId) || ROOM_TEMPLATES[0],
    [templateId],
  );

  const fields = useMemo<StepField[]>(
    () => [
      { id: "roomName", label: "Room name", placeholder: `e.g. ${template.name}` },
      ...template.fields,
    ],
    [template],
  );

  const currentField = fields[stepIndex];

  const suggestedTemplates = useMemo(() => {
    const q = wish.trim().toLowerCase();
    if (!q) return ROOM_TEMPLATES;
    const words = q.split(/\s+/).filter(Boolean);
    return ROOM_TEMPLATES.filter((item) => {
      const haystack = [item.name, item.shortDescription, ...item.suggestedAgents].join(" ").toLowerCase();
      return words.some((word) => haystack.includes(word));
    });
  }, [wish]);

  async function load() {
    setLoading(true);
    const me = await fetch("/api/auth/me");
    if (!me.ok) {
      router.push("/login");
      return;
    }
    const meData = await me.json();
    setUser(meData.user);
    const roomsRes = await fetch("/api/rooms");
    const roomsData = await roomsRes.json();
    setRooms(roomsData.rooms || []);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
    // `load` is the one-shot Dashboard bootstrap; it intentionally runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!builderOpen || !currentField || currentField.options) return;
    const timer = window.setTimeout(() => textInputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [builderOpen, stepIndex, currentField]);

  function openTemplate(id: string) {
    setTemplateId(id);
    setAnswers({});
    setStepIndex(0);
    setError("");
    setBuilderOpen(true);
  }

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function buildDescription(nextAnswers: AnswerState = answers) {
    const detailLines = template.fields.map(
      (field) => `${field.label}: ${nextAnswers[field.id]?.trim() || "Not specified"}`,
    );
    return [
      `Room category: ${template.name}`,
      `Template purpose: ${template.shortDescription}`,
      `Suggested AI agents: ${template.suggestedAgents.join(", ")}`,
      ...detailLines,
    ].join("\n");
  }

  async function createRoom(finalAnswers: AnswerState) {
    setError("");
    const roomName = finalAnswers.roomName?.trim() || `${template.name} Room`;
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: roomName, description: buildDescription(finalAnswers) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Failed to create Room");
      return;
    }
    setBuilderOpen(false);
    setAnswers({});
    setStepIndex(0);
    router.push(`/rooms/${data.room.id}`);
  }

  async function commitCurrent(value: string) {
    if (!currentField) return;
    const clean = value.trim();
    if (!clean) return;
    const nextAnswers = { ...answers, [currentField.id]: clean };
    setAnswers(nextAnswers);

    if (stepIndex >= fields.length - 1) {
      await createRoom(nextAnswers);
      return;
    }
    setStepIndex((current) => current + 1);
  }

  function handleTextSubmit(e: FormEvent) {
    e.preventDefault();
    if (!currentField) return;
    void commitCurrent(answers[currentField.id] || "");
  }

  function askToDeleteRoom(room: Room) {
    setDeleteError("");
    setRoomToDelete(room);
  }

  async function deleteRoom() {
    if (!roomToDelete || deletingRoomId) return;
    setDeleteError("");
    setDeletingRoomId(roomToDelete.id);
    try {
      const response = await fetch(`/api/rooms/${roomToDelete.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setDeleteError(typeof payload.error === "string" ? payload.error : "Could not delete this Room.");
        return;
      }
      setRooms((current) => current.filter((room) => room.id !== roomToDelete.id));
      setRoomToDelete(null);
    } catch {
      setDeleteError("Could not delete this Room. Please try again.");
    } finally {
      setDeletingRoomId("");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (loading) return <main className="p-10 text-[var(--muted)]">Loading Royal Command…</main>;

  const cards = suggestedTemplates.length
    ? suggestedTemplates
    : ROOM_TEMPLATES.filter((item) => item.id === "custom");

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--gold-soft)]">Royal Command</p>
          <h1 className="text-4xl" style={{ fontFamily: "var(--font-display), serif" }}>{user?.fullName}</h1>
          <p className="text-sm text-[var(--muted)]">{user?.email} · mode {user?.mode} · lang {user?.defaultLanguage}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/finance" className="rc-btn rc-btn-primary text-sm"><Landmark size={16} /> Australia Finance</Link>
          <Link href="/security" className="rc-btn rc-btn-ghost text-sm"><ShieldCheck size={16} /> Security</Link>
          <Link href="/" className="rc-btn rc-btn-ghost text-sm">Home</Link>
          <button onClick={logout} className="rc-btn rc-btn-ghost text-sm">Sign out</button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <section className="rc-card p-5 md:p-6">
          <h2 className="text-2xl" style={{ fontFamily: "var(--font-display), serif" }}>Your Rooms</h2>
          <div className="mt-6 space-y-3">
            {rooms.map((room) => (
              <div key={room.id} className="rounded-2xl border-2 border-[var(--line)] bg-black/20 px-4 py-4 transition hover:border-[var(--gold)]">
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/rooms/${room.id}`} className="min-w-0 flex-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]">
                    <div className="text-lg">{room.name}</div>
                    <div className="line-clamp-2 text-sm text-[var(--muted)]">{room.status}</div>
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link href={`/rooms/${room.id}`} className="rounded-lg px-2 py-2 text-[var(--gold-soft)] hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]">Open →</Link>
                    <button
                      type="button"
                      onClick={() => askToDeleteRoom(room)}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-red-400/35 px-2.5 py-2 text-sm text-red-200 transition hover:border-red-300 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                      aria-label={`Delete ${room.name}`}
                    >
                      <Trash2 size={15} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {rooms.length === 0 ? <p className="text-sm text-[var(--muted)]">No rooms yet.</p> : null}
          </div>
        </section>

        <section className="rc-card p-5 md:p-7">
          <div className="rounded-3xl border border-[var(--gold)]/25 bg-[var(--gold)]/[0.035] p-5 md:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--gold-soft)]">Royal Command Room Builder</p>
            <h2 className="mt-2 text-4xl font-semibold tracking-wide md:text-5xl" style={{ fontFamily: "var(--font-display), serif" }}>COMMAND YOUR DOMAIN</h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)] md:text-lg">From Earth to space — declare your vision. Royal Command builds your AI Room.</p>

            <div className="mt-6 rounded-2xl border-2 border-[var(--gold)]/45 bg-black/25 p-3 shadow-[0_0_28px_rgba(212,175,55,0.08)] focus-within:border-[var(--gold)]">
              <label className="mb-2 block text-sm font-medium text-[var(--gold-soft)]">What do you want to create?</label>
              <div className="flex items-center gap-3">
                <Search size={20} className="shrink-0 text-[var(--gold-soft)]" />
                <input value={wish} onChange={(e) => setWish(e.target.value)} className="w-full bg-transparent py-2 text-base outline-none placeholder:text-[var(--muted)]" placeholder="Tell Royal Command what you want…" />
              </div>
            </div>

            {wish.trim() && suggestedTemplates.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--gold-soft)]">No exact match found. Choose Other / Custom.</p>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((item) => (
              <button key={item.id} type="button" onClick={() => openTemplate(item.id)} className="group min-h-32 rounded-2xl border-2 border-[var(--gold)]/25 bg-black/25 p-4 text-left shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--gold)] hover:bg-[var(--gold)]/[0.09] hover:shadow-[0_10px_32px_rgba(212,175,55,0.16)] focus-visible:border-[var(--gold)] focus-visible:bg-[var(--gold)]/[0.12] focus-visible:outline-none active:scale-[0.985] active:border-[var(--gold)] active:bg-[var(--gold)]/[0.16]">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-base font-semibold leading-6 group-hover:text-[var(--gold-soft)]">{item.name}</span>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--gold)]/35 bg-[var(--gold)]/[0.06] transition group-hover:border-[var(--gold)] group-hover:bg-[var(--gold)]/15"><Check size={15} className="text-[var(--gold-soft)]" /></span>
                </div>
                <p className="mt-3 text-sm leading-5 text-[var(--muted)]">{item.shortDescription}</p>
              </button>
            ))}
          </div>
        </section>
      </div>

      {roomToDelete ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-room-title">
          <div className="w-full max-w-md rounded-3xl border-2 border-red-400/45 bg-[#0d1628] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.68)] md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">Permanent deletion</p>
                <h2 id="delete-room-title" className="mt-2 text-2xl font-semibold">Delete this Room?</h2>
              </div>
              <button
                type="button"
                onClick={() => !deletingRoomId && setRoomToDelete(null)}
                className="rounded-full border border-white/15 p-2 hover:border-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                aria-label="Cancel deletion"
                disabled={Boolean(deletingRoomId)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="text-sm text-[var(--muted)]">Room to delete</div>
              <div className="mt-1 break-words text-lg font-semibold text-white">{roomToDelete.name}</div>
            </div>

            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              This permanently removes this Room and its saved messages and documents. This action cannot be undone.
            </p>

            {deleteError ? <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{deleteError}</p> : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setRoomToDelete(null)}
                className="rc-btn rc-btn-ghost min-h-11"
                disabled={Boolean(deletingRoomId)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void deleteRoom()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-300/60 bg-red-600/80 px-5 py-2.5 font-semibold text-white transition hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={Boolean(deletingRoomId)}
              >
                <Trash2 size={17} /> {deletingRoomId ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {builderOpen && currentField ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border-2 border-[var(--gold)]/55 bg-[#0d1628] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.62)] md:p-8">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--gold-soft)]">{template.name}</p>
              <button type="button" onClick={() => setBuilderOpen(false)} className="rounded-full border-2 border-white/15 p-2 hover:border-[var(--gold)]" aria-label="Close"><X size={18} /></button>
            </div>

            <div className="mt-6">
              <label className="text-xl font-semibold">{currentField.label}</label>

              {currentField.options ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {currentField.options.map((option) => (
                    <button key={option} type="button" onClick={() => void commitCurrent(option)} className="rounded-2xl border-2 border-white/15 bg-black/20 px-5 py-4 text-left text-base transition hover:border-[var(--gold)] hover:bg-[var(--gold)]/10 hover:text-[var(--gold-soft)] active:scale-[0.99] active:border-[var(--gold)] active:bg-[var(--gold)]/20">
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <form onSubmit={handleTextSubmit} className="mt-5">
                  <input ref={textInputRef} className="rc-input text-lg" placeholder={currentField.placeholder || "Type here"} value={answers[currentField.id] || ""} onChange={(e) => setAnswer(currentField.id, e.target.value)} autoFocus />
                </form>
              )}
            </div>

            {error ? <p className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
