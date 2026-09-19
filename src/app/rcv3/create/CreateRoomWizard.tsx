"use client";
import { useEffect, useRef, useState } from "react";
import { roomPurposes, newRoomDraft, changePurpose, type RoomDraftInput, type DraftRegistry } from "@/lib/rcv3/room-draft";
import { roomTemplates, templateImage } from "@/lib/rcv3/templates";
import { creationText, type CreationMessage } from "@/lib/locale/rcv3-creation";
import type { AIProviderId } from "@/lib/ai/types";
import styles from "./create.module.css";

const steps = ["Room Setup", "AI & Tools", "Design", "Review"];
async function draftsRequest(body?: unknown): Promise<DraftRegistry> {
  const response = await fetch("/api/rcv3/drafts", {
    method: body ? "PUT" : "GET", cache: "no-store", signal: AbortSignal.timeout(20000),
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.code || "RCV3_STORAGE");
  return data;
}
export default function CreateRoomWizard({ language, providers }: {
  language: string; providers: { id: AIProviderId; label: string }[];
}) {
  const [input, setInput] = useState<RoomDraftInput>(newRoomDraft);
  const [registry, setRegistry] = useState<DraftRegistry>({ revision: 0, drafts: [] });
  const [draftId, setDraftId] = useState("");
  const [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false), [error, setError] = useState<CreationMessage | "">("");
  const [status, setStatus] = useState<CreationMessage | "">("");
  const [paymentMessage, setPaymentMessage] = useState<CreationMessage>("payment");
  const saving = useRef(false);
  const latestInput = useRef(input);
  useEffect(() => { latestInput.current = input; }, [input]);
  const purpose = roomPurposes.find(p => p.id === input.purpose)!;
  const selectedDesign = roomTemplates.find(t => t.id === input.templateId)!;

  useEffect(() => {
    let active = true;
    draftsRequest().then(result => {
      if (!active) return;
      setRegistry(result);
      const requestedId = new URLSearchParams(window.location.search).get("draft");
      const resumed = result.drafts.find(d => d.id === requestedId);
      if (resumed) { setInput(resumed.input); latestInput.current = resumed.input; setDraftId(resumed.id); }
      else { setDraftId(crypto.randomUUID()); }
      setLoaded(true);
    }).catch(() => { if (active) setError("error"); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/rcv3/checkout/quote", { cache: "no-store", signal: AbortSignal.timeout(20000) })
      .then(r => r.json()).then(data => {
        if (active && data.code === "RCV3_CHECKOUT_NOT_CONFIGURED") setPaymentMessage("paymentSetup");
      }).catch(() => { /* Preserve the generic unavailable message on network failure. */ });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function update(next: RoomDraftInput) { latestInput.current = next; setInput(next); setDirty(true); setStatus(""); setError(""); }
  async function save(asNew = false) {
    if (!loaded || saving.current) return;
    saving.current = true; setBusy(true); setError("");
    try {
      // Refresh on explicit fork only. A normal save never silently overrides a
      // conflict from a different tab/device.
      const current = asNew ? await draftsRequest() : registry;
      const id = asNew ? crypto.randomUUID() : draftId;
      const result = await draftsRequest({ id, expectedRevision: current.revision, input });
      setRegistry(result); setDraftId(id);
      const url = new URL(window.location.href);
      url.searchParams.set("draft", id);
      window.history.replaceState(null, "", url);
      const unchanged = JSON.stringify(latestInput.current) === JSON.stringify(input);
      setDirty(!unchanged); setStatus(unchanged ? "draft" : "");
    } catch (e) {
      setError(e instanceof Error && e.message === "RCV3_CONFLICT" ? "conflict" : e instanceof Error && e.message === "RCV3_LIMIT" ? "limit" : "error");
    } finally { saving.current = false; setBusy(false); }
  }
  useEffect(() => {
    if (!loaded || !dirty || busy || error) return;
    const timer = window.setTimeout(() => { void save(); }, 1200);
    return () => window.clearTimeout(timer);
    // save uses this render’s snapshot; pending edits remain dirty on completion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, loaded, dirty, busy, error]);
  async function next() {
    if (!input.name.trim() || (input.purpose === "custom" && !input.answers.purpose?.[0]?.trim())) {
      setError("required"); return;
    }
    update({ ...input, step: Math.min(3, input.step + 1) });
  }
  function loadDraft(id: string) {
    const draft = registry.drafts.find(d => d.id === id);
    if (dirty || !draft) return;
    latestInput.current = draft.input; setInput(draft.input); setDraftId(id); setStatus(""); setError("");
    const url = new URL(window.location.href); url.searchParams.set("draft", id);
    window.history.replaceState(null, "", url);
  }
  const providerToggle = (id: AIProviderId) => update({ ...input,
    providers: input.providers.includes(id) ? input.providers.filter(p => p !== id) : [...input.providers, id],
  });
  return <main className={styles.page}>
    <header className={styles.header}><a href="/rcv3">← My Room</a><h1>Create Room</h1>
      <span className={styles.saveState} role="status">{busy ? "Saving…" : dirty ? "Unsaved changes" : loaded ? "Draft workspace" : "Loading…"}</span>
      <button disabled={!loaded || busy} onClick={() => void save()}>Save Draft</button>
    </header>
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <h2>My Drafts</h2><button disabled={busy || dirty || !loaded} onClick={() => { const fresh = newRoomDraft(); latestInput.current = fresh; setInput(fresh); setDraftId(crypto.randomUUID()); setStatus(""); setError(""); const url = new URL(window.location.href); url.searchParams.delete("draft"); url.searchParams.delete("checkout"); window.history.replaceState(null, "", url); }}>New Draft</button>
        {registry.drafts.map(d => <button key={d.id} disabled={busy || dirty} aria-pressed={draftId === d.id} onClick={() => loadDraft(d.id)}>{d.input.name || "Untitled Room"}<small>{roomPurposes.find(p => p.id === d.input.purpose)?.name}</small></button>)}
      </aside>
      <section className={styles.workspace} aria-label="Room creation">
        <nav className={styles.steps} aria-label="Creation steps">{steps.map((s, i) => <span key={s} aria-current={input.step === i ? "step" : undefined}>{i + 1}. {s}</span>)}</nav>
        {error && <div role="alert" className={styles.error}>{creationText(error, language)}{error === "conflict" ? <button disabled={busy || !loaded} onClick={() => void save(true)}>Save as New Draft</button> : loaded && <button disabled={busy} onClick={() => void save()}>Retry</button>}{!loaded && <button onClick={() => window.location.reload()}>Retry</button>}</div>}
        {status && <p role="status" className={styles.success}>{creationText(status, language)}</p>}
        <fieldset disabled={!loaded} className={styles.form}>
          {input.step === 0 && <>
            <h2>What is your room for?</h2>
            <label>Room Name<input autoComplete="off" maxLength={80} value={input.name} onChange={e => update({ ...input, name: e.target.value })}/></label>
            <label>Purpose<select value={input.purpose} onChange={e => update(changePurpose(input, e.target.value))}>{roomPurposes.map((p, i) => <option key={p.id} value={p.id}>{i + 1}. {p.name}</option>)}</select></label>
            <p>{purpose.shortDescription}</p>
            {purpose.fields.map(field => <div key={field.id} className={styles.field}><strong>{field.label}</strong>{field.options ? <div className={styles.choices}>{field.options.map(option => <label key={option}><input type="checkbox" checked={input.answers[field.id]?.includes(option) || false} onChange={() => { const old = input.answers[field.id] || []; update({ ...input, answers: { ...input.answers, [field.id]: old.includes(option) ? old.filter(x => x !== option) : [...old, option] } }); }}/>{option}</label>)}</div> : <input aria-label={field.label} maxLength={300} value={input.answers[field.id]?.[0] || ""} onChange={e => update({ ...input, answers: { ...input.answers, [field.id]: e.target.value.trim() ? [e.target.value] : [] } })}/>}</div>)}
          </>}
          {input.step === 1 && <>
            <h2>Choose what you need</h2>
            <div className={styles.field}><strong>Tasks</strong><div className={styles.choices}>{purpose.suggestedAgents.map(task => <label key={task}><input type="checkbox" checked={input.tasks.includes(task)} onChange={() => update({ ...input, tasks: input.tasks.includes(task) ? input.tasks.filter(t => t !== task) : [...input.tasks, task] })}/>{task}</label>)}</div></div>
            <div className={styles.field}><strong>AI Services</strong><p>{creationText("requested", language)}</p><div className={styles.choices}>{providers.map(p => <label key={p.id}><input type="checkbox" checked={input.providers.includes(p.id)} onChange={() => providerToggle(p.id)}/>{p.label}</label>)}</div></div>
            <div className={styles.choices}><label><input type="checkbox" checked={input.secretary} onChange={e => update({ ...input, secretary: e.target.checked })}/>AI Secretary</label><label><input type="checkbox" checked={input.specialAI} onChange={e => update({ ...input, specialAI: e.target.checked })}/>Specialist AI</label></div>
          </>}
          {input.step === 2 && <>
            <h2>Choose a design</h2><div className={styles.designs}>{roomTemplates.map(t => <button key={t.id} type="button" aria-pressed={input.templateId === t.id} onClick={() => update({ ...input, templateId: t.id })}><img loading="lazy" src={templateImage(t)} alt={t.name} width={1672} height={941}/><span>{t.name}{input.templateId === t.id ? " ✓" : ""}</span></button>)}</div>
          </>}
          {input.step === 3 && <>
            <h2>{input.name || "Your Room"}</h2><img className={styles.preview} src={templateImage(selectedDesign)} alt={selectedDesign.name} width={1672} height={941}/>
            <dl className={styles.summary}><dt>Purpose</dt><dd>{purpose.name}</dd><dt>Tasks</dt><dd>{input.tasks.join(", ") || "None"}</dd><dt>Design</dt><dd>{selectedDesign.name}</dd></dl>
            <div className={styles.choices}><label><input type="radio" name="plan" checked={input.plan === "free"} onChange={() => update({ ...input, plan: "free" })}/>Free Room</label><label><input type="radio" name="plan" checked={input.plan === "paid"} onChange={() => update({ ...input, plan: "paid" })}/>Paid Room</label></div>
            <table className={styles.pricing}><caption>Requested Services</caption><thead><tr><th>Service</th><th>Monthly Price</th></tr></thead><tbody><tr><td>Room</td><td>{input.plan === "free" ? "Free" : "Not confirmed"}</td></tr>{input.providers.map(id => <tr key={id}><td>{providers.find(p => p.id === id)?.label}</td><td>Not confirmed</td></tr>)}{input.secretary && <tr><td>AI Secretary</td><td>Not confirmed</td></tr>}{input.specialAI && <tr><td>Specialist AI</td><td>Not confirmed</td></tr>}</tbody></table>
            <p>{creationText(input.plan === "free" ? "free" : paymentMessage, language)}</p>
          </>}
        </fieldset>
        <footer className={styles.footer}><button disabled={busy || !loaded || input.step === 0} onClick={() => update({ ...input, step: input.step - 1 })}>Back</button><button disabled={busy || !loaded} onClick={() => void save()}>Save Draft</button>{input.step < 3 && <button className={styles.primary} disabled={busy || !loaded} onClick={() => void next()}>Next</button>}</footer>
      </section>
    </div>
  </main>;
}
