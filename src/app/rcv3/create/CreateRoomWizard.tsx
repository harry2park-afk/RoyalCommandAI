"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { roomPurposes, newRoomDraft, changePurpose, selectSecretary, secretarySetupValid, type RoomDraftInput, type DraftRegistry } from "@/lib/rcv3/room-draft";
import { roomTemplates, templateImage } from "@/lib/rcv3/templates";
import { selectedCreationText, type CreationMessage } from "@/lib/locale/rcv3-creation";
import type { AIProviderId } from "@/lib/ai/types";
import { simpleCreateText, roomFeatureLabel } from "@/lib/locale/rcv3-simple-create";
import { applyRoomBrief, recommendedDesigns } from "@/lib/rcv3/room-recommendations";
import RoomNavigation from "@/components/rcv3-toolbox/RoomNavigation";
import ExplicitSaveButton from "@/components/rcv3-toolbox/ExplicitSaveButton";
import CheckoutPanel from "./CheckoutPanel";
import CustomerConnections from "./CustomerConnections";
import { COUNTRY_ROOM_PRESETS } from "@/lib/rooms/countryPresets";
import styles from "./create.module.css";

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
  helperAvailable: boolean; accountEmail: string; country: string; language: string; providers: { id: AIProviderId; label: string }[];
}) {
  const defaultInput = useCallback((): RoomDraftInput => ({...newRoomDraft(),onboarding:{country:COUNTRY_ROOM_PRESETS.some(c=>c.id===country)?country:"",aiSources:{},emailEnabled:false,phoneRequested:false,phoneOfferId:""},providers:providers.some(p=>p.id==="openai")?["openai"]:providers[0]?[providers[0].id]:[]}),[providers,country]);
  const [input, setInput] = useState<RoomDraftInput>(defaultInput);
  const [registry, setRegistry] = useState<DraftRegistry>({ revision: 0, drafts: [] });
  const [draftId, setDraftId] = useState("");
  const [purposeChosen,setPurposeChosen]=useState(false);
  const [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false);
  const [explicitlySaved,setExplicitlySaved]=useState(false);
  const [dirty, setDirty] = useState(false), [error, setError] = useState<CreationMessage | "">("");
  const [, setStatus] = useState<CreationMessage | "">("");

  const [showAllDesigns, setShowAllDesigns] = useState(false);
  const t = (key: Parameters<typeof simpleCreateText>[0]) => simpleCreateText(key, language);
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
      if (resumed) { setPurposeChosen(resumed.input.brief === undefined || !!resumed.input.brief.trim()); setInput({...resumed.input,plan:"paid"}); latestInput.current = {...resumed.input,plan:"paid"}; if(resumed.input.plan!=="paid")setDirty(true); setDraftId(resumed.id); }
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
  function update(next: RoomDraftInput) { latestInput.current = next; setInput(next); setDirty(true); setExplicitlySaved(false); setStatus(""); setError(""); }
  async function save(asNew = false, explicit = false) {
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
      if(asNew)url.searchParams.delete("checkout");
      window.history.replaceState(null, "", url);
      const unchanged = JSON.stringify(latestInput.current) === JSON.stringify(input);
      setDirty(!unchanged); setExplicitlySaved(Boolean(explicit&&unchanged)); setStatus(unchanged ? "draft" : "");
      return unchanged ? id : null;
    } catch (e) {
      setError(e instanceof Error && e.message === "RCV3_CONFLICT" ? "conflict" : e instanceof Error && e.message === "RCV3_LIMIT" ? "limit" : "error");
    } finally { saving.current = false; setBusy(false); }
  }
  function loadDraft(id: string) {
    const draft = registry.drafts.find(d => d.id === id);
    if (dirty || !draft) return;
    setPurposeChosen(draft.input.brief === undefined || !!draft.input.brief.trim());
    latestInput.current = {...draft.input,plan:"paid"}; setInput({...draft.input,plan:"paid"}); if(draft.input.plan!=="paid")setDirty(true); setExplicitlySaved(false); setDraftId(id); setStatus(""); setError("");
    const url = new URL(window.location.href); url.searchParams.set("draft", id); url.searchParams.delete("checkout");
    window.history.replaceState(null, "", url);
  }
  const providerToggle = (id: AIProviderId) => {
    const selected = input.providers.includes(id) ? input.providers.filter(p => p !== id) : [...input.providers, id];
    const aiSources = Object.fromEntries(Object.entries(setup.aiSources).filter(([key])=>selected.includes(key as AIProviderId)));
    update({...input, providers:selected,onboarding:{...setup,aiSources}});
  };
  const ready = purposeChosen && (input.brief === undefined || !!input.brief.trim()) && !!input.name.trim() && (input.purpose !== "custom" || !!input.answers.purpose?.[0]?.trim());
  const designs = showAllDesigns ? roomTemplates : [...new Map([selectedDesign, ...recommendedDesigns(input.purpose)].map(d=>[d.id,d])).values()];
  return <main className={styles.page} lang={language}>
    <header className={styles.header}><RoomNavigation language={language} disabled={busy||dirty||!loaded}/><h1>{t("title")}</h1>
      <span className={styles.saveState} role="status">{busy?t("saving"):dirty?t("unsaved"):loaded?(explicitlySaved?t("saved"):t("saveRequired")):t("loading")}</span>
      <ExplicitSaveButton disabled={!loaded} busy={busy} label={t("save")} busyLabel={t("saving")} onSave={()=>save(false,true)}/>
    </header>
    <div className={styles.layout}><section className={styles.workspace} aria-label={t("title")}>
      {error && <div role="alert" className={styles.error}>{selectedCreationText(error,language)}{loaded?<button disabled={busy} onClick={()=>void save(error==="conflict")}>{t(error==="conflict"?"fork":"retry")}</button>:<button onClick={()=>window.location.reload()}>{t("retry")}</button>}</div>}
      <fieldset disabled={!loaded} className={styles.form}>
        <section className={styles.verticalSection}>
          <label className={styles.question}>{t("name")}<input autoComplete="off" maxLength={80} value={input.name} onChange={e=>update({...input,name:e.target.value})}/></label>
        </section>
        <section className={styles.verticalSection}>
          <label className={styles.question}>{t("purpose")}<textarea rows={3} maxLength={300} placeholder={t("example")} value={input.brief ?? input.answers.purpose?.[0] ?? ""}
            onChange={e=>{setPurposeChosen(false);update(applyRoomBrief(input,e.target.value));}}
            onBlur={e=>setPurposeChosen(!!e.target.value.trim())}/></label>
        </section>
        {!ready && <p role="status">{t("required")}</p>}
        {ready && <>
          <section className={styles.verticalSection}>
            <h2>{t("design")}</h2><div className={styles.designs}>{designs.map(design=><button type="button" key={design.id} aria-pressed={design.id===input.templateId} onClick={()=>update({...input,templateId:design.id})}>
              <img loading="lazy" src={templateImage(design)} alt="" width={1672} height={941}/><span>{design.name}{design.id===input.templateId?" ✓":""}</span>
            </button>)}</div>
            {!showAllDesigns && <button type="button" onClick={()=>setShowAllDesigns(true)}>{t("more")}</button>}
          </section>
          <section className={styles.verticalSection}>
            <h2>{t("options")}</h2><p>{t("recommended")}</p>
            <div className={styles.choices}>{purpose.suggestedAgents.map(task=><label key={task}><input type="checkbox" checked={input.tasks.includes(task)} onChange={()=>update({...input,tasks:input.tasks.includes(task)?input.tasks.filter(x=>x!==task):[...input.tasks,task]})}/>{roomFeatureLabel(task,language)}</label>)}</div>
            <details><summary>{t("settings")}</summary>
              <label>{t("category")}<select value={input.purpose} onChange={e=>{const next=changePurpose(input,e.target.value);const p=roomPurposes.find(p=>p.id===e.target.value)!;update({...next,tasks:[...p.suggestedAgents],answers:p.id==="custom"&&input.brief?{purpose:[input.brief]}:{},templateId:recommendedDesigns(p.id)[0].id});}}>{roomPurposes.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
              {purpose.fields.filter(f=>f.options).map(field=><div key={field.id}><strong>{field.label}</strong><div className={styles.choices}>{field.options!.map(option=><label key={option}><input type="checkbox" checked={input.answers[field.id]?.includes(option)||false} onChange={()=>{const old=input.answers[field.id]||[];update({...input,answers:{...input.answers,[field.id]:old.includes(option)?old.filter(x=>x!==option):[...old,option]}});}}/>{option}</label>)}</div></div>)}
              <label>{t("country")}<select value={setup.country} onChange={e=>update({...input,onboarding:{...setup,country:e.target.value,phoneOfferId:"",phoneNumberId:"",phoneConsent:false}})}><option value="">—</option>{COUNTRY_ROOM_PRESETS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
              <div className={styles.choices}>{providers.map(p=><label key={p.id}><input type="checkbox" checked={input.providers.includes(p.id)} onChange={()=>providerToggle(p.id)}/>{p.label}</label>)}</div>
              <div className={styles.choices}><label><input type="checkbox" checked={input.secretary} onChange={e=>{const next=selectSecretary({...input,onboarding:setup},e.target.checked);if(e.target.checked&&!next.secretarySetup.email)next.secretarySetup.email=accountEmail;update(next);}}/>{t("secretary")}</label><label><input type="checkbox" checked={input.specialAI} onChange={e=>update({...input,specialAI:e.target.checked})}/>{t("specialist")}</label></div>
              {input.secretary && <><label>{t("email")}<input type="email" maxLength={254} value={input.secretarySetup.email} onChange={e=>update({...input,secretarySetup:{...input.secretarySetup,email:e.target.value}})}/></label><label>{t("phone")}<input type="tel" maxLength={40} value={input.secretarySetup.phone} onChange={e=>update({...input,secretarySetup:{...input.secretarySetup,phone:e.target.value}})}/></label></>}
              <CustomerConnections key={draftId} input={input} setup={setup} update={update} save={()=>save()} providers={providers} disabled={busy||!loaded}/>
            </details>
          </section>
          <section className={styles.verticalSection}>
            <h2>{t("payment")}</h2>
            {(!setup.country||!input.providers.length||!secretarySetupValid(input))&&<p role="status">{selectedCreationText("setupRequired",language)}</p>}
            <CheckoutPanel key={`${draftId}:${registry.revision}:${JSON.stringify(input)}`} onFork={()=>void save(true)} draftId={draftId} revision={registry.revision} disabled={busy||dirty||!explicitlySaved||!loaded||!setup.country||!input.providers.length||!secretarySetupValid(input)} language={language}/>
            <p>{t("unavailableCredits")}</p>
          </section>
        </>}
      </fieldset>
    </section>
    <details className={styles.sidebar}><summary>{t("drafts")}</summary>
      <button disabled={busy||dirty||!loaded} onClick={()=>{setPurposeChosen(false);const fresh=defaultInput();latestInput.current=fresh;setInput(fresh);setExplicitlySaved(false);setDraftId(crypto.randomUUID());setStatus("");setError("");setShowAllDesigns(false);const url=new URL(window.location.href);url.searchParams.delete("draft");url.searchParams.delete("checkout");window.history.replaceState(null,"",url);}}>{t("new")}</button>
      {registry.drafts.map(d=><button key={d.id} disabled={busy||dirty} aria-pressed={draftId===d.id} onClick={()=>loadDraft(d.id)}>{d.input.name||t("title")}</button>)}
    </details></div>
  </main>;
}
