"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { roomPurposes, newRoomDraft, changePurpose, selectSecretary, secretarySetupValid, type RoomDraftInput, type DraftRegistry } from "@/lib/rcv3/room-draft";
import { roomTemplates, templateImage } from "@/lib/rcv3/templates";
import { creationText, type CreationMessage } from "@/lib/locale/rcv3-creation";
import type { AIProviderId } from "@/lib/ai/types";
import HelpText from "@/components/help/HelpText";
import CheckoutPanel from "./CheckoutPanel";
import CustomerConnections from "./CustomerConnections";
import { COUNTRY_ROOM_PRESETS } from "@/lib/rooms/countryPresets";
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
export default function CreateRoomWizard({ language, providers, accountEmail, country }: {
  accountEmail: string; country: string; language: string; providers: { id: AIProviderId; label: string }[];
}) {
  const defaultInput = useCallback((): RoomDraftInput => ({...newRoomDraft(),onboarding:{country:COUNTRY_ROOM_PRESETS.some(c=>c.id===country)?country:"",aiSources:{},emailEnabled:false,phoneRequested:false,phoneOfferId:""},providers:providers.some(p=>p.id==="openai")?["openai"]:providers[0]?[providers[0].id]:[]}),[providers,country]);
  const [input, setInput] = useState<RoomDraftInput>(defaultInput);
  const [registry, setRegistry] = useState<DraftRegistry>({ revision: 0, drafts: [] });
  const [draftId, setDraftId] = useState("");
  const [purposeChosen,setPurposeChosen]=useState(false);
  const [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false), [error, setError] = useState<CreationMessage | "">("");
  const [status, setStatus] = useState<CreationMessage | "">("");

  const formRef = useRef<HTMLFieldSetElement>(null);
  const stepHeading = useRef<HTMLElement>(null);
  const previousStep = useRef(input.step);
  useEffect(() => {
    if(previousStep.current===input.step)return;
    previousStep.current=input.step;
    stepHeading.current?.scrollIntoView({block:'start'});
    stepHeading.current?.focus({preventScroll:true});
  },[input.step]);
  function moveAfter(id:string){
    requestAnimationFrame(()=>{
      const groups=Array.from(formRef.current?.querySelectorAll<HTMLElement>('[data-question]')??[]);
      const index=groups.findIndex(g=>g.dataset.question===id);
      const target=groups[index+1];
      if(index<0)return;
      if(target){target.scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});Array.from(target.querySelectorAll<HTMLElement>('input:not(:disabled),select:not(:disabled),button:not(:disabled),summary')).find(el=>el.getClientRects().length>0)?.focus({preventScroll:true});}
      else void next();
    });
  }
  function fieldNext(id:string){return <button type="button" className={styles.fieldNext} disabled={!loaded||busy} aria-label={`Next after ${id}`} onClick={()=>moveAfter(id)}>Next →</button>;}
  const saving = useRef(false);
  const latestInput = useRef(input);
  useEffect(() => { latestInput.current = input; }, [input]);
  const setup = input.onboarding || {country:COUNTRY_ROOM_PRESETS.some(c=>c.id===country)?country:"",aiSources:{},emailEnabled:false,phoneRequested:false,phoneOfferId:""};
  const purpose = roomPurposes.find(p => p.id === input.purpose)!;
  const selectedDesign = roomTemplates.find(t => t.id === input.templateId)!;

  useEffect(() => {
    let active = true;
    draftsRequest().then(result => {
      if (!active) return;
      setRegistry(result);
      const requestedId = new URLSearchParams(window.location.search).get("draft");
      const resumed = result.drafts.find(d => d.id === requestedId);
      if (resumed) { setPurposeChosen(true); setInput({...resumed.input,plan:"paid"}); latestInput.current = {...resumed.input,plan:"paid"}; if(resumed.input.plan!=="paid")setDirty(true); setDraftId(resumed.id); }
      else { const templateId = new URLSearchParams(window.location.search).get("template");
        if(roomTemplates.some(t=>t.id===templateId)) {const fresh={...defaultInput(),templateId:templateId!};setInput(fresh);latestInput.current=fresh;}
        setDraftId(crypto.randomUUID()); }
      setLoaded(true);
    }).catch(() => { if (active) setError("error"); });
    return () => { active = false; };
  }, [defaultInput]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function update(next: RoomDraftInput) { latestInput.current = next; setInput(next); setDirty(true); setStatus(""); setError(""); }
  async function save(asNew = false) {
    if (!loaded || saving.current) return null;
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
      return unchanged ? id : null;
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
    if (!purposeChosen || !input.name.trim() || (input.purpose === "custom" && !input.answers.purpose?.[0]?.trim())) {
      setError("required"); return;
    }
    if (input.onboarding && (!setup.country || !input.providers.length)) { setError("setupRequired"); return; }
    if (input.step === 1 && !secretarySetupValid(input)) { setError("secretaryRequired"); return; }
    update({ ...input, onboarding:setup, step: Math.min(3, input.step + 1) });
  }
  function loadDraft(id: string) {
    const draft = registry.drafts.find(d => d.id === id);
    if (dirty || !draft) return;
    setPurposeChosen(true);
    latestInput.current = {...draft.input,plan:"paid"}; setInput({...draft.input,plan:"paid"}); if(draft.input.plan!=="paid")setDirty(true); setDraftId(id); setStatus(""); setError("");
    const url = new URL(window.location.href); url.searchParams.set("draft", id);
    window.history.replaceState(null, "", url);
  }
  const providerToggle = (id: AIProviderId) => {
    const selected = input.providers.includes(id) ? input.providers.filter(p => p !== id) : [...input.providers, id];
    const aiSources = Object.fromEntries(Object.entries(setup.aiSources).filter(([key])=>selected.includes(key as AIProviderId)));
    update({...input, providers:selected,onboarding:{...setup,aiSources}});
  };
  return <main className={styles.page}>
    <header className={styles.header}><a href="/rcv3">← My Room</a><h1>Create Room</h1>
      <span className={styles.saveState} role="status">{busy ? "Saving…" : dirty ? "Unsaved changes" : loaded ? "Saved forms available below" : "Loading…"}</span>
      <button disabled={!loaded || busy} onClick={() => void save()}>Save Draft</button>
    </header>
    <div className={styles.layout}>
      <section className={styles.workspace} aria-label="Room creation">
        <div className={styles.overview}><HelpText helpKey="createOverview"/></div>
        <nav ref={stepHeading} tabIndex={-1} className={styles.progress} aria-label="Creation steps">
          <p className={styles.progressTitle}>Step {input.step + 1} of 4 · {steps[input.step]}</p>
          <ol>{steps.map((label,index)=><li key={label} aria-current={index===input.step?"step":undefined} data-complete={index<input.step}><b>{index<input.step?"✓":index+1}</b><span>{label}</span></li>)}</ol>
        </nav>
        <p className={styles.stepHelp}><HelpText helpKey={`createStep${input.step+1}`}/></p>
        {error && <div role="alert" className={styles.error}>{<HelpText helpKey={`creation.${error}`}/>}{error === "conflict" ? <button disabled={busy || !loaded} onClick={() => void save(true)}>Save as New Draft</button> : loaded && <button disabled={busy} onClick={() => void save()}>Retry</button>}{!loaded && <button onClick={() => window.location.reload()}>Retry</button>}</div>}
        {status && <p role="status" className={styles.success}>{<HelpText helpKey={`creation.${status}`}/>}</p>}
        <fieldset ref={formRef} disabled={!loaded} className={styles.form}>
          {input.step === 0 && <>
            <h2>Room details</h2>
            <div data-question="Room Name" className={styles.question}><label>Room Name<input onKeyDown={e=>{if(e.key==="Enter"&&!e.nativeEvent.isComposing&&input.name.trim()){e.preventDefault();moveAfter("Room Name");}}} onBlur={e=>{if(!e.relatedTarget&&input.name.trim())moveAfter("Room Name");}} autoComplete="off" maxLength={80} value={input.name} onChange={e => update({ ...input, name: e.target.value })}/></label>
            <p><HelpText helpKey="roomName"/></p>{fieldNext("Room Name")}</div>
            <div data-question="Purpose" className={styles.question}><label>Purpose<select value={purposeChosen?input.purpose:""} onChange={e => {setPurposeChosen(true);update(changePurpose(input, e.target.value));moveAfter("Purpose");}}>
              <option value="" disabled>Choose a purpose</option>
              {[...roomPurposes].sort((a,b)=>{const common=["custom","legal","accounting","business"];const rank=(id:string)=>common.includes(id)?common.indexOf(id):100;return rank(a.id)-rank(b.id);}).map(p => <option key={p.id} value={p.id}>{p.id==="custom"?"Personal / Other":p.name}</option>)}
            </select></label>
            <p><HelpText helpKey="purpose"/></p>{fieldNext("Purpose")}</div>
            <div data-question="Country" className={styles.question}><label>Country<select value={setup.country} onChange={e=>{update({...input,onboarding:{...setup,country:e.target.value,phoneOfferId:"",phoneNumberId:"",phoneConsent:false}});moveAfter("Country");}}><option value="" disabled>Choose your country</option>{COUNTRY_ROOM_PRESETS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label><p><HelpText helpKey="country"/></p>{fieldNext("Country")}</div>
            {purposeChosen && <>
            <p><HelpText helpKey={`purpose.${purpose.id}`}/></p>
            {purpose.fields.map(field => <div key={field.id} data-question={field.label} className={styles.question}><strong>{field.label}</strong>
              <p><HelpText helpKey={field.options?"chooseOptions":"customPurpose"}/></p>
              {field.options ? <div className={styles.choices}>{field.options.map(option => <label key={option}><input type="checkbox" checked={input.answers[field.id]?.includes(option) || false} onChange={() => { const old = input.answers[field.id] || []; update({ ...input, answers: { ...input.answers, [field.id]: old.includes(option) ? old.filter(x => x !== option) : [...old, option] } }); }}/>{option}</label>)}</div> : <input onKeyDown={e=>{if(e.key==="Enter"&&!e.nativeEvent.isComposing){e.preventDefault();moveAfter(field.label);}}} onBlur={e=>{if(!e.relatedTarget&&e.target.value.trim())moveAfter(field.label);}} aria-label={field.label} maxLength={300} placeholder="For example: organise my email and appointments" value={input.answers[field.id]?.[0] || ""} onChange={e => update({ ...input, answers: { ...input.answers, [field.id]: e.target.value.trim() ? [e.target.value] : [] } })}/> }{fieldNext(field.label)}</div>)}
            </>}

          </>}
          {input.step === 1 && <>
            <h2>Choose what you need</h2>
            <div data-question="Tasks" className={styles.question}><strong>Tasks</strong><p><HelpText helpKey="tasks"/></p><div className={styles.choices}>{purpose.suggestedAgents.map(task => <label key={task}><input type="checkbox" checked={input.tasks.includes(task)} onChange={() => update({ ...input, tasks: input.tasks.includes(task) ? input.tasks.filter(t => t !== task) : [...input.tasks, task] })}/>{task}</label>)}</div>{fieldNext("Tasks")}</div>
            <div data-question="Your AI" className={styles.question}><strong>Your AI</strong><p>{input.providers.map(id=>providers.find(p=>p.id===id)?.label).join(", ") || "No AI selected"}</p><p><HelpText helpKey="ai"/></p>
              <details><summary>More AI options</summary><div className={styles.choices}>{providers.map(p => <label key={p.id}><input type="checkbox" checked={input.providers.includes(p.id)} onChange={() => providerToggle(p.id)}/>{p.label}</label>)}</div></details>{fieldNext("Your AI")}
            </div>
            <div data-question="AI Secretary" className={styles.question}><div className={styles.choices}><label><input type="checkbox" checked={input.secretary} onChange={e => {const next=selectSecretary({...input,onboarding:setup},e.target.checked);if(e.target.checked&&!next.secretarySetup.email)next.secretarySetup.email=accountEmail;update(next);}}/>AI Secretary</label><label><input type="checkbox" checked={input.specialAI} onChange={e => update({ ...input, specialAI: e.target.checked })}/>Specialist AI</label></div>
            <p><HelpText helpKey="secretary"/></p>
            {input.secretary && <section aria-label="Secretary setup" className={styles.field}>

              <label>{creationText("secretaryEmail", "en")}<input type="email" autoComplete="off" maxLength={254} value={input.secretarySetup.email} onChange={e => update({ ...input, secretarySetup: { ...input.secretarySetup, email: e.target.value } })}/></label><p><HelpText helpKey="email"/></p>
              <label>Contact phone (optional)<input type="tel" autoComplete="off" maxLength={40} value={input.secretarySetup.phone} onChange={e => update({ ...input, secretarySetup: { ...input.secretarySetup, phone: e.target.value } })}/></label><p><HelpText helpKey="setupContactPhone"/></p>
            </section>}
            <CustomerConnections key={draftId} input={input} setup={setup} update={update} save={()=>save()} providers={providers} disabled={busy||!loaded}/>{fieldNext("AI Secretary")}</div>
          </>}
          {input.step === 2 && <>
            <h2>Choose a design</h2><p><HelpText helpKey="design"/></p><div className={styles.designs}>{roomTemplates.map(t => <button key={t.id} type="button" aria-pressed={input.templateId === t.id} onClick={() => update({ ...input, templateId: t.id })}><img loading="lazy" src={templateImage(t)} alt={t.name} width={1672} height={941}/><span>{t.name}{input.templateId === t.id ? " ✓" : ""}</span></button>)}</div>
          </>}
          {input.step === 3 && <>
            <h2>{input.name || "Your Room"}</h2><img className={styles.preview} src={templateImage(selectedDesign)} alt={selectedDesign.name} width={1672} height={941}/>
            <dl className={styles.summary}><dt>Country</dt><dd>{COUNTRY_ROOM_PRESETS.find(c=>c.id===setup.country)?.label || "—"}</dd><dt>Purpose</dt><dd>{purpose.name}</dd><dt>Tasks</dt><dd>{input.tasks.join(", ") || "None"}</dd><dt>Design</dt><dd>{selectedDesign.name}</dd></dl>
            {input.secretary && <section aria-label="Secretary setup review"><h3>AI Secretary</h3><dl className={styles.summary}><dt>{creationText("secretaryEmail", "en")}</dt><dd>{input.secretarySetup.email || "—"}</dd><dt>{creationText("secretaryPhone", "en")}</dt><dd>{input.secretarySetup.phone || "—"}</dd></dl><p><HelpText helpKey="creation.secretaryPending"/></p></section>}
            <CheckoutPanel key={`${draftId}:${registry.revision}:${JSON.stringify(input)}`} onFork={()=>void save(true)} draftId={draftId} revision={registry.revision} disabled={busy || dirty || !loaded} language={language}/>

          </>}
        </fieldset>
        <footer className={styles.footer}><button disabled={busy || !loaded || input.step === 0} onClick={() => update({ ...input, step: input.step - 1 })}>Back</button><button disabled={busy || !loaded} onClick={() => void save()}>Save Draft</button>{input.step < 3 && <button className={styles.primary} disabled={busy || !loaded} onClick={() => void next()}>Next</button>}</footer>
      </section>
      <details className={styles.sidebar}><summary>Saved forms</summary><p><HelpText helpKey="saved"/></p>
        <button disabled={busy || dirty || !loaded} onClick={() => { setPurposeChosen(false); const fresh = defaultInput(); latestInput.current = fresh; setInput(fresh); setDraftId(crypto.randomUUID()); setStatus(""); setError(""); const url = new URL(window.location.href); url.searchParams.delete("draft"); url.searchParams.delete("checkout"); window.history.replaceState(null, "", url); }}>New Draft</button>
        {registry.drafts.map(d => <button key={d.id} disabled={busy || dirty} aria-pressed={draftId === d.id} onClick={() => loadDraft(d.id)}>{d.input.name || "Untitled Room"}<small>{roomPurposes.find(p => p.id === d.input.purpose)?.name}</small></button>)}
      </details>
    </div>
  </main>;
}
