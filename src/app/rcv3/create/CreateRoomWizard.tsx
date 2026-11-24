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
import {useWideRoomLayout} from "@/lib/rcv3/use-wide-room-layout";
import {roomPurposeCatalog,catalogLabel,selectRoomPurpose} from "@/lib/rcv3/room-purpose-catalog";
import {roomFlowText} from "@/lib/locale/room-creation-flow";
import PreviewTokenPanel from "./PreviewTokenPanel";
import CustomerConnections from "./CustomerConnections";
import SearchableChoices from "@/components/rcv3-toolbox/SearchableChoices";
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
async function cancelDraftRequest(id:string,expectedRevision:number):Promise<DraftRegistry> {
  const response=await fetch("/api/rcv3/drafts",{method:"DELETE",cache:"no-store",signal:AbortSignal.timeout(20000),headers:{"Content-Type":"application/json"},body:JSON.stringify({id,expectedRevision})});
  const data=await response.json();
  if(!response.ok)throw new Error(data.code||"RCV3_STORAGE");
  return data;
}
export default function CreateRoomWizard({ language, providers, accountEmail, accountName, country }: {
  helperAvailable: boolean; accountEmail: string; accountName: string; country: string; language: string; providers: { id: AIProviderId; label: string }[];
}) {
  const wide=useWideRoomLayout();
  const designDialog=useRef<HTMLDialogElement>(null);
  const [previewOpen,setPreviewOpen]=useState(false),[previewList,setPreviewList]=useState(true);

  const SettingsContainer=wide?"details":"div";
  const TrialContainer=wide?"details":"div";
  const [purposeSearch,setPurposeSearch]=useState("");
  const flow=(key:Parameters<typeof roomFlowText>[0])=>roomFlowText(key,language);
  const purposeField=useRef<HTMLTextAreaElement>(null);
  const designSection=useRef<HTMLElement>(null),paymentSection=useRef<HTMLElement>(null);
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
      const params = new URLSearchParams(window.location.search);
      const requestedId = params.get("draft");
      // A fresh Create Room visit must never reuse an old draft and charge
      // tokens for a room name or design the customer did not just select.
      const resumed = requestedId ? result.drafts.find(d => d.id === requestedId) : undefined;
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
  useEffect(() => {
    if (!loaded || !dirty || busy || error || !draftId) return;
    const timer=window.setTimeout(()=>{void save();},1200);
    return ()=>window.clearTimeout(timer);
  // A save bumps the revision; if the customer typed during the request, retry with that revision.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[loaded,dirty,busy,error,draftId,input,registry.revision]);
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
      url.searchParams.delete("new");
      if(asNew)url.searchParams.delete("checkout");
      window.history.replaceState(null, "", url);
      const unchanged = JSON.stringify(latestInput.current) === JSON.stringify(input);
      setDirty(!unchanged); setExplicitlySaved(Boolean(explicit&&unchanged)); setStatus(unchanged ? "draft" : "");
      return unchanged ? id : null;
    } catch (e) {
      setError(e instanceof Error && e.message === "RCV3_CONFLICT" ? "conflict" : e instanceof Error && e.message === "RCV3_LIMIT" ? "limit" : "error");
    } finally { saving.current = false; setBusy(false); }
  }
  async function cancelDraft() {
    if(!loaded||saving.current)return;
    saving.current=true;setBusy(true);setError("");
    try {
      if(registry.drafts.some(d=>d.id===draftId))setRegistry(await cancelDraftRequest(draftId,registry.revision));
      const fresh=defaultInput();latestInput.current=fresh;setInput(fresh);setDirty(false);
      setDraftId(crypto.randomUUID());setPurposeChosen(false);setExplicitlySaved(false);
      setShowAllDesigns(false);setStatus("");
      const url=new URL(window.location.href);
      url.searchParams.delete("draft");url.searchParams.delete("checkout");url.searchParams.set("new","1");
      window.history.replaceState(null,"",url);
    } catch(e) {
      setError(e instanceof Error&&e.message==="RCV3_CONFLICT"?"conflict":"error");
    } finally {saving.current=false;setBusy(false);}
  }
  function previewDesign(templateId:string){
    update({...input,templateId});
    if(wide){setPreviewOpen(true);setPreviewList(true);designDialog.current?.showModal();}
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
      <span className={styles.saveState} role="status">{busy?t("saving"):dirty?t("autoSaving"):loaded?(explicitlySaved?t("saved"):registry.drafts.some(d=>d.id===draftId)?t("autoSaved"):t("saveRequired")):t("loading")}</span>
      <ExplicitSaveButton disabled={!loaded} busy={busy} label={t("save")} busyLabel={t("saving")} onSave={()=>save(false,true)}/>
    </header>
    <div className={styles.layout}><section className={styles.workspace} aria-label={t("title")}>
      {!wide&&<button type="button" disabled={!loaded||busy} onClick={()=>void cancelDraft()}>{t("cancel")}</button>}
      {error && <div role="alert" className={styles.error}>{selectedCreationText(error,language)}{loaded?<button disabled={busy} onClick={()=>void save(error==="conflict")}>{t(error==="conflict"?"fork":"retry")}</button>:<button onClick={()=>window.location.reload()}>{t("retry")}</button>}</div>}
      <fieldset disabled={!loaded} className={styles.form}>
{!wide&&<section className={styles.verticalSection}>
          <label className={styles.question}>{t("name")}<input autoComplete="off" maxLength={80} value={input.name} onChange={e=>update({...input,name:e.target.value})}/></label>
        </section>}
        <section className={styles.verticalSection}>
          {wide&&<>
            <h2>{flow("purpose")}</h2>
            <label>{flow("search")}<input type="search" value={purposeSearch} onChange={e=>setPurposeSearch(e.target.value)} maxLength={80}/></label>
            <div className={styles.purposeCatalog}>{[...new Set(roomPurposeCatalog.map(item=>item.group[0]))].map(group=>{
              const entries=roomPurposeCatalog.filter(item=>item.group[0]===group&&[...item.name,...item.group].join(" ").toLocaleLowerCase().includes(purposeSearch.trim().toLocaleLowerCase()));
              return entries.length?<fieldset key={group}><legend>{catalogLabel(entries[0].group,language)}</legend>{entries.map(entry=><button key={entry.id} aria-pressed={input.purpose===entry.purpose&&input.brief===(language.startsWith("ko")?entry.name[1]:entry.name[0])} type="button" onClick={()=>{update(selectRoomPurpose(input,entry.id,language));setPurposeChosen(true);purposeField.current?.focus();}}>{catalogLabel(entry.name,language)}</button>)}</fieldset>:null;
            })}</div>
            {!roomPurposeCatalog.some(item=>[...item.name,...item.group].join(" ").toLocaleLowerCase().includes(purposeSearch.trim().toLocaleLowerCase()))&&<p>{flow("empty")}</p>}
            <button type="button" onClick={()=>{const next=changePurpose(input,"custom");update({...next,brief:input.brief,answers:{purpose:input.brief?.trim()?[input.brief]:[]}});purposeField.current?.focus();}}>{flow("custom")}</button>
          </>}
          <label className={styles.question}>{wide?flow("task"):t("purpose")}<textarea ref={purposeField} rows={3} maxLength={300} placeholder={t("example")} value={input.brief ?? input.answers.purpose?.[0] ?? ""}
            onChange={e=>{setPurposeChosen(false);const brief=e.target.value;update(wide?{...input,brief,answers:input.purpose==="custom"?{purpose:brief.trim()?[brief]:[]}:input.answers}:applyRoomBrief(input,brief));}}
            onBlur={e=>setPurposeChosen(!!e.target.value.trim())}/></label>
          {(!wide||(input.purpose==="legal"&&!!input.brief?.trim()))&&<SettingsContainer>{wide&&input.purpose==="legal"&&!!input.brief?.trim()&&<summary>{flow("settings")}</summary>}
          {input.purpose === "legal" && !!input.brief?.trim() && purpose.fields.filter(field=>field.id==="practice"&&field.options).map(field=><div key={field.id} className={styles.practiceChoices}>
            <strong>{t("legalPractice")}</strong>
            <div className={styles.choices}>{field.options!.map(option=><label key={option}><input type="checkbox" checked={input.answers[field.id]?.includes(option)||false} onChange={()=>{const old=input.answers[field.id]||[];const answers={...input.answers,[field.id]:old.includes(option)?old.filter(x=>x!==option):[...old,option]};if(option==="Other"&&old.includes(option))delete answers.otherPractice;update({...input,answers});}}/>{roomFeatureLabel(option,language)}</label>)}</div>
            {input.answers.practice?.includes("Other")&&<label>{t("legalOtherPractice")}<input maxLength={300} value={input.answers.otherPractice?.[0]||""} onChange={e=>update({...input,answers:{...input.answers,otherPractice:e.target.value.trim()?[e.target.value]:[]}})}/></label>}
          </div>)}
          {input.purpose === "legal" && !!input.brief?.trim() && <div className={styles.practiceChoices}>
            <strong>{t("legalRoles")}</strong>
            <div className={styles.choices}>{purpose.suggestedAgents.map(task=><label key={task}><input type="checkbox" checked={input.tasks.includes(task)} onChange={()=>update({...input,tasks:input.tasks.includes(task)?input.tasks.filter(x=>x!==task):[...input.tasks,task]})}/>{roomFeatureLabel(task,language)}</label>)}</div>
            <p>{t("legalAiDefault")}</p>
            <div className={styles.choices}><label><input type="checkbox" checked={input.secretary} onChange={e=>{const next=selectSecretary({...input,onboarding:setup},e.target.checked);if(e.target.checked&&!next.secretarySetup.email)next.secretarySetup.email=accountEmail;update(next);}}/>{t("secretary")}</label></div>
            <p>{t("secretaryDescription")}</p>
            {input.secretary&&<label>{t("email")}<input type="email" maxLength={254} value={input.secretarySetup.email} onChange={e=>update({...input,secretarySetup:{...input.secretarySetup,email:e.target.value}})}/></label>}
            <strong>{t("legalProviders")}</strong>
            <div className={styles.choices}>{providers.map(provider=><label key={provider.id}><input type="checkbox" checked={input.providers.includes(provider.id)} onChange={()=>providerToggle(provider.id)}/>{provider.label}</label>)}</div>
            <label><input type="checkbox" checked={input.specialAI} onChange={e=>{const {advancedRequests,...answers}=input.answers;update({...input,specialAI:e.target.checked,answers:e.target.checked?input.answers:answers});}}/>{t("legalAdvanced")}</label>
            {input.specialAI && purpose.fields.filter(field=>field.id==="advancedRequests"&&field.options).map(field=><div key={field.id}>
              <strong>{t("legalAdvancedRequests")}</strong>
              <SearchableChoices options={field.options!} selected={input.answers[field.id]||[]} searchLabel={t("legalSearch")} emptyLabel={t("legalNotFound")} labelFor={option=>roomFeatureLabel(option,language)} onToggle={option=>{const old=input.answers[field.id]||[];update({...input,answers:{...input.answers,[field.id]:old.includes(option)?old.filter(x=>x!==option):[...old,option]}});}}/>
            </div>)}
            <label>{t("legalCustomRequest")}<textarea rows={2} maxLength={300} value={input.answers.customRequest?.[0]||""} onChange={e=>update({...input,answers:{...input.answers,customRequest:e.target.value.trim()?[e.target.value]:[]}})}/></label>
            <p>{t("legalRequestStatus")}</p>
            <p>{t("legalSetupNotice")}</p>
          </div>}
          </SettingsContainer>}
        </section>
        {wide&&<button type="button" className={styles.fieldNext} disabled={!input.brief?.trim()} onClick={()=>{setPurposeChosen(true);designSection.current?.scrollIntoView({behavior:"smooth",block:"start"});}}>{flow("next")}</button>}
        {wide&&<section ref={designSection} className={styles.verticalSection}><h2>{flow("design")}</h2><label className={styles.question}>{flow("name")}<input autoComplete="off" maxLength={80} value={input.name} onChange={e=>update({...input,name:e.target.value})}/></label></section>}
        {!ready && <p role="status">{t("required")}</p>}
        {ready && <>
          <section className={styles.verticalSection}>
            {!wide&&<h2>{t("design")}</h2>}<div className={styles.designs}>{designs.map(design=><button type="button" key={design.id} aria-pressed={design.id===input.templateId} onClick={()=>previewDesign(design.id)}>
              <img loading="lazy" src={templateImage(design)} alt="" width={1672} height={941}/><span>{design.name}{design.id===input.templateId?" ✓":""}</span>
            </button>)}</div>
            {!showAllDesigns && <button type="button" onClick={()=>setShowAllDesigns(true)}>{t("more")}</button>}
          </section>
          <section className={styles.verticalSection}>
           <SettingsContainer>{wide&&<summary>{flow("settings")}</summary>}
            <h2>{t("options")}</h2><p>{t("recommended")}</p>
            {input.purpose !== "legal" && <div className={styles.choices}>{purpose.suggestedAgents.map(task=><label key={task}><input type="checkbox" checked={input.tasks.includes(task)} onChange={()=>update({...input,tasks:input.tasks.includes(task)?input.tasks.filter(x=>x!==task):[...input.tasks,task]})}/>{roomFeatureLabel(task,language)}</label>)}</div>}
            <details><summary>{t("settings")}</summary>
              <label>{t("category")}<select value={input.purpose} onChange={e=>{const next=changePurpose(input,e.target.value);const p=roomPurposes.find(p=>p.id===e.target.value)!;update({...next,tasks:[...p.suggestedAgents],answers:p.id==="custom"&&input.brief?{purpose:[input.brief]}:{},templateId:recommendedDesigns(p.id)[0].id});}}>{roomPurposes.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
              {purpose.fields.filter(f=>f.options && !(input.purpose==="legal"&&(f.id==="practice"||f.id==="advancedRequests"||f.id==="legalAiPriority"))).map(field=><div key={field.id}><strong>{field.label}</strong><div className={styles.choices}>{field.options!.map(option=><label key={option}><input type="checkbox" checked={input.answers[field.id]?.includes(option)||false} onChange={()=>{const old=input.answers[field.id]||[];update({...input,answers:{...input.answers,[field.id]:old.includes(option)?old.filter(x=>x!==option):[...old,option]}});}}/>{option}</label>)}</div></div>)}
              <label>{t("country")}<select value={setup.country} onChange={e=>update({...input,onboarding:{...setup,country:e.target.value,phoneOfferId:"",phoneNumberId:"",phoneConsent:false}})}><option value="">—</option>{COUNTRY_ROOM_PRESETS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
              {input.purpose!=="legal"&&<div className={styles.choices}>{providers.map(p=><label key={p.id}><input type="checkbox" checked={input.providers.includes(p.id)} onChange={()=>providerToggle(p.id)}/>{p.label}</label>)}</div>}
              {input.purpose!=="legal"&&<div className={styles.choices}><label><input type="checkbox" checked={input.secretary} onChange={e=>{const next=selectSecretary({...input,onboarding:setup},e.target.checked);if(e.target.checked&&!next.secretarySetup.email)next.secretarySetup.email=accountEmail;update(next);}}/>{t("secretary")}</label><label><input type="checkbox" checked={input.specialAI} onChange={e=>update({...input,specialAI:e.target.checked})}/>{t("specialist")}</label></div>}
              {input.purpose!=="legal"&&<p>{t("secretaryDescription")}</p>}
              {input.secretary && <>{input.purpose!=="legal"&&<label>{t("email")}<input type="email" maxLength={254} value={input.secretarySetup.email} onChange={e=>update({...input,secretarySetup:{...input.secretarySetup,email:e.target.value}})}/></label>}<label>{t("phone")}<input type="tel" maxLength={40} value={input.secretarySetup.phone} onChange={e=>update({...input,secretarySetup:{...input.secretarySetup,phone:e.target.value}})}/></label></>}
              <CustomerConnections key={draftId} input={input} setup={setup} update={update} save={()=>save()} providers={providers} language={language} disabled={busy||!loaded}/>
            </details>
           </SettingsContainer>
           {wide&&<button type="button" className={styles.fieldNext} onClick={()=>paymentSection.current?.scrollIntoView({behavior:"smooth",block:"start"})}>{flow("next")}</button>}
          </section>
          <section ref={paymentSection} className={styles.verticalSection}>
            <h2>{wide?flow("payment"):t("payment")}</h2>
            {wide&&<><p>{input.name} · {input.brief} · {selectedDesign.name}</p><p>{flow("preview")}</p><CheckoutPanel autoEnter key={`${draftId}-${registry.revision}`} draftId={draftId} revision={registry.revision} disabled={busy||dirty||!loaded||!setup.country||!input.providers.length||!secretarySetupValid(input)} language={language} onFork={()=>void save(true)}/></>}
            {(!setup.country||!input.providers.length||!secretarySetupValid(input))&&<p role="status">{selectedCreationText("setupRequired",language)}</p>}
            <TrialContainer>{wide&&<summary>{flow("trial")}</summary>}<PreviewTokenPanel key={draftId} draftId={draftId} revision={registry.revision} accountName={accountName} roomName={input.name} designName={selectedDesign.name} disabled={busy||dirty||!loaded||!setup.country||!input.providers.length||!secretarySetupValid(input)||!!input.answers.customRequest?.[0]?.trim()||(!!input.answers.practice?.includes("Other")&&!input.answers.otherPractice?.[0]?.trim())} language={language}/></TrialContainer>
          </section>
        </>}
      </fieldset>
    </section>
    </div>
    {wide&&<dialog ref={designDialog} className={styles.designDialog} aria-label={flow("previewTitle")} onClose={()=>setPreviewOpen(false)}>
      {previewOpen&&<>
        <header className={styles.previewHeader}>
          <div><h2>{flow("previewTitle")} · {input.name}</h2><p>{flow("designOnly")}</p></div>
          <button type="button" aria-expanded={previewList} aria-controls="room-design-choices" onClick={()=>setPreviewList(value=>!value)}>{flow("designList")}</button>
          <button type="button" onClick={()=>designDialog.current?.close()}>{flow("backToForm")}</button>
        </header>
        <div className={styles.previewStage}>
          <img src={templateImage(selectedDesign)} alt={selectedDesign.name}/>
          <strong>{selectedDesign.name}</strong>
        </div>
        {previewList&&<div id="room-design-choices" className={styles.previewChoices} aria-label={flow("designList")}>
          {roomTemplates.map(design=><button key={design.id} type="button" aria-pressed={input.templateId===design.id} onClick={()=>update({...input,templateId:design.id})}>
            <img loading="lazy" src={templateImage(design)} alt="" width={160} height={90}/><span>{design.name}</span>
          </button>)}
        </div>}
        <footer className={styles.previewActions}>
          <span role={error?"alert":"status"}>{error?selectedCreationText(error,language):busy||dirty?t("saving"):t("autoSaved")}</span>
          <button type="button" className={styles.primary} disabled={busy||dirty||!!error} onClick={()=>{designDialog.current?.close();paymentSection.current?.scrollIntoView({behavior:"smooth",block:"start"});}}>{flow("useDesign")}</button>
        </footer>
      </>}
    </dialog>}
  </main>;
}
