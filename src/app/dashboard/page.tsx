"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, Landmark, ShieldCheck, X } from "lucide-react";
import { COMMON_ROOM_FIELDS, ROOM_TEMPLATES } from "@/lib/rooms/templates";

type Room = {
  id: string;
  name: string;
  description?: string;
  status: string;
};

type User = {
  id: string;
  email: string;
  fullName: string;
  defaultLanguage: string;
  mode: string;
};

type AnswerState = Record<string, string>;

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [templateId, setTemplateId] = useState("business");
  const [answers, setAnswers] = useState<AnswerState>({});
  const [builderOpen, setBuilderOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const template = useMemo(
    () => ROOM_TEMPLATES.find((item) => item.id === templateId) || ROOM_TEMPLATES[0],
    [templateId],
  );

  const fields = useMemo(() => [...COMMON_ROOM_FIELDS, ...template.fields], [template]);

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
    void load();
  }, []);

  function selectTemplate(id: string) {
    setTemplateId(id);
    setAnswers({});
    setError("");
  }

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function buildDescription() {
    const detailLines = fields.map((field) => {
      const value = answers[field.id]?.trim();
      return `${field.label}: ${value || "Not specified"}`;
    });
    return [
      `Room category: ${template.name}`,
      `Template purpose: ${template.shortDescription}`,
      `Suggested AI agents: ${template.suggestedAgents.join(", ")}`,
      ...detailLines,
    ].join("\n");
  }

  async function createRoom(e: FormEvent) {
    e.preventDefault();
    setError("");
    const roomName = answers.roomName?.trim() || `${template.name} Room`;
    const description = buildDescription();
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: roomName, description }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Failed");
      return;
    }
    setBuilderOpen(false);
    setAnswers({});
    router.push(`/rooms/${data.room.id}`);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (loading) {
    return <main className="p-10 text-[var(--muted)]">Loading Royal Command…</main>;
  }

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

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rc-card p-5 md:p-6">
          <h2 className="text-2xl" style={{ fontFamily: "var(--font-display), serif" }}>Your Rooms</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Open an existing Room.</p>
          <div className="mt-6 space-y-3">
            {rooms.map((room) => (
              <Link key={room.id} href={`/rooms/${room.id}`} className="block rounded-2xl border border-[var(--line)] bg-black/20 px-4 py-4 transition hover:border-[var(--gold)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg">{room.name}</div>
                    <div className="line-clamp-2 text-sm text-[var(--muted)]">{room.status}</div>
                  </div>
                  <span className="shrink-0 text-[var(--gold-soft)]">Open →</span>
                </div>
              </Link>
            ))}
            {rooms.length === 0 ? <p className="text-sm text-[var(--muted)]">No rooms yet.</p> : null}
          </div>
        </section>

        <section className="rc-card p-5 md:p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Room Builder</p>
          <h2 className="mt-1 text-3xl" style={{ fontFamily: "var(--font-display), serif" }}>Create a Room</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Choose the type of Room, then continue.</p>

          <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ROOM_TEMPLATES.map((item) => {
              const active = item.id === templateId;
              return (
                <button key={item.id} type="button" onClick={() => selectTemplate(item.id)} className={`rounded-2xl border p-3 text-left transition ${active ? "border-[var(--gold)] bg-[var(--gold)]/10" : "border-white/10 bg-black/20 hover:border-white/25"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{item.name}</span>
                    {active ? <Check size={16} className="text-[var(--gold-soft)]" /> : null}
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">{item.shortDescription}</p>
                </button>
              );
            })}
          </div>

          <button type="button" onClick={() => setBuilderOpen(true)} className="rc-btn rc-btn-primary mt-6 w-full py-3 text-base">Create Room</button>
        </section>
      </div>

      {builderOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[var(--gold)]/30 bg-[#0d1628] p-5 shadow-2xl md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">{template.name}</p>
                <h3 className="mt-1 text-3xl" style={{ fontFamily: "var(--font-display), serif" }}>Room Setup</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">Click the choices that fit. Type only where a short answer is needed.</p>
              </div>
              <button type="button" onClick={() => setBuilderOpen(false)} className="rounded-full border border-white/10 p-2 hover:border-white/30" aria-label="Close"><X size={18} /></button>
            </div>

            <form onSubmit={createRoom} className="mt-6 space-y-5">
              {fields.map((field) => (
                <div key={field.id} className="rounded-2xl border border-white/10 bg-black/15 p-4">
                  <label className="text-sm font-medium">{field.label}</label>
                  {field.options ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {field.options.map((option) => {
                        const selected = answers[field.id] === option;
                        return (
                          <button key={option} type="button" onClick={() => setAnswer(field.id, option)} className={`rounded-xl border px-3 py-2 text-sm transition ${selected ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold-soft)]" : "border-white/10 bg-black/20 hover:border-white/30"}`}>
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <input className="rc-input mt-3" placeholder={field.placeholder || "Type here"} value={answers[field.id] || ""} onChange={(e) => setAnswer(field.id, e.target.value)} />
                  )}
                </div>
              ))}

              {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
              <button className="rc-btn rc-btn-primary w-full py-3 text-base">Create My Room</button>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
