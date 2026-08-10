"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, Landmark, Search, ShieldCheck, X } from "lucide-react";
import { COMMON_ROOM_FIELDS, ROOM_TEMPLATES } from "@/lib/rooms/templates";

type Room = { id: string; name: string; description?: string; status: string };
type User = { id: string; email: string; fullName: string; defaultLanguage: string; mode: string };
type AnswerState = Record<string, string>;

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [templateId, setTemplateId] = useState("business");
  const [answers, setAnswers] = useState<AnswerState>({});
  const [builderOpen, setBuilderOpen] = useState(false);
  const [wish, setWish] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const template = useMemo(() => ROOM_TEMPLATES.find((item) => item.id === templateId) || ROOM_TEMPLATES[0], [templateId]);
  const fields = useMemo(() => [...COMMON_ROOM_FIELDS, ...template.fields], [template]);

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
    if (!me.ok) { router.push("/login"); return; }
    const meData = await me.json();
    setUser(meData.user);
    const roomsRes = await fetch("/api/rooms");
    const roomsData = await roomsRes.json();
    setRooms(roomsData.rooms || []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  function openTemplate(id: string) {
    setTemplateId(id);
    setAnswers({});
    setError("");
    setBuilderOpen(true);
  }

  function setAnswer(id: string, value: string) { setAnswers((prev) => ({ ...prev, [id]: value })); }

  function buildDescription() {
    const detailLines = fields.map((field) => `${field.label}: ${answers[field.id]?.trim() || "Not specified"}`);
    return [`Room category: ${template.name}`, `Template purpose: ${template.shortDescription}`, `Suggested AI agents: ${template.suggestedAgents.join(", ")}`, ...detailLines].join("\n");
  }

  async function createRoom(e: FormEvent) {
    e.preventDefault();
    setError("");
    const roomName = answers.roomName?.trim() || `${template.name} Room`;
    const res = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: roomName, description: buildDescription() }) });
    const data = await res.json();
    if (!res.ok) { setError(typeof data.error === "string" ? data.error : "Failed"); return; }
    setBuilderOpen(false);
    setAnswers({});
    router.push(`/rooms/${data.room.id}`);
  }

  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); }

  if (loading) return <main className="p-10 text-[var(--muted)]">Loading Royal Command…</main>;

  const cards = suggestedTemplates.length ? suggestedTemplates : ROOM_TEMPLATES.filter((item) => item.id === "custom");

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
              <Link key={room.id} href={`/rooms/${room.id}`} className="block rounded-2xl border-2 border-[var(--line)] bg-black/20 px-4 py-4 transition hover:border-[var(--gold)]">
                <div className="flex items-center justify-between gap-3"><div><div className="text-lg">{room.name}</div><div className="line-clamp-2 text-sm text-[var(--muted)]">{room.status}</div></div><span className="shrink-0 text-[var(--gold-soft)]">Open →</span></div>
              </Link>
            ))}
            {rooms.length === 0 ? <p className="text-sm text-[var(--muted)]">No rooms yet.</p> : null}
          </div>
        </section>

        <section className="rc-card p-5 md:p-7">
          <div className="rounded-3xl border border-[var(--gold)]/25 bg-[var(--gold)]/[0.035] p-5 md:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--gold-soft)]">Royal Command Room Builder</p>
            <h2 className="mt-2 text-4xl font-semibold tracking-wide md:text-5xl" style={{ fontFamily: "var(--font-display), serif" }}>COMMAND YOUR DOMAIN</h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)] md:text-lg">
              From Earth to space — declare your vision. Royal Command builds your AI Room.
            </p>

            <div className="mt-6 rounded-2xl border-2 border-[var(--gold)]/45 bg-black/25 p-3 shadow-[0_0_28px_rgba(212,175,55,0.08)] focus-within:border-[var(--gold)]">
              <label className="mb-2 block text-sm font-medium text-[var(--gold-soft)]">What do you want to create?</label>
              <div className="flex items-center gap-3">
                <Search size={20} className="shrink-0 text-[var(--gold-soft)]" />
                <input
                  value={wish}
                  onChange={(e) => setWish(e.target.value)}
                  className="w-full bg-transparent py-2 text-base outline-none placeholder:text-[var(--muted)]"
                  placeholder="Tell Royal Command what you want…"
                />
              </div>
            </div>

            {wish.trim() && suggestedTemplates.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--gold-soft)]">No exact match found. Choose Other / Custom and Royal Command will shape the Room around your request.</p>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openTemplate(item.id)}
                className="group min-h-32 rounded-2xl border-2 border-[var(--gold)]/25 bg-black/25 p-4 text-left shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--gold)] hover:bg-[var(--gold)]/[0.09] hover:shadow-[0_10px_32px_rgba(212,175,55,0.16)] focus-visible:border-[var(--gold)] focus-visible:bg-[var(--gold)]/[0.12] focus-visible:outline-none active:scale-[0.985] active:border-[var(--gold)] active:bg-[var(--gold)]/[0.16]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-base font-semibold leading-6 group-hover:text-[var(--gold-soft)]">{item.name}</span>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--gold)]/35 bg-[var(--gold)]/[0.06] transition group-hover:border-[var(--gold)] group-hover:bg-[var(--gold)]/15">
                    <Check size={15} className="text-[var(--gold-soft)]" />
                  </span>
                </div>
                <p className="mt-3 text-sm leading-5 text-[var(--muted)]">{item.shortDescription}</p>
              </button>
            ))}
          </div>
        </section>
      </div>

      {builderOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border-2 border-[var(--gold)]/45 bg-[#0d1628] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.55)] md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">{template.name}</p><h3 className="mt-1 text-3xl" style={{ fontFamily: "var(--font-display), serif" }}>Create Room</h3></div>
              <button type="button" onClick={() => setBuilderOpen(false)} className="rounded-full border-2 border-white/15 p-2 hover:border-[var(--gold)]" aria-label="Close"><X size={18} /></button>
            </div>
            <form onSubmit={createRoom} className="mt-6 space-y-5">
              {fields.map((field) => (
                <div key={field.id} className="rounded-2xl border-2 border-white/10 bg-black/15 p-4">
                  <label className="text-sm font-medium">{field.label}</label>
                  {field.options ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {field.options.map((option) => {
                        const selected = answers[field.id] === option;
                        return <button key={option} type="button" onClick={() => setAnswer(field.id, option)} className={`rounded-xl border-2 px-4 py-2.5 text-sm transition ${selected ? "border-[var(--gold)] bg-[var(--gold)]/20 font-semibold text-[var(--gold-soft)] shadow-[0_0_18px_rgba(212,175,55,0.16)]" : "border-white/12 bg-black/20 hover:border-[var(--gold)]/70 hover:bg-[var(--gold)]/[0.07]"}`}>{option}</button>;
                      })}
                    </div>
                  ) : <input className="rc-input mt-3" placeholder={field.placeholder || "Type here"} value={answers[field.id] || ""} onChange={(e) => setAnswer(field.id, e.target.value)} />}
                </div>
              ))}
              {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
