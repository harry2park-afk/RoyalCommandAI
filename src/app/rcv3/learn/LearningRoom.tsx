'use client';
import {useEffect,useRef,useState} from 'react';
import {findHelp} from '@/lib/locale/help-catalog';
import {lessons,PASS_MARK,EXAM_MINUTES,type Question,type LearningState} from '@/lib/rcv3/learning/course';
import {learningLabel,learningLanguage,type LearningLabel} from "@/lib/locale/learning";
import styles from './learn.module.css';
import LearningVoice,{type LearningVoiceHandle} from '@/components/rcv3-toolbox/LearningVoice';
import LearningRegion from '@/components/rcv3-toolbox/LearningRegion';
import {learningCountry,learningRegionUrl} from '@/lib/rcv3/learning/regions';
import {readLearningDraft,saveLearningDraft,nextLearningLesson,type LearningDraft} from '@/components/rcv3-toolbox/learning-drafts';
type Message={role:'user'|'assistant';content:string};
export default function LearningRoom({language:initialLanguage,ownerId,country:initialCountry=""}:{language:string;ownerId:string;country?:string}){
 const [state,setState]=useState<LearningState>({completed:[],certificate:null}),[practice,setPractice]=useState<Question[]>([]);
 const [day,setDay]=useState(1),[artifact,setArtifact]=useState(''),[clock,setClock]=useState(()=>Date.now()),[offset,setOffset]=useState(0);
 const drafts=useRef<Record<string,string>>({});
 const localDrafts=useRef<Record<string,LearningDraft>>({});
 const [draftReady,setDraftReady]=useState(false),[draftError,setDraftError]=useState(false);
 useEffect(()=>{try{for(const l of lessons){try{const saved=readLearningDraft(window.localStorage,ownerId,l.id);if(saved){localDrafts.current[l.id]=saved;drafts.current[l.id]=saved.artifact;}}catch{setDraftError(true);}}const first=localDrafts.current[lessons[0].id];if(first){setMessage(first.message);setArtifact(first.artifact);}}catch{setDraftError(true);}finally{setDraftReady(true);}},[ownerId]);
 const conversations=useRef<Record<string,{messages:Message[];message:string;answer:number|null}>>({});
 const [unit,setUnit]=useState(0),[messages,setMessages]=useState<Message[]>([]),[message,setMessage]=useState(''),[answer,setAnswer]=useState<number|null>(null);
 const [busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [exam,setExam]=useState<{attempt:string;questions:Question[];expiresAt:string;serverNow:string}|null>(null),[answers,setAnswers]=useState<Record<string,number>>({}),[score,setScore]=useState<number|null>(null);
 useEffect(()=>{if(!exam)return;const timer=window.setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(timer);},[exam]);
 const remaining=exam?Math.max(0,Math.ceil((Date.parse(exam.expiresAt)-(clock-offset))/1000)):EXAM_MINUTES*60;
 const controller=useRef<AbortController|null>(null),flight=useRef(false);
 const [content,setContent]=useState<{day:number;language:string;text:Record<string,string>}|null>(null),[translationError,setTranslationError]=useState(false),[translationRetry,setTranslationRetry]=useState(0);
 const [chosenLanguage,setChosenLanguage]=useState(initialLanguage),[chosenCountry,setChosenCountry]=useState(initialCountry);
 const language=chosenLanguage??initialLanguage,country=chosenCountry??initialCountry;
 const locale=learningLanguage(language),ko=locale==='ko',lesson=lessons[unit],question=practice.find(q=>q.lesson===lesson.id);
 const t=(key:LearningLabel)=>learningLabel(key,language);
 function changeRegion(nextLanguage:string,nextCountry:string){
  if(busy||exam)return;
  const safeLanguage=learningLanguage(nextLanguage),safeCountry=learningCountry(nextCountry)?.id??'';
  setChosenLanguage(safeLanguage);setChosenCountry(safeCountry);
  window.history.replaceState(window.history.state,'',learningRegionUrl(safeLanguage,safeCountry));
 }
 const native=locale==='en'||locale==='ko',contentReady=native||(content?.day===day&&content?.language===locale);
 useEffect(()=>{
  if(native)return;const abort=new AbortController();setTranslationError(false);
  fetch("/api/rcv3/learn/content",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({day,language:locale}),signal:AbortSignal.any([abort.signal,AbortSignal.timeout(65000)])}).then(async r=>{if(!r.ok)throw Error();const value=await r.json();if(!abort.signal.aborted)setContent(value);}).catch(()=>{if(!abort.signal.aborted)setTranslationError(true);});
  return()=>abort.abort();
 },[day,locale,native,translationRetry]);
 const translated=(key:string,fallback:string)=>native?fallback:contentReady?content?.text[key]??t('translationError'):t('translating');
 const help=(key:string)=>{const value=findHelp(key);return translated(key,(ko?value?.ko:value?.en)??'');};
 const title=(l:typeof lessons[number])=>translated(`title.${l.id}`,ko?l.koTitle:l.title);

 async function load(){try{const r=await fetch('/api/rcv3/learn',{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error();const d=await r.json();setError('');setState(d);setPractice(d.practice);setLoaded(true);}catch{setError(t("m0"));}}
 // Loading remote progress updates state only after the network response.
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{void load();return()=>controller.current?.abort();},[]); // eslint-disable-line react-hooks/exhaustive-deps
 async function run(body:Record<string,unknown>,success:(data:Record<string,unknown>)=>void){
  if(flight.current)return;flight.current=true;setBusy(true);setError('');setNotice('');
  const abort=new AbortController();controller.current=abort;
  try{const r=await fetch('/api/rcv3/learn',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,language:locale}),signal:AbortSignal.any([abort.signal,AbortSignal.timeout(65000)])});const d=await r.json();if(!r.ok){if(d.code==='RCV3_LIMIT')throw new Error(t("m1"));if(d.code==='RCV3_EXAM_EXPIRED')throw new Error(t("m2"));throw new Error(t("m3"));}if(!abort.signal.aborted)success(d);
  }catch(e){if(!abort.signal.aborted)setError(e instanceof Error?e.message:t("m3"));}finally{flight.current=false;setBusy(false);}
 }
 function selectUnit(index:number){
  conversations.current[lesson.id]={messages,message,answer};
  drafts.current[lesson.id]=artifact;
  const next=lessons[index],saved=conversations.current[next.id];
  setUnit(index);setMessages(saved?.messages??[]);setMessage(saved?.message??localDrafts.current[next.id]?.message??'');setAnswer(saved?.answer??null);
  setArtifact(drafts.current[next.id]??state.work?.[next.id]?.artifact??'');setNotice('');
 }
 function keepDraft(nextMessage:string,nextArtifact:string){
  const draft={message:nextMessage,artifact:nextArtifact};localDrafts.current[lesson.id]=draft;drafts.current[lesson.id]=nextArtifact;
  try{saveLearningDraft(window.localStorage,ownerId,lesson.id,draft);setDraftError(false);}catch{setDraftError(true);}
 }
 const voice=useRef<LearningVoiceHandle|null>(null);
 const nextLesson=nextLearningLesson(unit);
 const finish=state.completed.length===lessons.length;
 return <main className={styles.page} lang={locale}>
  <header><a href="/rcv3">← {t("myRooms")}</a><span className={styles.courseBadge}>{t("courseBadge")}</span><h1>{t("title")}</h1><p>{help("learnOverview")}</p><LearningRegion language={language} country={country} disabled={busy||Boolean(exam)} onChange={changeRegion}/></header>
  {!native&&<p role="status">{t('autoTranslation')} {!contentReady&&t(translationError?'translationError':'translating')}{translationError&&<button onClick={()=>setTranslationRetry(v=>v+1)}>{t('retry')}</button>}</p>}
  {!loaded&&!error&&<p role="status">{t("loadingProgress")}</p>}
  <div className={styles.progress}><strong>{state.completed.length} / {lessons.length} {t("m4")}</strong><progress max={100} value={state.completed.length}/></div>
  {error&&<div role="alert" className={styles.error}>{error}{!loaded&&<button onClick={()=>void load()}>{t("retry")}</button>}</div>}
  <p>{t("topicHelp")}</p>
  <div className={styles.layout}>
   <label>{t("studyDay")}<select value={day} disabled={!loaded||busy||!draftReady} onChange={e=>{const d=Number(e.target.value);setDay(d);selectUnit(lessons.findIndex(l=>l.day===d));}}>{Array.from({length:30},(_,i)=><option key={i} value={i+1}>{i+1} {t("day")} · {lessons.filter(l=>l.day===i+1&&state.completed.includes(l.id)).length}/{lessons.filter(l=>l.day===i+1).length}</option>)}</select></label>
   {lessons.map((l,i)=>l.day===day&&<section className={styles.unit} key={l.id}>
    <button type="button" className={styles.unitButton} disabled={!loaded||busy||!draftReady} aria-expanded={unit===i} aria-controls={`lesson-${l.id}`} onClick={()=>selectUnit(i)}><span>{l.id}</span><strong>{title(l)}</strong>{state.completed.includes(l.id)&&<small>✓ {t("m5")}</small>}</button>
    {unit===i&&<article id={`lesson-${l.id}`} aria-label={title(l)}>

    <h2>{lesson.id}. {title(lesson)}</h2><p>{t(unit<50?"quizCompletion":"projectCompletion")}</p><p className={styles.lesson}>{translated(`body.${lesson.id}`,ko?lesson.ko:lesson.body)}</p>
    <section className={styles.tutor} aria-label={t("tutor")}><h3>{t("learnWithAi")}</h3><p>{help("learnTutor")}</p>
     <div aria-live="polite" className={styles.messages}>{messages.map((m,i)=><p key={i}><strong>{m.role==='user'?t('you'):t('tutor')}</strong><br/>{m.content}</p>)}</div>
     <LearningVoice key={`${lesson.id}:${locale}`} ref={voice} language={locale} lessonText={contentReady?translated(`body.${lesson.id}`,ko?lesson.ko:lesson.body):''} answerText={[...messages].reverse().find(m=>m.role==='assistant')?.content??''} draft={message} disabled={busy||!loaded||!draftReady||Boolean(exam)} onTranscript={text=>{setMessage(text);keepDraft(text,artifact);}}/>
     <label>{t("m6")}<textarea maxLength={2000} rows={4} value={message} onChange={e=>{voice.current?.stop();setMessage(e.target.value);keepDraft(e.target.value,artifact);}} disabled={busy||!draftReady}/></label>
     <button disabled={!loaded||busy||!message.trim()} onClick={()=>void run({action:'chat',lesson:lesson.id,message,history:messages.slice(-8).map(m=>({...m,content:m.content.slice(0,3000)}))},d=>{setMessages([...messages,{role:'user',content:message},{role:'assistant',content:String(d.answer)}]);setMessage('');keepDraft('',artifact);})}>{busy?t("m7"):t("send")}</button>
    </section>
    {question&&unit<50&&<section className={styles.check} aria-label={t("m8")}><h3>{t("m8")}</h3><p>{translated(`q.${question.id}`,ko?question.ko:question.text)}</p>{question.options.map((option,i)=><label className={styles.option} key={option}><input type="radio" name="practice" disabled={busy} checked={answer===i} onChange={()=>setAnswer(i)}/>{translated(`q.${question.id}.${i}`,ko?question.koOptions[i]:option)}</label>)}<button disabled={busy||!loaded||!contentReady||answer===null} onClick={()=>void run({action:'practice',lesson:lesson.id,answer},d=>{if(d.correct){setState(d as unknown as LearningState);setNotice(t("m9"));}else setNotice(t("m10"));})}>{t("m11")}</button></section>}
    {unit>=50&&<section className={styles.check} aria-label={t("assignment")}><h3>{t("assignment")}</h3><p>{help("learnProject")}</p><label>{t("evidence")}<textarea rows={10} maxLength={6000} value={artifact} disabled={busy||!draftReady} onChange={e=>{setArtifact(e.target.value);keepDraft(message,e.target.value);}}/></label><small>{artifact.trim().length} / 6000</small><button disabled={!loaded||busy||state.completed.includes(lesson.id)||artifact.trim().length<150} onClick={()=>void run({action:'project',lesson:lesson.id,artifact},d=>{setState(d as unknown as LearningState);setNotice(`${d.projectScore} / 100 — ${d.feedback}`);})}>{t("submitFeedback")}</button>{state.work?.[lesson.id]&&<div><strong>{t(state.completed.includes(lesson.id)?"passedWork":"reviseWork")} · {state.work[lesson.id].score} / 100</strong><p>{state.work[lesson.id].feedback}</p></div>}</section>}
    {draftReady&&<p role="status">{t(draftError?'draftError':'draftSaved')}</p>}
    {notice&&<p role="status">{notice}</p>}
    {state.completed.includes(lesson.id)&&<div role="status"><strong>✓ {t("m5")}</strong>{nextLesson&&<button type="button" disabled={busy||!draftReady} onClick={()=>{setDay(nextLesson.day);selectUnit(unit+1);requestAnimationFrame(()=>document.getElementById(`lesson-${nextLesson.id}`)?.scrollIntoView({block:"start"}));}}>{t("nextLesson")} · {nextLesson.id}</button>}</div>}
   </article>}</section>)}
  </div>
  <section className={styles.exam} aria-label={t("finalExam")}><h2>{t("finalExam")}</h2><p>{help("learnExam")}</p>
   {!finish&&<p>{t("m12")}</p>}
   <button disabled={!loaded||busy||!finish} onClick={()=>void run({action:'start'},d=>{setExam(d as unknown as {attempt:string;questions:Question[];expiresAt:string;serverNow:string});if(exam?.attempt!==d.attempt)setAnswers({});setScore(null);setClock(Date.now());setOffset(Date.now()-Date.parse(String(d.serverNow)));})}>{t(exam?'resumeExam':'startExam')}</button>
   {exam&&<div><p role="timer">{t("timeRemaining")}: {Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</p>{remaining===0&&<p>{t("m2")}</p>}{exam.questions.map((q,n)=><fieldset key={q.id} disabled={busy||remaining===0}><legend>{n+1}. {ko?q.ko:q.text}</legend>{q.options.map((o,i)=><label className={styles.option} key={o}><input type="radio" name={q.id} checked={answers[q.id]===i} onChange={()=>setAnswers({...answers,[q.id]:i})}/>{ko?q.koOptions[i]:o}</label>)}</fieldset>)}<button disabled={busy||remaining===0||exam.questions.some(q=>answers[q.id]===undefined)} onClick={()=>void run({action:'submit',attempt:exam.attempt,answers:exam.questions.map(q=>answers[q.id])},d=>{setScore(Number(d.score));setState(d as unknown as LearningState);setExam(null);setAnswers({});})}>{t("m13")}</button></div>}
   {score!==null&&<p role="status">{score} / 100 — {score>=PASS_MARK?t("m14"):t("m15")}</p>}
   {state.certificate&&<div className={styles.award}><h3>✓ {t("m16")}</h3><a href={`/rcv3/learn/certificate/${state.certificate.id}?language=${locale}`}>{t("m17")}</a></div>}
  </section>
  <details className={styles.exam}><summary>{t("sources")}</summary><p>{t("sourceNote")}</p><ul><li><a href="https://home.dartmouth.edu/about/artificial-intelligence-ai-coined-dartmouth" target="_blank" rel="noreferrer">{t("sourceHistory")}</a></li><li><a href="https://doi.org/10.1609/aimag.v27i4.1904" target="_blank" rel="noreferrer">{t("sourceProposal")}</a></li><li><a href="https://arxiv.org/abs/1706.03762" target="_blank" rel="noreferrer">{t("sourceTransformer")}</a></li><li><a href="https://hai.stanford.edu/ai-index/2026-ai-index-report" target="_blank" rel="noreferrer">{t("sourceIndex")}</a></li><li><a href="https://www.nist.gov/itl/ai-risk-management-framework" target="_blank" rel="noreferrer">{t("sourceRisk")}</a></li></ul></details>
 </main>;
}
