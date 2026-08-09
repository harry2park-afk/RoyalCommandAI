"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { COMMON_ROOM_FIELDS, ROOM_TEMPLATES } from "@/lib/rooms/templates";

type Room = {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt?: string;
  created_at?: string;
};

type User = {
  id: string;
  email: string;
  fullName: string;
  defaultLanguage: string;
  mode: string;
};

type AnswerState = Record<string, string>;
type RecommendState = Record<string, boolean>;

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [templateId, setTemplateId] = useState("business");
  const [answers, setAnswers] = useState<AnswerState>({});
  const [recommend, setRecommend] = useState<RecommendState>({});
  const [recommendAll, setRecommendAll] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const template = useMemo(
    () => ROOM_TEMPLATES.find((item) => item.id === templateId) || ROOM_TEMPLATES[0],
    [templateId],
  );

  const fields = useMemo(
    () => [...COMMON_ROOM_FIELDS, ...template.fields],
    [template],
  );

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
    load();
  }, []);

  function selectTemplate(id: string) {
    setTemplateId(id);
    setAnswers({});
    setRecommend({});
    setRecommendAll(false);
  }

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function toggleRecommend(id: string) {
    setRecommend((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function buildDescription() {
    const detailLines = fields.map((field) => {
      const useAI = recommendAll || recommend[field.id];
      const value = answers[field.id]?.trim();
      return `${field.label}: ${useAI ? "AI recommendation requested" : value || "Not specified"}`;
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

    setAnswers({});
    setRecommend({});
    setRecommendAll(false);
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
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--gold-soft)]">
            Royal Command
          </p>
          <h1 className="text-4xl" style={{ fontFamily: "var(--font-display), serif" }}>
            {user?.fullName}
          </h1>
          <p className="text-sm text-[var(--muted)]">
            {user?.email} · mode {user?.mode} · lang {user?.defaultLanguage}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/" className="rc-btn rc-btn-ghost text-sm">
            Home
          </Link>
          <button onClick={logout} className="rc-btn rc-btn-ghost text-sm">
            Sign out
          </button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rc-card p-5 md:p-6">
          <h2 className="text-2xl" style={{ fontFamily: "var(--font-display), serif" }}>
            Your Rooms
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Open an existing Room or create a new one with the guided Room Builder.
          </p>
          <div className="mt-6 space-y-3">
            {rooms.map((room) => (
              <Link
                key={room.id}
                href={`/rooms/${room.id}`}
                className="block rounded-2xl border border-[var(--line)] bg-black/20 px-4 py-4 transition hover:border-[var(--gold)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg">{room.name}</div>
                    <div className="line-clamp-2 text-sm text-[var(--muted)]">
                      {room.description || "No description"} · {room.status}
                    </div>
                  </div>
                  <span className="shrink-0 text-[var(--gold-soft)]">Open →</span>
                </div>
              </Link>
            ))}
            {rooms.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No rooms yet. Create your first Room.</p>
            ) : null}
          </div>
        </section>

        <section className="rc-card p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">
                Guided Room Builder
              </p>
              <h2 className="mt-1 text-3xl" style={{ fontFamily: "var(--font-display), serif" }}>
                Create a Room
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
                Choose your field first. Royal Command will only ask questions relevant to that type of Room.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ROOM_TEMPLATES.map((item) => {
              const active = item.id === templateId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectTemplate(item.id)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    active
                      ? "border-[var(--gold)] bg-[var(--gold)]/10"
                      : "border-white/10 bg-black/20 hover:border-white/25"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{item.name}</span>
                    {active ? <Check size={16} className="text-[var(--gold-soft)]" /> : null}
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">{item.shortDescription}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl border border-[var(--gold)]/25 bg-[var(--gold)]/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium text-[var(--gold-soft)]">{template.name}</div>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Suggested AI: {template.suggestedAgents.join(" · ")}
                </p>
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--gold)]/30 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={recommendAll}
                  onChange={(e) => setRecommendAll(e.target.checked)}
                />
                <Sparkles size={15} />
                AI recommend everything
              </label>
            </div>
          </div>

          <form onSubmit={createRoom} className="mt-5 space-y-4">
            {fields.map((field) => {
              const aiRecommended = recommendAll || Boolean(recommend[field.id]);
              return (
                <div key={field.id} className="rounded-2xl border border-white/10 bg-black/15 p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <label className="text-sm font-medium">{field.label}</label>
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--gold-soft)]">
                      <input
                        type="checkbox"
                        checked={aiRecommended}
                        disabled={recommendAll}
                        onChange={() => toggleRecommend(field.id)}
                      />
                      AI recommend
                    </label>
                  </div>

                  {field.options ? (
                    <select
                      className="rc-input"
                      value={answers[field.id] || ""}
                      disabled={aiRecommended}
                      onChange={(e) => setAnswer(field.id, e.target.value)}
                    >
                      <option value="">Choose…</option>
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="rc-input"
                      placeholder={aiRecommended ? "Royal Command AI will recommend this" : field.placeholder || ""}
                      value={answers[field.id] || ""}
                      disabled={aiRecommended}
                      onChange={(e) => setAnswer(field.id, e.target.value)}
                    />
                  )}
                </div>
              );
            })}

            <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
              <label className="text-sm font-medium">Reference photo, sketch or plan</label>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Optional. This upload will be connected in the next Room Builder step.
              </p>
              <button type="button" className="rc-btn rc-btn-ghost mt-3" disabled>
                Attach reference — coming next
              </button>
            </div>

            {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

            <button className="rc-btn rc-btn-primary w-full py-3 text-base">
              Create My Room
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
