"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { defaultRoom6Button, defaultRoom6Design, ROOM6_BUTTONS, ROOM6_LABELS, room6DesignSchema, type Room6ButtonId, type Room6Design } from "@/lib/rooms/room6-design";

type Room = { id: string; name: string };
type Stored = { revision: number; design: Room6Design };
const IndependentAIRooms = dynamic(() => import("../rooms/[id]/IndependentAIRooms"), { loading: () => <p className="p-6">AI 대화를 불러오고 있습니다…</p> });
export default function Room6({ room, rooms }: { room: Room; rooms: Room[] }) {
  const [stored, setStored] = useState<Stored | null>(null);
  const [draft, setDraft] = useState<Room6Design>(defaultRoom6Design);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Room6ButtonId | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [chat, setChat] = useState(false);
  const [copyTarget, setCopyTarget] = useState("");
  const stage = useRef<HTMLDivElement>(null);
  const dragging = useRef<{ id: Room6ButtonId; x: number; y: number; clientX: number; clientY: number } | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const active = editing ? draft : stored?.design || draft;
  const button = draft.buttons.find(b => b.id === selected);

  useEffect(() => {
    let live = true;
    fetch(`/api/room6/design?room=${room.id}`, { cache: "no-store" }).then(async response => {
      const value = await response.json();
      if (!response.ok) throw new Error(value.error || "배치를 불러오지 못했습니다.");
      const design = room6DesignSchema.parse(value.design);
      if (live) { setStored({ revision: value.revision, design }); setDraft(design); }
    }).catch(e => { if (live) setError(e instanceof Error ? e.message : "배치를 불러오지 못했습니다."); });
    return () => { live = false; };
  }, [room.id]);
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => { if (editing) { event.preventDefault(); event.returnValue = ""; } };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); };
    window.addEventListener("beforeunload", leave); window.addEventListener("keydown", escape);
    return () => { window.removeEventListener("beforeunload", leave); window.removeEventListener("keydown", escape); };
  }, [editing]);
  function patch(value: Partial<Room6Design["buttons"][number]>) {
    setDraft(d => ({ ...d, buttons: d.buttons.map(b => b.id === selected ? { ...b, ...value, id: b.id } : b) }));
  }
  async function save() {
    if (!stored || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/room6/design", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId: room.id, revision: stored.revision, design: draft }) });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error || "저장하지 못했습니다.");
      setStored({ revision: value.revision, design: room6DesignSchema.parse(value.design) });
      setEditing(false); setSelected(null); setNotice("저장했습니다.");
    } catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했습니다."); }
    finally { setBusy(false); }
  }
  async function copy() {
    if (!copyTarget || busy || !stored) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/room6/design?room=${copyTarget}`, { cache: "no-store" });
      const current = await response.json();
      if (!response.ok) throw new Error(current.error);
      const saved = await fetch("/api/room6/design", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId: copyTarget, revision: current.revision, design: stored.design }) });
      const value = await saved.json();
      if (!saved.ok) throw new Error(value.error);
      setNotice("선택한 방에 디자인을 적용했습니다. 대화와 자료는 복사하지 않았습니다.");
    } catch (e) { setError(e instanceof Error ? e.message : "적용하지 못했습니다."); }
    finally { setBusy(false); }
  }
  function pointerDown(event: PointerEvent<HTMLButtonElement>, id: Room6ButtonId) {
    if (!editing || busy) return;
    event.preventDefault(); setSelected(id);
    const b = draft.buttons.find(item => item.id === id)!;
    dragging.current = { id, x: b.x, y: b.y, clientX: event.clientX, clientY: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const origin = dragging.current;
    if (!origin || !stage.current) return;
    const box = stage.current.getBoundingClientRect();
    setDraft(d => ({ ...d, buttons: d.buttons.map(b => b.id === origin.id ? { ...b,
      x: Math.min(85, Math.max(0, origin.x + (event.clientX - origin.clientX) / box.width * 100)),
      y: Math.min(85, Math.max(0, origin.y + (event.clientY - origin.clientY) / box.height * 100)),
    } : b) }));
  }
  async function upload(file?: File) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 1_000_000) { setError("PNG·JPG·WebP 그림을 1MB 이하로 올려주세요."); return; }
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => { setDraft(d => ({ ...d, background: "image", image: String(reader.result) })); setBusy(false); };
    reader.onerror = () => { setError("그림을 읽지 못했습니다."); setBusy(false); }; reader.readAsDataURL(file);
  }
  function exportDesign() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(active)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "RC-room-design.json"; anchor.click(); URL.revokeObjectURL(url);
  }
  async function importDesign(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > 1_500_000) throw new Error();
      const parsed = room6DesignSchema.parse(JSON.parse(await file.text()));
      setDraft(parsed); setEditing(true); setSelected(null); setError("");
    } catch { setError("유효한 RC 디자인 파일이 아닙니다. 기존 배치는 유지됩니다."); }
    finally { setBusy(false); }
  }
  const bg = active.background === "warm" ? "#493A2D" : active.background === "navy" ? "#173663" : "#07111F";
  return <main className="min-h-screen bg-[#07111f] text-[#f4f0e7]">
    <header className="flex flex-wrap items-center gap-3 border-b border-white/15 p-4">
      {editing ? <button disabled className="rounded border border-white/30 px-3 py-2 opacity-40">← 내 방</button> : <Link href="/room6" className="rounded border border-white/30 px-3 py-2">← 내 방</Link>}
      <h1 className="mr-auto text-lg font-semibold">룸6 · {room.name}</h1>
      <span className="text-xs text-amber-200">Preview · 기능 검증 중</span>
      {!editing ? <button disabled={!stored} onClick={() => { setDraft(structuredClone(stored!.design)); setEditing(true); setNotice(""); }} className="rounded bg-[#7A0C2E] px-4 py-2 disabled:opacity-40">꾸미기</button> : <>
        <button disabled={busy} onClick={save} className="rounded bg-emerald-800 px-4 py-2">{busy ? "저장 중…" : "저장 · 완료"}</button>
        <button disabled={busy} onClick={() => { setEditing(false); setSelected(null); setError(""); }}>취소</button>
      </>}
    </header>
    {error && <p role="alert" className="bg-red-950 p-3 text-red-100">{error}</p>}
    {notice && <p role="status" className="p-3 text-emerald-200">{notice}</p>}
    {!stored && !error && <p role="status" className="p-4">저장된 배치를 확인하고 있습니다…</p>}
    {editing && <fieldset disabled={busy} className="flex flex-wrap items-center gap-3 p-4 disabled:opacity-50">
      <label>배경 <select className="bg-slate-800 p-2" value={draft.background} onChange={e => { if (e.target.value === "image") imageInput.current?.click(); else setDraft(d => ({ ...d, background: e.target.value as Room6Design["background"] })); }}>
        <option value="plain">그림 없음</option><option value="navy">네이비</option><option value="warm">따뜻한 색</option><option value="image">내 그림</option>
      </select></label>
      <button className="rounded border p-2" onClick={() => imageInput.current?.click()}>그림 올리기</button>
      <input ref={imageInput} className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }}/>
      {ROOM6_BUTTONS.filter(id => !draft.buttons.some(b => b.id === id)).map(id => <button key={id} className="rounded border p-2" onClick={() => { setDraft(d => ({ ...d, buttons: [...d.buttons, defaultRoom6Button(id)] })); setSelected(id); }}>+ {ROOM6_LABELS[id]}</button>)}
      <button className="rounded border p-2" onClick={() => { setDraft(defaultRoom6Design()); setSelected(null); }}>기본 배치</button>
      <button className="rounded border p-2" onClick={exportDesign}>디자인 내보내기</button>
      <button className="rounded border p-2" onClick={() => importInput.current?.click()}>디자인 가져오기</button>
      <input ref={importInput} className="hidden" type="file" accept="application/json,.json" onChange={e => { void importDesign(e.target.files?.[0]); e.target.value = ""; }}/>
    </fieldset>}
    <div ref={stage} className="relative mx-auto min-h-[560px] w-full overflow-hidden border-y border-white/10" style={{ backgroundColor: bg, backgroundImage: active.background === "image" ? `url("${active.image}")` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}>
      {active.buttons.map(b => <button key={b.id} data-room6-action={b.id} aria-label={ROOM6_LABELS[b.id]} disabled={!stored || busy}
        onPointerDown={e => pointerDown(e, b.id)} onPointerMove={pointerMove} onPointerUp={() => { dragging.current = null; }} onPointerCancel={() => { dragging.current = null; }}
        onClick={() => { if (editing) setSelected(b.id); else if (b.id === "chat") setChat(true); else window.location.assign(b.id === "secretary" ? "/secretary" : `/rooms/${room.id}`); }}
        onKeyDown={e => { if (!editing || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return; e.preventDefault(); setSelected(b.id); setDraft(d => ({ ...d, buttons: d.buttons.map(item => item.id === b.id ? { ...item, x: Math.min(85, Math.max(0, item.x + (e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0))), y: Math.min(85, Math.max(0, item.y + (e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0))) } : item) })); }}
        className={`absolute rounded-xl border border-current px-3 font-semibold focus-visible:outline-4 focus-visible:outline-white ${editing ? "cursor-move touch-none" : ""} ${selected === b.id && editing ? "ring-4 ring-amber-300" : ""}`}
        style={{ left: `min(${b.x}%, calc(100% - min(${b.width}px, 90vw)))`, top: `min(${b.y}%, calc(100% - ${b.height}px))`, width: `min(${b.width}px, 90vw)`, height: b.height, color: b.colour, backgroundColor: `${b.background}${Math.round(b.opacity * 255).toString(16).padStart(2, "0")}` }}>{b.label}</button>)}
    </div>
    {editing && button && <fieldset disabled={busy} aria-label="버튼 편집" className="mx-auto grid max-w-3xl grid-cols-2 gap-4 p-5 sm:grid-cols-3 disabled:opacity-50">
      <label>이름<input className="mt-1 w-full rounded bg-slate-800 p-2" value={button.label} maxLength={40} onChange={e => patch({ label: e.target.value })}/></label>
      <label>글자색<input className="block h-10" type="color" value={button.colour} onChange={e => patch({ colour: e.target.value })}/></label>
      <label>버튼색<input className="block h-10" type="color" value={button.background} onChange={e => patch({ background: e.target.value })}/></label>
      <label>가로 {button.width}px<input className="block w-full" type="range" min="90" max="280" value={button.width} onChange={e => patch({ width: Number(e.target.value) })}/></label>
      <label>세로 {button.height}px<input className="block w-full" type="range" min="44" max="120" value={button.height} onChange={e => patch({ height: Number(e.target.value) })}/></label>
      <label>배경 진하기<input className="block w-full" type="range" min="0" max="1" step="0.05" value={button.opacity} onChange={e => patch({ opacity: Number(e.target.value) })}/></label>
      {button.id !== "chat" && <button className="rounded border p-2" onClick={() => { setDraft(d => ({ ...d, buttons: d.buttons.filter(b => b.id !== selected) })); setSelected(null); }}>버튼 빼기</button>}
      <button className="rounded border p-2" onClick={() => setSelected(null)}>편집창 닫기</button>
    </fieldset>}
    {!editing && rooms.length > 1 && <section className="flex flex-wrap gap-3 p-4">
      <select aria-label="디자인 적용할 방" className="rounded bg-slate-800 p-2" value={copyTarget} onChange={e => setCopyTarget(e.target.value)}><option value="">디자인 적용할 다른 방</option>{rooms.filter(r => r.id !== room.id).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
      <button disabled={!copyTarget || busy || !stored} className="rounded border px-3 py-2 disabled:opacity-40" onClick={copy}>디자인 적용</button>
      {copyTarget && <Link className="p-2 underline" href={`/room6?room=${copyTarget}`}>선택한 방 열기</Link>}
    </section>}
    {chat && <div role="dialog" aria-modal="true" aria-label="룸6 AI 대화" className="fixed inset-0 z-[10000] overflow-auto bg-[#07111f]">
      <button className="fixed bottom-5 right-5 z-[20000] rounded-xl border border-amber-200 bg-[#7A0C2E] px-5 py-3 text-white shadow-xl" onClick={() => setChat(false)}>← 룸6으로</button>
      <IndependentAIRooms roomId={room.id}/>
    </div>}
  </main>;
}
