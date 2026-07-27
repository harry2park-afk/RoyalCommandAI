"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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

  async function createRoom(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Failed");
      return;
    }
    setName("");
    setDescription("");
    router.push(`/rooms/${data.room.id}`);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (loading) {
    return <main className="p-10 text-[var(--muted)]">Loading Household…</main>;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-8">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--gold-soft)]">
            Royal Household
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

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rc-card p-6">
          <h2 className="text-2xl" style={{ fontFamily: "var(--font-display), serif" }}>
            Rooms
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Permanent neutral spaces. Services connect — Rooms never change.
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
                    <div className="text-sm text-[var(--muted)]">
                      {room.description || "No description"} · {room.status}
                    </div>
                  </div>
                  <span className="text-[var(--gold-soft)]">Open →</span>
                </div>
              </Link>
            ))}
            {rooms.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No rooms yet. Create your first Room.</p>
            ) : null}
          </div>
        </section>

        <section className="rc-card p-6">
          <h2 className="text-2xl" style={{ fontFamily: "var(--font-display), serif" }}>
            Create Room
          </h2>
          <form onSubmit={createRoom} className="mt-6 space-y-4">
            <input
              className="rc-input"
              placeholder="Room name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <textarea
              className="rc-input min-h-28"
              placeholder="Purpose (optional description — not a room type)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
            <button className="rc-btn rc-btn-primary w-full">Create Room</button>
          </form>
        </section>
      </div>
    </main>
  );
}
