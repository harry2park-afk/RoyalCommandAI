'use client';
import {useEffect,useRef,useState} from 'react';
import HelpText from '@/components/help/HelpText';
import {lessons,PASS_MARK,EXAM_MINUTES,type Question,type LearningState} from '@/lib/rcv3/learning/course';
import {learningLabel,type LearningLabel} from "@/lib/locale/learning";
import styles from './learn.module.css';
type Message={role:'user'|'assistant';content:string};
export default function LearningRoom({language}:{language:string}){
 const [state,setState]=useState<LearningState>({completed:[],certificate:null}),[practice,setPractice]=useState<Question[]>([]);
 const [day,setDay]=useState(1),[artifact,setArtifact]=useState(''),[clock,setClock]=useState(()=>Date.now()),[offset,setOffset]=useState(0);
 const drafts=useRef<Record<string,string>>({});
 const conversations=useRef<Record<string,{messages:Message[];message:string;answer:number|null}>>({});
 const [unit,setUnit]=useState(0),[messages,setMessages]=useState<Message[]>([]),[message,setMessage]=useState(''),[answer,setAnswer]=useState<number|null>(null);
 const [busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [exam,setExam]=useState<{attempt:string;questions:Question[];expiresAt:string;serverNow:string}|null>(null),[answers,setAnswers]=useState<Record<string,number>>({}),[score,setScore]=useState<number|null>(null);
 useEffect(()=>{if(!exam)return;const timer=window.setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(timer);},[exam]);
 const remaining=exam?Math.max(0,Math.ceil((Date.parse(exam.expiresAt)-(clock-offset))/1000)):EXAM_MINUTES*60;
 const controller=useRef<AbortController|null>(null),flight=useRef(false);
 const ko=language.split('-')[0]==='ko',lesson=lessons[unit],question=practice.find(q=>q.lesson===lesson.id);
 const t=(key:LearningLabel)=>learningLabel(key,language);
 async function load(){try{const r=await fetch('/api/rcv3/learn',{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error();const d=await r.json();setError('');setState(d);setPractice(d.practice);setLoaded(true);}catch{setError(t("m0"));}}
 // Loading remote progress updates state only after the network response.
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{void load();return()=>controller.current?.abort();},[]); // eslint-disable-line react-hooks/exhaustive-deps
 async function run(body:unknown,success:(data:Record<string,unknown>)=>void){
  if(flight.current)return;flight.current=true;setBusy(true);setError('');setNotice('');
  const abort=new AbortController();controller.current=abort;
  try{const r=await fetch('/api/rcv3/learn',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.any([abort.signal,AbortSignal.timeout(65000)])});const d=await r.json();if(!r.ok){if(d.code==='RCV3_LIMIT')throw new Error(t("m1"));if(d.code==='RCV3_EXAM_EXPIRED')throw new Error(t("m2"));throw new Error(t("m3"));}if(!abort.signal.aborted)success(d);
  }catch(e){if(!abort.signal.aborted)setError(e instanceof Error?e.message:'Request failed.');}finally{flight.current=false;setBusy(false);}
 }
 function selectUnit(index:number){
  conversations.current[lesson.id]={messages,message,answer};
  drafts.current[lesson.id]=artifact;
  const next=lessons[index],saved=conversations.current[next.id];
  setUnit(index);setMessages(saved?.messages??[]);setMessage(saved?.message??'');setAnswer(saved?.answer??null);
  setArtifact(drafts.current[next.id]??state.work?.[next.id]?.artifact??'');setNotice('');
 }
 const finish=state.completed.length===lessons.length;
 return <main className={styles.page}>
  <header><a href="/rcv3">← My Rooms</a><span className={styles.free}>FREE · 100 LESSONS · 30 DAYS</span><h1>AI Learning Room</h1><p><HelpText helpKey="learnOverview"/></p></header>
  {!loaded&&!error&&<p role="status">{t("loadingProgress")}</p>}
  <div className={styles.progress}><strong>{state.completed.length} / {lessons.length} {t("m4")}</strong><progress max={100} value={state.completed.length}/></div>
  {error&&<div role="alert" className={styles.error}>{error}{!loaded&&<button onClick={()=>void load()}>Retry</button>}</div>}
  <div className={styles.layout}>
   <label>Study day<select value={day} disabled={busy} onChange={e=>{const d=Number(e.target.value);setDay(d);selectUnit(lessons.findIndex(l=>l.day===d));}}>{Array.from({length:30},(_,i)=><option key={i} value={i+1}>Day {i+1} · {lessons.filter(l=>l.day===i+1&&state.completed.includes(l.id)).length}/{lessons.filter(l=>l.day===i+1).length}</option>)}</select></label>
   {lessons.map((l,i)=>l.day===day&&<section className={styles.unit} key={l.id}>
    <button type="button" className={styles.unitButton} disabled={busy} aria-expanded={unit===i} aria-controls={`lesson-${l.id}`} onClick={()=>selectUnit(i)}><span>{l.id}</span><strong>{l.title}</strong>{ko&&<small>{l.koTitle}</small>}{state.completed.includes(l.id)&&<small>✓ {t("m5")}</small>}</button>
    {unit===i&&<article id={`lesson-${l.id}`} aria-label={l.title}>

    <h2>{lesson.id}. {lesson.title}</h2><p className={styles.lesson}><HelpText helpKey={`learn.${lesson.id}`}/></p>
    <section className={styles.tutor} aria-label="AI tutor"><h3>Learn with AI</h3><p><HelpText helpKey="learnTutor"/></p>
     <p>{t("startLessonHelp")}</p>
     <button type="button" disabled={!loaded||busy} onClick={()=>{
      const request='Please begin this lesson. Explain the key ideas step by step, give a concrete example and a common mistake, then ask me one practice question. Teach the actual subject from the lesson text, not a generic explanation of why it matters. For a history lesson include the dated milestones and connect each change to a practical use today. For an advanced lesson, guide me through creating the required deliverable. Use my selected language.';
      void run({action:'chat',lesson:lesson.id,message:request,history:messages.slice(-8).map(m=>({...m,content:m.content.slice(0,3000)}))},d=>setMessages([...messages,{role:'user',content:t("startLesson")},{role:'assistant',content:String(d.answer)}]));
     }}>{busy?t("m7"):t("startLesson")}</button>
     <div aria-live="polite" className={styles.messages}>{messages.map((m,i)=><p key={i}><strong>{m.role==='user'?'You':'AI Tutor'}</strong><br/>{m.content}</p>)}</div>
     <label>{t("m6")}<textarea maxLength={2000} rows={4} value={message} onChange={e=>setMessage(e.target.value)} disabled={busy}/></label>
     <button disabled={!loaded||busy||!message.trim()} onClick={()=>void run({action:'chat',lesson:lesson.id,message,history:messages.slice(-8).map(m=>({...m,content:m.content.slice(0,3000)}))},d=>{setMessages([...messages,{role:'user',content:message},{role:'assistant',content:String(d.answer)}]);setMessage('');})}>{busy?t("m7"):'Send'}</button>
    </section>
    {question&&unit<50&&<section className={styles.check} aria-label="Lesson check"><h3>{t("m8")}</h3><p>{ko?question.ko:question.text}</p>{question.options.map((option,i)=><label className={styles.option} key={option}><input type="radio" name="practice" disabled={busy} checked={answer===i} onChange={()=>setAnswer(i)}/>{ko?question.koOptions[i]:option}</label>)}<button disabled={busy||!loaded||answer===null} onClick={()=>void run({action:'practice',lesson:lesson.id,answer},d=>{if(d.correct){setState(d as unknown as LearningState);setNotice(t("m9"));}else setNotice(t("m10"));})}>{t("m11")}</button></section>}
    {unit>=50&&<section className={styles.check} aria-label="Practical assignment"><h3>Practical Assignment</h3><p><HelpText helpKey="learnProject"/></p><label>Report, code or project evidence<textarea rows={10} maxLength={6000} value={artifact} disabled={busy} onChange={e=>{setArtifact(e.target.value);drafts.current[lesson.id]=e.target.value;}}/></label><small>{artifact.trim().length} / 6000</small><button disabled={!loaded||busy||state.completed.includes(lesson.id)||artifact.trim().length<150} onClick={()=>void run({action:'project',lesson:lesson.id,artifact},d=>{setState(d as unknown as LearningState);setNotice(`${d.projectScore} / 100 — ${d.feedback}`);})}>Submit for feedback</button>{state.work?.[lesson.id]&&<div><strong>{state.work[lesson.id].score} / 100</strong><p>{state.work[lesson.id].feedback}</p></div>}</section>}
    {notice&&<p role="status">{notice}</p>}
   </article>}</section>)}
  </div>
  <section className={styles.exam} aria-label="Final exam"><h2>Final Exam &amp; Certificate</h2><p><HelpText helpKey="learnExam"/></p>
   {!finish&&<p>{t("m12")}</p>}
   <button disabled={!loaded||busy||!finish} onClick={()=>void run({action:'start'},d=>{setExam(d as unknown as {attempt:string;questions:Question[];expiresAt:string;serverNow:string});if(exam?.attempt!==d.attempt)setAnswers({});setScore(null);setClock(Date.now());setOffset(Date.now()-Date.parse(String(d.serverNow)));})}>{t(exam?'resumeExam':'startExam')}</button>
   {exam&&<div><p role="timer">Time remaining: {Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</p>{remaining===0&&<p>Time expired. Start a new exam to try again.</p>}{exam.questions.map((q,n)=><fieldset key={q.id} disabled={busy||remaining===0}><legend>{n+1}. {ko?q.ko:q.text}</legend>{q.options.map((o,i)=><label className={styles.option} key={o}><input type="radio" name={q.id} checked={answers[q.id]===i} onChange={()=>setAnswers({...answers,[q.id]:i})}/>{ko?q.koOptions[i]:o}</label>)}</fieldset>)}<button disabled={busy||remaining===0||exam.questions.some(q=>answers[q.id]===undefined)} onClick={()=>void run({action:'submit',attempt:exam.attempt,answers:exam.questions.map(q=>answers[q.id])},d=>{setScore(Number(d.score));setState(d as unknown as LearningState);setExam(null);setAnswers({});})}>{t("m13")}</button></div>}
   {score!==null&&<p role="status">{score} / 100 — {score>=PASS_MARK?t("m14"):t("m15")}</p>}
   {state.certificate&&<div className={styles.award}><h3>✓ {t("m16")}</h3><a href={`/rcv3/learn/certificate/${state.certificate.id}`}>{t("m17")}</a></div>}
  </section>
  <details className={styles.exam}><summary>Course sources · checked 21 September 2026</summary><p>Current capabilities are a dated snapshot; future scenarios are not guarantees.</p><ul><li><a href="https://home.dartmouth.edu/about/artificial-intelligence-ai-coined-dartmouth" target="_blank" rel="noreferrer">Dartmouth · AI history</a></li><li><a href="https://doi.org/10.1609/aimag.v27i4.1904" target="_blank" rel="noreferrer">Dartmouth proposal · dated 31 August 1955</a></li><li><a href="https://arxiv.org/abs/1706.03762" target="_blank" rel="noreferrer">Attention Is All You Need · original Transformer paper</a></li><li><a href="https://hai.stanford.edu/ai-index/2026-ai-index-report" target="_blank" rel="noreferrer">Stanford AI Index 2026 · current capabilities and society</a></li><li><a href="https://www.nist.gov/itl/ai-risk-management-framework" target="_blank" rel="noreferrer">NIST · AI risk management</a></li></ul></details>
 </main>;
}
