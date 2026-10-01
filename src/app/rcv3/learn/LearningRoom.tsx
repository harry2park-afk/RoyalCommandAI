'use client';
import ReadingProgress from '@/components/rcv3-toolbox/ReadingProgress';
import {speechProgressRatio,resumeSentenceOffset,type SpeechProgress} from '@/lib/client/speech-progress';
import {useEffect,useRef,useState,type ChangeEvent} from 'react';
import {Send} from 'lucide-react';
import ToolButton from '@/components/rcv3-toolbox/ToolButton';
import LearningAutoTextarea from '@/components/rcv3-toolbox/LearningAutoTextarea';
import {findHelp} from '@/lib/locale/help-catalog';
import {COURSE,lessons,PASS_MARK,EXAM_MINUTES,type Question,type LearningState} from '@/lib/rcv3/learning/course';
import {learningLabel,learningLanguage,type LearningLabel} from "@/lib/locale/learning";
import styles from './learn.module.css';
import {groups,sourceDay,groupForSource,groupComplete,completedGroupCount} from '@/lib/rcv3/learning/groups';
import {learningVoiceCommand,voiceLessonIndex} from '@/lib/client/learning-voice-command';
import LearningVoice,{type LearningVoiceHandle} from '@/components/rcv3-toolbox/LearningVoice';
import {teachingParagraphs,type TeachingSegment} from '@/lib/client/learning-day-player';
import LearningLessonList,{type LearningLessonListHandle} from '@/components/rcv3-toolbox/LearningLessonList';
import LearningRegion from '@/components/rcv3-toolbox/LearningRegion';
import {learningCountry,learningRegionUrl} from '@/lib/rcv3/learning/regions';
import {readLearningDraft,saveLearningDraft,readTeachingBookmark,saveTeachingBookmark,readLearningResume,saveLearningResume,nextLearningLesson,readReadingMarker,saveReadingMarker,type ReadingMarker,type LearningDraft} from '@/components/rcv3-toolbox/learning-drafts';
type Message={role:'user'|'assistant';content:string};
type InitialLearning={state:LearningState;practice:Omit<Question,'answer'>[]};
export default function LearningRoom({language:initialLanguage,ownerId,country:initialCountry="",entryPath="/rcv3/learn",homeHref="/rcv3",initialLearning}:{language:string;ownerId:string;country?:string;entryPath?:"/rcv3/learn"|"/rcv4/learn";homeHref?:string;initialLearning?:InitialLearning}){
 const v4=entryPath==='/rcv4/learn';
 const [state,setState]=useState<LearningState>(initialLearning?.state??{completed:[],certificate:null}),[practice,setPractice]=useState<Omit<Question,'answer'>[]>(initialLearning?.practice??[]);
 const [day,setDay]=useState(1),[artifact,setArtifact]=useState(''),[clock,setClock]=useState(()=>Date.now()),[offset,setOffset]=useState(0);
 const drafts=useRef<Record<string,string>>({});
 const localDrafts=useRef<Record<string,LearningDraft>>({});
 const [draftReady,setDraftReady]=useState(false),[draftError,setDraftError]=useState(false);

 const chatScroll=useRef<HTMLDivElement|null>(null),curriculumScroll=useRef<HTMLDivElement|null>(null);
 const conversations=useRef<Record<string,{messages:Message[];message:string;answer:number|null}>>({});
 const [unit,setUnit]=useState(0),[messages,setMessages]=useState<Message[]>([]),[message,setMessage]=useState(''),[answer,setAnswer]=useState<number|null>(null);
 useEffect(()=>{const el=chatScroll.current;if(el)el.scrollTop=el.scrollHeight;},[messages]);
 const [requestBusy,setBusy]=useState(false),[loaded,setLoaded]=useState(Boolean(initialLearning)),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [exam,setExam]=useState<{attempt:string;questions:Question[];expiresAt:string;serverNow:string}|null>(null),[answers,setAnswers]=useState<Record<string,number>>({}),[score,setScore]=useState<number|null>(null);
 useEffect(()=>{if(!exam)return;const timer=window.setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(timer);},[exam]);
 const remaining=exam?Math.max(0,Math.ceil((Date.parse(exam.expiresAt)-(clock-offset))/1000)):EXAM_MINUTES*60;
 const controller=useRef<AbortController|null>(null),flight=useRef(false);
 const [content,setContent]=useState<{day:number;language:string;text:Record<string,string>}|null>(null),[translationError,setTranslationError]=useState(false),[translationRetry,setTranslationRetry]=useState(0);
 const [chosenLanguage,setChosenLanguage]=useState(initialLanguage),[chosenCountry,setChosenCountry]=useState(initialCountry);
 const [voiceActive,setVoiceActive]=useState(false),[voiceTranscript,setVoiceTranscript]=useState('');
 const busy=requestBusy||Boolean(voiceActive);
 const language=chosenLanguage??initialLanguage,country=chosenCountry??initialCountry;
 const locale=learningLanguage(language),ko=locale==='ko',lesson=lessons[unit],question=practice.find(q=>q.lesson===lesson.id);
 const t=(key:LearningLabel)=>learningLabel(key,language);
 const [resumed,setResumed]=useState(false);
 // A fresh board is presentation only; saved history and assessment records remain intact.
 const [boardExplanation,setBoardExplanation]=useState<string|null>(null);
 const [teachingCursor,setTeachingCursor]=useState<{lesson:string;paragraph:number}|null>(null);
 const [readingProgress,setReadingProgress]=useState<SpeechProgress|null>(null);
 const [readingMarker,setReadingMarker]=useState<ReadingMarker|null>(null);
 const markerRecord=useRef<{value:ReadingMarker;owner:string;language:string}|null>(null),markerTicks=useRef(0);
 const activeReading=useRef<{lesson:string;paragraph:number;source:string;base:number}|null>(null);
 const [preparedPlan,setPreparedPlan]=useState<{language:string;lesson:string;text:string}|null>(null);
 useEffect(()=>{
  try{
   for(const l of lessons){try{const saved=readLearningDraft(window.localStorage,ownerId,l.id);if(saved){localDrafts.current[l.id]=saved;drafts.current[l.id]=saved.artifact;}}catch{setDraftError(true);}}
   const saved=readLearningResume(window.localStorage,ownerId,learningLanguage(initialLanguage));
   let bookmark:ReturnType<typeof readTeachingBookmark>=null;
   if(v4){try{bookmark=readTeachingBookmark(window.localStorage,ownerId,learningLanguage(initialLanguage));}catch{setDraftError(true);}}
   let id=saved?.lesson??bookmark?.lesson??lessons[0].id;
   if(bookmark?.finished&&id===bookmark.lesson)id=lessons.find(l=>sourceDay(l.id)>bookmark.day)?.id??id;
   const index=lessons.findIndex(l=>l.id===id);
   setUnit(index);setDay(sourceDay(lessons[index].id));
   setBoardExplanation(null);
   activeReading.current=null;markerRecord.current=null;setReadingMarker(null);
   if(v4){try{const marker=readReadingMarker(window.localStorage,ownerId,learningLanguage(initialLanguage));if(marker){markerRecord.current={value:marker,owner:ownerId,language:learningLanguage(initialLanguage)};setReadingMarker(marker);}}catch{setDraftError(true);}}
   if(saved){setMessages(id===saved.lesson?saved.messages:[]);setResumed(true);}
   const draft=localDrafts.current[lessons[index].id];setMessage(draft?.message??'');setArtifact(draft?.artifact??'');
  }catch{setDraftError(true);}finally{setDraftReady(true);}
 },[ownerId,initialLanguage,v4]);
 function savePosition(id:string,history:Message[]){
  try{saveLearningResume(window.localStorage,ownerId,locale,{lesson:id,messages:history.slice(-8).map(m=>({...m,content:m.content.slice(0,3000)}))});}catch{setDraftError(true);}
 }

 function persistReadingMarker(){
  const record=markerRecord.current;if(!record)return;
  try{saveReadingMarker(window.localStorage,record.owner,record.language,record.value);markerTicks.current=0;}catch{setDraftError(true);}
 }
 function rememberReadingMarker(value:ReadingMarker,force=false){
  markerRecord.current={value,owner:ownerId,language:locale};setReadingMarker(value);
  if(force||++markerTicks.current>=10||value.fraction===1)persistReadingMarker();
 }
 useEffect(()=>{const save=()=>{const record=markerRecord.current;if(record)try{saveReadingMarker(window.localStorage,record.owner,record.language,record.value);}catch{}};window.addEventListener('pagehide',save);return()=>window.removeEventListener('pagehide',save);},[]);
 function teachingProgress(value:SpeechProgress){
  const current=activeReading.current;if(!current)return;
  const fraction=current.base+(1-current.base)*speechProgressRatio(value);
  setReadingProgress({elapsed:fraction,duration:1});
  rememberReadingMarker({lesson:current.lesson,paragraph:current.paragraph,source:current.source,fraction});
 }
 function changeRegion(nextLanguage:string,nextCountry:string){
  if(busy||exam)return;
  const safeLanguage=learningLanguage(nextLanguage),safeCountry=learningCountry(nextCountry)?.id??'';
  if(v4&&safeLanguage!==locale){
   persistReadingMarker();activeReading.current=null;setTeachingCursor(null);setReadingProgress(null);markerRecord.current=null;setReadingMarker(null);
   try{const marker=readReadingMarker(window.localStorage,ownerId,safeLanguage);if(marker){markerRecord.current={value:marker,owner:ownerId,language:safeLanguage};setReadingMarker(marker);}}catch{setDraftError(true);}
  }
  setChosenLanguage(safeLanguage);setChosenCountry(safeCountry);
  window.history.replaceState(window.history.state,'',learningRegionUrl(safeLanguage,safeCountry,entryPath));
 }
 useEffect(()=>{if(draftReady&&loaded&&!localDrafts.current[lesson.id]&&drafts.current[lesson.id]===undefined){setArtifact(state.work?.[lesson.id]?.artifact??'');}},[draftReady,loaded,lesson.id,state.work]);
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
 useEffect(()=>{if(!initialLearning)void load();return()=>controller.current?.abort();},[]); // eslint-disable-line react-hooks/exhaustive-deps
 async function run(body:Record<string,unknown>,success:(data:Record<string,unknown>)=>void){
  if(flight.current)return;flight.current=true;setBusy(true);setError('');setNotice('');
  const abort=new AbortController();controller.current=abort;
  try{const r=await fetch('/api/rcv3/learn',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,language:locale}),signal:AbortSignal.any([abort.signal,AbortSignal.timeout(65000)])});const d=await r.json();if(!r.ok){if(d.code==='RCV3_LIMIT')throw new Error(t("m1"));if(d.code==='RCV3_EXAM_EXPIRED')throw new Error(t("m2"));throw new Error(t("m3"));}if(!abort.signal.aborted)success(d);
  }catch(e){if(!abort.signal.aborted)setError(e instanceof Error?e.message:t("m3"));}finally{flight.current=false;setBusy(false);}
 }
 function selectUnit(index:number){
  conversations.current[lesson.id]={messages,message:localDrafts.current[lesson.id]?.message??message,answer};
  drafts.current[lesson.id]=artifact;
  const next=lessons[index],saved=conversations.current[next.id];
  setUnit(index);setMessages(saved?.messages??[]);setMessage(localDrafts.current[next.id]?.message??saved?.message??'');setAnswer(saved?.answer??null);
  setArtifact(drafts.current[next.id]??state.work?.[next.id]?.artifact??'');setNotice('');setResumed(false);savePosition(next.id,saved?.messages??[]);
 }
 function showExplanation(history:Message[]){
  setBoardExplanation([...history].reverse().find(m=>m.role==='assistant')?.content??null);
  setMessages(history);
 }
 function keepDraft(nextMessage:string,nextArtifact:string){
  const draft={message:nextMessage,artifact:nextArtifact};localDrafts.current[lesson.id]=draft;drafts.current[lesson.id]=nextArtifact;
  try{saveLearningDraft(window.localStorage,ownerId,lesson.id,draft);setDraftError(false);}catch{setDraftError(true);}
 }
 async function voiceQuestion(text:string,signal:AbortSignal,typed=false):Promise<string>{
  const command=learningVoiceCommand(text);if(v4&&command?.kind!=='read')setTeachingCursor(null);
  const currentGroup=groups.indexOf(groupForSource(lesson.id));
  const targetGroup=command?voiceLessonIndex(command,currentGroup,groups.length):currentGroup;
  if(targetGroup===null)return t('voiceLessonMissing');
  const navigating=command?.kind==='lesson'||command?.kind==='next';
  const target=navigating?lessons.find(l=>l.id===groups[targetGroup].sources[0])!:lesson;
  const prior=target.id===lesson.id?messages:conversations.current[target.id]?.messages??[];
  let spoken:string;
  if(command?.kind==='repeat')spoken=[...prior].reverse().find(m=>m.role==='assistant')?.content??t('voiceNoAnswer');
  else if(command?.kind==='read'){
   if(native)spoken=ko?target.ko:target.body;
   else{
    const r=await fetch('/api/rcv3/learn/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({day:sourceDay(target.id),language:locale}),signal});
    if(!r.ok)throw Error('VOICE');const d=await r.json();spoken=d.text?.[`body.${target.id}`];if(!spoken)throw Error('VOICE');
   }
  }else{
   const r=await fetch('/api/rcv3/learn',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'chat',course:COURSE,voice:true,lesson:target.id,language:locale,message:navigating?t('voiceOpening'):text,history:navigating?[]:prior.slice(-8).map(m=>({...m,content:m.content.slice(0,3000)}))}),signal});
   if(!r.ok)throw Error('VOICE');const d=await r.json();spoken=String(d.answer??'');if(!spoken.trim())throw Error('VOICE');
  }
  if(signal.aborted)throw Error('CANCELLED');
  // The voice controller stays mounted across curriculum changes. Preserve each lesson's work.
  if(target.id!==lesson.id){
   selectUnit(lessons.findIndex(l=>l.id===target.id));setDay(sourceDay(target.id));
   const saved=localDrafts.current[target.id];setMessage(saved?.message??'');
  }
  setVoiceTranscript('');
  if(v4&&command?.kind==='read'){
   setTeachingCursor({lesson:target.id,paragraph:-1});savePosition(target.id,prior);
  }else{
   const history:Message[]=[...prior,{role:'user',content:text},{role:'assistant',content:spoken}];
   showExplanation(history);savePosition(target.id,history);
  }
  if(typed){
   const saved=localDrafts.current[lesson.id];
   if(saved?.message.trim()===text.trim()){
    const next={...saved,message:''};localDrafts.current[lesson.id]=next;
    try{saveLearningDraft(window.localStorage,ownerId,lesson.id,next);}catch{setDraftError(true);}
    if(target.id===lesson.id)setMessage('');
    const cached=conversations.current[lesson.id];if(cached)cached.message='';
   }
  }
  return spoken;
 }
 function lessonGreeting(id:string){return t('lessonGreeting').replace('{number}',String(groups.indexOf(groupForSource(id))+1).padStart(2,'0'));}
 async function dayPlan(signal:AbortSignal,requestedLesson?:string){
  const planDay=requestedLesson?sourceDay(requestedLesson):day;
  let text:Record<string,string>={};
  if(!native){if(content?.day===planDay&&content.language===locale)text=content.text;else{const r=await fetch('/api/rcv3/learn/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({day:planDay,language:locale}),signal});if(!r.ok)throw Error('CONTENT');text=(await r.json()).text;}}
  const parts:TeachingSegment[]=groups.filter(g=>g.day===planDay).flatMap(g=>g.sources).flatMap(id=>{
   const item=lessons.find(l=>l.id===id)!;const body=native?(ko?item.ko:item.body):text[`body.${id}`];
   if(!body)throw Error('CONTENT');const paragraphs=teachingParagraphs(id,body).map(part=>v4?{...part,sourceText:part.text,startOffset:0}:part);const name=native?(ko?item.koTitle:item.title):text[`title.${id}`]??item.title;
   if(paragraphs[0])paragraphs[0].text=`${name}. ${paragraphs[0].text}`;return paragraphs;
  });
  let index=v4?Math.max(0,parts.findIndex(p=>p.lesson===(requestedLesson??lesson.id))):0;
  try{const saved=readTeachingBookmark(window.localStorage,ownerId,locale);if(saved&&saved.day===planDay&&!saved.finished&&(!v4||(saved.lesson===lesson.id&&!requestedLesson))){const savedIndex=parts.findIndex(p=>p.lesson===saved.lesson&&p.paragraph===saved.paragraph);if(savedIndex>=0)index=savedIndex;}}catch{setDraftError(true);}
  if(v4&&parts[index]){
   let part=parts[index];
   if(!requestedLesson){try{const marker=readReadingMarker(window.localStorage,ownerId,locale),saved=readTeachingBookmark(window.localStorage,ownerId,locale);
    if(saved&&!saved.finished&&marker&&saved.day===planDay&&saved.lesson===marker.lesson&&saved.paragraph===marker.paragraph&&marker.lesson===part.lesson&&marker.paragraph===part.paragraph&&marker.source===part.sourceText){const startOffset=resumeSentenceOffset(marker.source,marker.fraction);part={...part,startOffset,text:startOffset?marker.source.slice(startOffset):part.text};}
   }catch{setDraftError(true);}}
   parts[index]={...part,text:`${lessonGreeting(part.lesson)} ${part.text}`};
  }
  return {parts,index};
 }
 const planRef=useRef(dayPlan);
 useEffect(()=>{planRef.current=dayPlan;});
 useEffect(()=>{
  if(!v4||!loaded||!draftReady||!contentReady)return;
  const abort=new AbortController();
  // Preparation never starts teaching or changes the saved teaching position.
  void planRef.current(abort.signal).then(plan=>{if(!abort.signal.aborted)setPreparedPlan({language:locale,lesson:lessons[unit].id,text:plan.parts[plan.index]?.text??''});}).catch(()=>{});
  return()=>abort.abort();
 },[v4,loaded,draftReady,contentReady,day,unit,locale,content]);
 function teachingSegment(part:TeachingSegment){
  const target=lessons.findIndex(l=>l.id===part.lesson);
  const history=part.lesson===lesson.id?messages:conversations.current[part.lesson]?.messages??[];
  if(target!==unit){selectUnit(target);setDay(sourceDay(part.lesson));}
  if(v4){
   const source=part.sourceText??part.text,base=Math.max(0,Math.min(1,(part.startOffset??0)/source.length));
   activeReading.current={lesson:part.lesson,paragraph:part.paragraph,source,base};
   setReadingProgress({elapsed:base,duration:1});rememberReadingMarker({lesson:part.lesson,paragraph:part.paragraph,source,fraction:base},true);
   setTeachingCursor({lesson:part.lesson,paragraph:part.paragraph});savePosition(part.lesson,history);
  }
  else{const next:Message[]=[...history,{role:'assistant',content:part.text}];showExplanation(next);savePosition(part.lesson,next);}
  try{saveTeachingBookmark(window.localStorage,ownerId,locale,{day:sourceDay(part.lesson),lesson:part.lesson,paragraph:part.paragraph,finished:false});}catch{setDraftError(true);}
 }
 function teachingFinished(){try{const saved=readTeachingBookmark(window.localStorage,ownerId,locale);if(saved){saveTeachingBookmark(window.localStorage,ownerId,locale,{...saved,finished:true});const next=v4?lessons.findIndex(l=>sourceDay(l.id)>saved.day):-1;if(next>=0){selectUnit(next);setDay(sourceDay(lessons[next].id));}}}catch{setDraftError(true);}}
 const voice=useRef<LearningVoiceHandle|null>(null);
 const lessonList=useRef<LearningLessonListHandle|null>(null);
 function chooseLesson(){if(v4&&!requestBusy&&loaded&&draftReady&&!exam)lessonList.current?.open();}
 function startListedLesson(number:number){
  if(!v4){voice.current?.start(t('lessonStartRequest').replace('{number}',String(number)));return;}
  const selected=groups[number-1];if(!selected||requestBusy||!loaded||!draftReady||exam)return;
  const continueCurrent=selected.sources.includes(lesson.id);
  const index=continueCurrent?unit:lessons.findIndex(l=>l.id===selected.sources[0]);
  voice.current?.stop();selectUnit(index);setDay(selected.day);
  if(!localDrafts.current[lessons[index].id]?.message.trim()){
   voice.current?.startDay(continueCurrent?undefined:lessons[index].id);
  }
 }
 const followCursor=voiceActive&&teachingCursor?teachingCursor:readingMarker,followLesson=followCursor?.lesson,followParagraph=followCursor?.paragraph;
 useEffect(()=>{
  if(!v4||followLesson!==lesson.id||followParagraph===undefined)return;
  const frame=requestAnimationFrame(()=>{
   const target=document.getElementById(followParagraph<0?`lesson-${lesson.id}-body`:`lesson-${lesson.id}-paragraph-${followParagraph}`),scroll=curriculumScroll.current;
   if(!target||!scroll)return;
   if(window.matchMedia('(min-width:761px)').matches){scroll.scrollTop+=target.getBoundingClientRect().top-scroll.getBoundingClientRect().top-16;}
   else target.scrollIntoView({block:'nearest'});
  });return()=>cancelAnimationFrame(frame);
 },[v4,lesson.id,followLesson,followParagraph]);
 function playbackIdle(){setTeachingCursor(cursor=>cursor?.paragraph===-1?null:cursor);}
 function voiceActivity(active:boolean){setVoiceActive(active);if(!active){persistReadingMarker();activeReading.current=null;setTeachingCursor(null);setReadingProgress(null);}}
 const nextLesson=nextLearningLesson(unit);
 const finish=state.completed.length===lessons.length;
 const visibleMessages=v4?(boardExplanation===null?[]:[{role:'assistant' as const,content:boardExplanation}]):messages;
 function sendMessage(){
  if(voiceActive){voice.current?.start(message,true);return;}
  void run({action:'chat',lesson:lesson.id,message,history:messages.slice(-8).map(m=>({...m,content:m.content.slice(0,3000)}))},d=>{
   const history:Message[]=[...messages,{role:'user',content:message},{role:'assistant',content:String(d.answer)}];
   showExplanation(history);savePosition(lesson.id,history);setMessage('');keepDraft('',artifact);
  });
 }
 const sendDisabled=!loaded||requestBusy||!draftReady||Boolean(exam)||!message.trim();
 const messageField={
  'aria-label':t('m6'),maxLength:2000,rows:v4?1:3,value:message,
  onChange:(e:ChangeEvent<HTMLTextAreaElement>)=>{voice.current?.stopDictation();setMessage(e.target.value);keepDraft(e.target.value,artifact);},
  disabled:requestBusy||!draftReady||Boolean(exam),
 };
 return <main className={`${styles.page}${v4?` ${styles.v4Desktop}`:''}`} lang={locale}>

  <div className={styles.layout}>
   <div className={styles.curriculum} ref={curriculumScroll}>
  {resumed&&<p>{t('teacherResumeSaved')}</p>}
  <header><a href={homeHref}>← {t("myRooms")}</a><span className={styles.courseBadge}>{t("courseBadge")}</span><h1>{t("title")}</h1><p>{help("learnOverview")}</p><LearningRegion language={language} country={country} disabled={busy||Boolean(exam)} onChange={changeRegion}/></header>
  {!native&&<p role="status">{t('autoTranslation')} {!contentReady&&t(translationError?'translationError':'translating')}{translationError&&<button onClick={()=>setTranslationRetry(v=>v+1)}>{t('retry')}</button>}</p>}
  {!loaded&&!error&&<p role="status">{t("loadingProgress")}</p>}
  <div className={styles.progress}><strong>{completedGroupCount(state.completed)} / {groups.length} {t("m4")}</strong><progress max={groups.length} value={completedGroupCount(state.completed)}/></div>
  {error&&<div role="alert" className={styles.error}>{error}{!loaded&&<button onClick={()=>void load()}>{t("retry")}</button>}</div>}
  <p>{t("topicHelp")}</p>

<LearningLessonList ref={lessonList} language={locale} titles={groups.map(g=>ko?g.koTitle:g.sources.map(id=>(content?.language===locale?content.text[`title.${id}`]:undefined)??lessons.find(l=>l.id===id)!.title).join(' · '))} selected={groups.indexOf(groupForSource(lesson.id))+1} completed={groups.flatMap((g,i)=>groupComplete(g,state.completed)?[i+1]:[])} disabled={!loaded||requestBusy||!draftReady||Boolean(exam)} onStart={startListedLesson}/><div className={styles.dayStart}><label>{t("studyDay")}<select value={day} disabled={!loaded||busy||!draftReady} onChange={e=>{const d=Number(e.target.value);setDay(d);selectUnit(lessons.findIndex(l=>sourceDay(l.id)===d));}}>{Array.from({length:30},(_,i)=><option key={i} value={i+1}>{i+1} {t("day")} · {groups.filter(g=>g.day===i+1&&groupComplete(g,state.completed)).length}/{groups.filter(g=>g.day===i+1).length}</option>)}</select></label>{!v4&&<button type="button" disabled={!loaded||requestBusy||!draftReady||Boolean(exam)} onClick={()=>voice.current?.startDay()}>{t('teacherStart')}</button>}</div>
   {groups.filter(g=>g.day===day).map(group=>{const units=group.sources.map(id=>lessons.find(l=>l.id===id)!);const active=group.sources.includes(lesson.id);const label=ko?group.koTitle:units.map(title).join(' · ');return <section className={styles.unit} key={group.id}>
    <button type="button" className={styles.unitButton} disabled={!loaded||busy||!draftReady} aria-expanded={active} aria-controls={`lesson-${active?lesson.id:group.sources[0]}`} onClick={()=>selectUnit(lessons.findIndex(l=>l.id===(group.sources.find(id=>!state.completed.includes(id))??group.sources[0])))}><span>{group.id}</span><strong>{label}</strong>{groupComplete(group,state.completed)&&<small>✓ {t("m5")}</small>}</button>
    {active&&<article id={`lesson-${lesson.id}`} aria-label={label}>
    {units.length>1&&<div>{units.map((part,n)=><button key={part.id} type="button" disabled={busy||!draftReady} aria-pressed={part.id===lesson.id} onClick={()=>selectUnit(lessons.findIndex(l=>l.id===part.id))}>{t('lessonPart')} {n+1}{state.completed.includes(part.id)?' ✓':''}</button>)}</div>}
    <h2>{group.id}. {title(lesson)}</h2><p>{t(unit<50?"quizCompletion":"projectCompletion")}</p>{v4?<div id={`lesson-${lesson.id}-body`} className={styles.lesson}>{teachingParagraphs(lesson.id,translated(`body.${lesson.id}`,ko?lesson.ko:lesson.body)).map(part=>{const reading=voiceActive&&teachingCursor?.lesson===part.lesson&&(teachingCursor.paragraph<0||teachingCursor.paragraph===part.paragraph);const marked=readingMarker?.lesson===part.lesson&&readingMarker.paragraph===part.paragraph&&readingMarker.source===part.text;return <p key={part.paragraph} id={`lesson-${part.lesson}-paragraph-${part.paragraph}`} className={`${styles.lessonParagraph}${reading?` ${styles.readingParagraph}`:marked?` ${styles.savedReadingParagraph}`:''}`} aria-current={reading?'true':undefined}>{part.text}{(marked||(reading&&teachingCursor.paragraph>=0))&&<ReadingProgress progress={reading&&teachingCursor.paragraph>=0?readingProgress:{elapsed:readingMarker?.fraction??0,duration:1}}/>}</p>;})}</div>:<p className={styles.lesson}>{translated(`body.${lesson.id}`,ko?lesson.ko:lesson.body)}</p>}

    {question&&unit<50&&<section className={styles.check} aria-label={t("m8")}><h3>{t("m8")}</h3><p>{translated(`q.${question.id}`,ko?question.ko:question.text)}</p>{question.options.map((option,i)=><label className={styles.option} key={option}><input type="radio" name="practice" disabled={busy} checked={answer===i} onChange={()=>setAnswer(i)}/>{translated(`q.${question.id}.${i}`,ko?question.koOptions[i]:option)}</label>)}<button disabled={busy||!loaded||!contentReady||answer===null} onClick={()=>void run({action:'practice',lesson:lesson.id,answer},d=>{if(d.correct){setState(d as unknown as LearningState);setNotice(t("m9"));}else setNotice(t("m10"));})}>{t("m11")}</button></section>}
    {unit>=50&&<section className={styles.check} aria-label={t("assignment")}><h3>{t("assignment")}</h3><p>{help("learnProject")}</p><label>{t("evidence")}<textarea rows={10} maxLength={6000} value={artifact} disabled={busy||!draftReady} onChange={e=>{setArtifact(e.target.value);keepDraft(message,e.target.value);}}/></label><small>{artifact.trim().length} / 6000</small><button disabled={!loaded||busy||state.completed.includes(lesson.id)||artifact.trim().length<150} onClick={()=>void run({action:'project',lesson:lesson.id,artifact},d=>{setState(d as unknown as LearningState);setNotice(`${d.projectScore} / 100 — ${d.feedback}`);})}>{t("submitFeedback")}</button>{state.work?.[lesson.id]&&<div><strong>{t(state.completed.includes(lesson.id)?"passedWork":"reviseWork")} · {state.work[lesson.id].score} / 100</strong><p>{state.work[lesson.id].feedback}</p></div>}</section>}
    {draftReady&&<p role="status">{t(draftError?'draftError':'draftSaved')}</p>}
    {notice&&<p role="status">{notice}</p>}
    {state.completed.includes(lesson.id)&&<div role="status"><strong>✓ {t("m5")}</strong>{nextLesson&&<button type="button" disabled={busy||!draftReady} onClick={()=>{setDay(nextLesson.day);selectUnit(unit+1);requestAnimationFrame(()=>document.getElementById(`lesson-${nextLesson.id}`)?.scrollIntoView({block:"start"}));}}>{t("nextLesson")}</button>}</div>}
   </article>}</section>})}
  <section className={styles.exam} aria-label={t("finalExam")}><h2>{t("finalExam")}</h2><p>{help("learnExam")}</p>
   {!finish&&<p>{t("m12")}</p>}
   <button disabled={!loaded||busy||!finish} onClick={()=>void run({action:'start'},d=>{setExam(d as unknown as {attempt:string;questions:Question[];expiresAt:string;serverNow:string});if(exam?.attempt!==d.attempt)setAnswers({});setScore(null);setClock(Date.now());setOffset(Date.now()-Date.parse(String(d.serverNow)));})}>{t(exam?'resumeExam':'startExam')}</button>
   {exam&&<div><p role="timer">{t("timeRemaining")}: {Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</p>{remaining===0&&<p>{t("m2")}</p>}{exam.questions.map((q,n)=><fieldset key={q.id} disabled={busy||remaining===0}><legend>{n+1}. {ko?q.ko:q.text}</legend>{q.options.map((o,i)=><label className={styles.option} key={o}><input type="radio" name={q.id} checked={answers[q.id]===i} onChange={()=>setAnswers({...answers,[q.id]:i})}/>{ko?q.koOptions[i]:o}</label>)}</fieldset>)}<button disabled={busy||remaining===0||exam.questions.some(q=>answers[q.id]===undefined)} onClick={()=>void run({action:'submit',attempt:exam.attempt,answers:exam.questions.map(q=>answers[q.id])},d=>{setScore(Number(d.score));setState(d as unknown as LearningState);setExam(null);setAnswers({});})}>{t("m13")}</button></div>}
   {score!==null&&<p role="status">{score} / 100 — {score>=PASS_MARK?t("m14"):t("m15")}</p>}
   {state.certificate&&<div className={styles.award}><h3>✓ {t("m16")}</h3><a href={`/rcv3/learn/certificate/${state.certificate.id}?language=${locale}&country=${encodeURIComponent(country)}&entry=${entryPath==='/rcv4/learn'?'v4':'v3'}`}>{t("m17")}</a></div>}
  </section>
  <details className={styles.exam}><summary>{t("sources")}</summary><p>{t("sourceNote")}</p><ul><li><a href="https://home.dartmouth.edu/about/artificial-intelligence-ai-coined-dartmouth" target="_blank" rel="noreferrer">{t("sourceHistory")}</a></li><li><a href="https://doi.org/10.1609/aimag.v27i4.1904" target="_blank" rel="noreferrer">{t("sourceProposal")}</a></li><li><a href="https://arxiv.org/abs/1706.03762" target="_blank" rel="noreferrer">{t("sourceTransformer")}</a></li><li><a href="https://hai.stanford.edu/ai-index/2026-ai-index-report" target="_blank" rel="noreferrer">{t("sourceIndex")}</a></li><li><a href="https://www.nist.gov/itl/ai-risk-management-framework" target="_blank" rel="noreferrer">{t("sourceRisk")}</a></li></ul></details>
   </div>
   <aside className={styles.teacherColumn} aria-label={t("tutor")}>
  <div className={styles.teacherViewport}>
  <LearningVoice key={locale} ref={voice} compact={v4} prepareText={preparedPlan?.language===locale&&preparedPlan.lesson===lesson.id?preparedPlan.text:''} language={locale} lessonId={lesson.id} lessonTitle={`${groupForSource(lesson.id).id}. ${title(lesson)}`} resume={resumed||messages.length>0} lessonText={contentReady?translated(`body.${lesson.id}`,ko?lesson.ko:lesson.body):''} answerText={[...messages].reverse().find(m=>m.role==='assistant')?.content??''} draft={message} disabled={requestBusy||!loaded||!draftReady||Boolean(exam)} onChooseLesson={v4?chooseLesson:undefined} onDayPlan={dayPlan} onDaySegment={teachingSegment} onDayComplete={teachingFinished} onActiveChange={voiceActivity} onPlaybackIdle={v4?playbackIdle:undefined} onDayProgress={v4?teachingProgress:undefined} onQuestion={voiceQuestion} onTranscript={text=>{if(voiceActive){setVoiceTranscript(text);return;}setMessage(text);keepDraft(text,artifact);}}/>
  </div>
    <section className={styles.tutor} aria-label={t("tutor")}>{!v4&&<h3>{t("chatWithTeacher")}</h3>}
     <div className={v4?styles.answerWindow:styles.legacyAnswer}>
     <div ref={chatScroll} aria-live="polite" className={styles.messages}>{visibleMessages.map((m,i)=><p key={i}><strong>{m.role==='user'?t('you'):t('tutor')}</strong><br/>{m.content}</p>)}</div>
     </div>
     {voiceTranscript&&<p className={styles.transcript} aria-live="polite">{voiceTranscript}</p>}
     <div className={v4?styles.composer:styles.legacyComposer}>
     <label>{!v4&&t("m6")}{v4?<LearningAutoTextarea {...messageField}/>:<textarea {...messageField}/>}</label>
     {v4?<ToolButton toolId="send" className={styles.send} aria-label={requestBusy?t("m7"):t("send")} title={requestBusy?t("m7"):t("send")} disabled={sendDisabled} onClick={sendMessage}><Send size={20} aria-hidden="true"/></ToolButton>:<button disabled={sendDisabled} onClick={sendMessage}>{requestBusy?t("m7"):t("send")}</button>}
     </div>
    </section>
   </aside>
  </div>

 </main>;
}
