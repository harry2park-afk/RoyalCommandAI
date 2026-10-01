import React from 'react';
import {beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({stateIndex:0,avatarReady:null as boolean|null,effects:[] as (()=>unknown)[],handle:null as null|{start:(text?:string,typed?:boolean)=>void;stop:()=>void;stopDictation:()=>void;startDay:()=>void},enqueue:vi.fn(),stop:vi.fn(),prime:vi.fn(),load:null as null|((job:unknown,text:string,signal:AbortSignal)=>Promise<Blob>),stream:null as null|((job:unknown,text:string,signal:AbortSignal,reading:()=>void)=>Promise<boolean>),canStream:false,pcmPlay:vi.fn(),refs:[] as {current:unknown}[]}));
vi.mock('react',async original=>({...await original<typeof import('react')>(),useEffect:(f:()=>unknown)=>m.effects.push(f),useState:(v:unknown)=>{const i=m.stateIndex++;return [i===0?m.avatarReady:v,vi.fn()];},useRef:(v:unknown)=>{const ref={current:v};m.refs.push(ref);return ref;},useImperativeHandle:(_ref:unknown,f:()=>typeof m.handle)=>{m.handle=f();}}));
vi.mock('@/lib/client/answer-speaker',()=>({AnswerSpeaker:class{constructor(options:{load:typeof m.load;stream?:typeof m.stream}){m.load=options.load;m.stream=options.stream??null;}enqueue=m.enqueue;stop=m.stop;prime=m.prime;setVolume=vi.fn();}}));
vi.mock('@/lib/client/pcm-speech-player',()=>({PcmSpeechPlayer:class{get available(){return m.canStream;}prime=vi.fn();play=m.pcmPlay;stop=vi.fn();dispose=vi.fn();setVolume=vi.fn();}}));
import LearningVoice from './LearningVoice';
function nodes(v:unknown):React.ReactElement<Record<string,any>>[]{if(Array.isArray(v))return v.flatMap(nodes);if(!React.isValidElement(v))return [];const e=v as React.ReactElement<Record<string,any>>;return [e,...nodes(e.props.children)];}
let recog:any;
class Recognition{lang='';onresult:any;onend:any;onerror:any;start=vi.fn();abort=vi.fn();constructor(){recog=this;}}
beforeEach(()=>{vi.clearAllMocks();m.effects=[];m.refs=[];m.stateIndex=0;m.avatarReady=null;m.canStream=false;vi.stubGlobal('React',React);vi.stubGlobal('window',{SpeechRecognition:Recognition});vi.stubGlobal('document',{hidden:false,addEventListener:vi.fn(),removeEventListener:vi.fn()});vi.stubGlobal('navigator',{mediaDevices:{addEventListener:vi.fn(),removeEventListener:vi.fn()}});});
function setup(){const onTranscript=vi.fn();const tree=nodes(LearningVoice({language:'ko',lessonId:'001',lessonText:'lesson',answerText:'answer',draft:'existing',disabled:false,onTranscript}));const cleanup=m.effects.map(f=>f());return {onTranscript,tree,cleanup};}
it('adds spoken text to existing draft, does not submit, and ignores delayed results after cleanup',()=>{const {tree,onTranscript,cleanup}=setup();tree.find(n=>n.type==='button'&&n.props.children==='마이크')!.props.onClick();expect(recog.lang).toBe('ko');recog.onresult({results:[[{transcript:'질문'}]]});expect(onTranscript).toHaveBeenLastCalledWith('existing 질문');expect(m.stop).toHaveBeenCalled();for(const c of cleanup)if(typeof c==='function')c();recog.onresult({results:[[{transcript:'late'}]]});expect(onTranscript).toHaveBeenCalledTimes(1);expect(recog.abort).toHaveBeenCalled();});
it('starts playback from a user gesture and cancels playback through stop control',()=>{const {tree}=setup();tree.find(n=>n.type==='button'&&n.props.children==='강의 듣기')!.props.onClick();expect(m.prime).toHaveBeenCalled();expect(m.enqueue).toHaveBeenCalledWith({id:'tutor',text:'lesson'});tree.find(n=>n.type==='button'&&n.props.children==='음성 중지')!.props.onClick();expect(m.stop.mock.calls.length).toBeGreaterThan(1);});
it('unsupported microphone leaves the typed draft untouched',()=>{vi.stubGlobal('window',{});const {tree,onTranscript}=setup();expect(()=>tree.find(n=>n.type==='button'&&n.props.children==='마이크')!.props.onClick()).not.toThrow();expect(onTranscript).not.toHaveBeenCalled();});
it('keeps playback on hide only after explicit listen-only selection, but stops on device change',()=>{
 const {tree}=setup();
 const hide=vi.mocked(document.addEventListener).mock.calls.find(c=>c[0]==='visibilitychange')![1] as ()=>void;
 const device=vi.mocked(navigator.mediaDevices.addEventListener).mock.calls.find(c=>c[0]==='devicechange')![1] as ()=>void;
 Object.defineProperty(document,'hidden',{value:true,configurable:true});
 m.stop.mockClear();hide();expect(m.stop).toHaveBeenCalled();
 tree.find(n=>n.type==='input'&&n.props.type==='checkbox')!.props.onChange({target:{checked:true}});
 m.stop.mockClear();hide();expect(m.stop).not.toHaveBeenCalled();
 device();expect(m.stop).toHaveBeenCalled();
});
it('voice conversation still opens through the shared question handler',async()=>{
 const onQuestion=vi.fn(async()=> 'teacher explanation');const onActiveChange=vi.fn();
 const tree=nodes(LearningVoice({language:'ko',lessonId:'001',lessonTitle:'1. 첫 수업',lessonText:'lesson',answerText:'',draft:'',disabled:false,onTranscript:vi.fn(),onQuestion,onActiveChange}));
 const cleanup=m.effects.map(f=>f());tree.find(n=>n.type==='button'&&n.props.children==='음성 대화 시작')!.props.onClick();await Promise.resolve();
 expect(m.prime).toHaveBeenCalled();expect(onQuestion).toHaveBeenCalledWith(expect.any(String),expect.any(AbortSignal),false);expect(m.enqueue).toHaveBeenCalledWith({id:'conversation',text:'teacher explanation'});expect(onActiveChange).toHaveBeenCalledWith(true);
 for(const c of cleanup)if(typeof c==='function')c();
});
it('number selection starts the requested lesson and typed questions interrupt stale speech without losing the draft',async()=>{
 const onQuestion=vi.fn(async()=> 'answer');const onTranscript=vi.fn();
 LearningVoice({language:'ko',lessonId:'001',lessonText:'lesson',answerText:'',draft:'keep this',disabled:false,onTranscript,onQuestion});const cleanup=m.effects.map(f=>f());
 m.handle!.start('start lesson 60');await Promise.resolve();expect(onQuestion).toHaveBeenLastCalledWith('start lesson 60',expect.any(AbortSignal),false);
 m.handle!.start('typed question',true);await Promise.resolve();expect(onQuestion).toHaveBeenLastCalledWith('typed question',expect.any(AbortSignal),true);expect(onTranscript).not.toHaveBeenCalled();expect(m.stop).toHaveBeenCalled();
 for(const c of cleanup)if(typeof c==='function')c();
});
it('typing cancels standalone dictation so delayed transcript cannot overwrite manual edits',()=>{
 const {tree,onTranscript,cleanup}=setup();tree.find(n=>n.type==='button'&&n.props.children==='마이크')!.props.onClick();
 m.handle!.stopDictation();recog.onresult({results:[[{transcript:'late dictation'}]]});expect(onTranscript).not.toHaveBeenCalled();expect(recog.abort).toHaveBeenCalled();
 for(const c of cleanup)if(typeof c==='function')c();
});
it('uses the existing daily start and stop handlers in the V4 tutor without static guidance or settings',async()=>{
 const onActiveChange=vi.fn();
 const onDayPlan=vi.fn(async()=>({parts:[{lesson:'001',paragraph:0,text:'daily teaching'}],index:0}));
 const tree=nodes(LearningVoice({language:'ko',lessonId:'001',lessonTitle:'Original lesson title',lessonText:'lesson',answerText:'',draft:'',disabled:false,onTranscript:vi.fn(),onActiveChange,onDayPlan,compact:true}));
 m.effects.map(f=>f());
 expect(tree.some(n=>n.type==='strong'||n.type==='small')).toBe(false);
 expect(tree.some(n=>n.type==='span'&&n.props.role==='status')).toBe(false);
 expect(tree.some(n=>n.type==='details'||n.type==='summary')).toBe(false);
 expect(tree.some(n=>n.type==='button'&&n.props.children==='마이크')).toBe(false);
 const start=tree.find(n=>n.type==='button'&&n.props.children==='수업 시작')!;
 expect(start.props.disabled).toBe(false);start.props.onClick();await Promise.resolve();await Promise.resolve();
 expect(onDayPlan).toHaveBeenCalledOnce();expect(m.enqueue).toHaveBeenCalledWith({id:'conversation',text:'daily teaching'});
 tree.find(n=>n.type==='button'&&n.props.children==='스톱')!.props.onClick();
 expect(m.stop).toHaveBeenCalled();expect(onActiveChange).toHaveBeenCalledWith(false);
});
it('keeps V4 start disabled when access is blocked, a draft exists or no daily plan is available',()=>{
 const props={language:'ko',lessonId:'001',lessonText:'lesson',answerText:'',draft:'',disabled:false,onTranscript:vi.fn(),compact:true};
 const onDayPlan=vi.fn(async()=>({parts:[],index:0}));
 for(const guard of [{disabled:true,onDayPlan},{draft:'unfinished question',onDayPlan},{}]){
  const tree=nodes(LearningVoice({...props,...guard}));
  expect(tree.find(n=>n.type==='button'&&n.props.children==='수업 시작')!.props.disabled).toBe(true);
 }
});
it('starts continuous daily teaching and recognizes Stop after earlier microphone results',async()=>{
 const onDaySegment=vi.fn(),onDayComplete=vi.fn(),onActiveChange=vi.fn();
 const tree=nodes(LearningVoice({language:'ko',lessonId:'001',lessonText:'lesson',answerText:'',draft:'preserve draft',disabled:false,onTranscript:vi.fn(),onActiveChange,onDayPlan:async()=>({parts:[{lesson:'001',paragraph:0,text:'first teaching'},{lesson:'002',paragraph:0,text:'second teaching'}],index:0}),onDaySegment,onDayComplete}));
 const cleanup=m.effects.map(f=>f());m.handle!.startDay();await Promise.resolve();await Promise.resolve();expect(m.enqueue).toHaveBeenCalledWith({id:'conversation',text:'first teaching'});expect(onDaySegment).toHaveBeenCalledOnce();
 const earlier=Object.assign([{transcript:'previous speech'}],{isFinal:true}),command=Object.assign([{transcript:'오늘은 그만 하자'}],{isFinal:true});
 recog.onresult({resultIndex:1,results:[earlier,command,Object.assign([{transcript:'interim'}],{isFinal:false})]});await Promise.resolve();expect(onActiveChange).toHaveBeenLastCalledWith(false);expect(onDayComplete).not.toHaveBeenCalled();expect(m.enqueue).toHaveBeenCalledTimes(1);
 expect(tree.some(n=>n.type==='button'&&n.props.children==='스톱')).toBe(true);expect(tree.some(n=>n.type==='button'&&n.props.children==='수업 시작')).toBe(false);
 for(const c of cleanup)if(typeof c==='function')c();
});

it('forwards an explicit listed source to the existing daily player and cancels it through Stop',async()=>{
 const onDayPlan=vi.fn(async()=>({parts:[{lesson:'005',paragraph:0,text:'selected source teaching'}],index:0}));
 LearningVoice({language:'ko',lessonId:'001',lessonText:'old lesson',answerText:'',draft:'',disabled:false,onTranscript:vi.fn(),onDayPlan,compact:true});const cleanup=m.effects.map(f=>f());
 (m.handle as unknown as {startDay:(lesson:string)=>void}).startDay('005');await Promise.resolve();await Promise.resolve();
 expect(onDayPlan).toHaveBeenCalledWith(expect.any(AbortSignal),'005');expect(m.enqueue).toHaveBeenCalledWith({id:'conversation',text:'selected source teaching'});
 m.handle!.stop();expect(m.stop).toHaveBeenCalled();for(const c of cleanup)if(typeof c==='function')c();
});

it('requests the fixed male profile only for V4 and preserves locale/text/cancellation',async()=>{
 for(const compact of [true,false]){
  m.effects=[];m.refs=[];m.stateIndex=0;m.avatarReady=null;m.canStream=false;vi.stubGlobal('fetch',vi.fn(async()=>new Response('audio')));
  LearningVoice({language:'ko',lessonId:'001',lessonText:'lesson',answerText:'',draft:'',disabled:false,onTranscript:vi.fn(),compact});
  const cleanup=m.effects.map(f=>f()),signal=new AbortController().signal;
  await m.load!({},'original lesson or answer',signal);
  const [url,options]=vi.mocked(fetch).mock.calls[0];
  expect(url).toBe('/api/rcv3/learn/speech');expect(options!.signal).toBe(signal);
  expect(JSON.parse(options!.body as string)).toEqual({text:'original lesson or answer',language:'ko',...(compact?{tutor:'v4-male'}:{})});
  for(const c of cleanup)if(typeof c==='function')c();
 }
});

it('V4 Start opens the registered lesson selector immediately instead of starting speech or bypassing a draft',()=>{
 const onChooseLesson=vi.fn(),onDayPlan=vi.fn();
 const tree=nodes(LearningVoice({language:'ko',lessonId:'001',lessonText:'lesson',answerText:'',draft:'keep this question',disabled:false,onTranscript:vi.fn(),onChooseLesson,onDayPlan,compact:true}));
 m.effects.map(f=>f());const start=tree.find(n=>n.type==='button'&&n.props.children==='수업 시작')!;
 expect(start.props.disabled).toBe(false);expect(start.props['aria-haspopup']).toBe('dialog');start.props.onClick();
 expect(onChooseLesson).toHaveBeenCalledOnce();expect(onDayPlan).not.toHaveBeenCalled();expect(m.enqueue).not.toHaveBeenCalled();
});
it('blocked access does not open the lesson selector',()=>{
 const onChooseLesson=vi.fn();const tree=nodes(LearningVoice({language:'en',lessonId:'001',lessonText:'lesson',answerText:'',draft:'',disabled:true,onTranscript:vi.fn(),onChooseLesson,compact:true}));
 const start=tree.find(n=>n.type==='button'&&n.props.children==='Start lesson')!;expect(start.props.disabled).toBe(true);start.props.onClick();expect(onChooseLesson).not.toHaveBeenCalled();
});

it('streams V4 speech through one fixed male-profile request and preserves language and abort signal',async()=>{
 m.canStream=true;const response=new Response('pcm',{headers:{'Content-Type':'audio/pcm'}});vi.stubGlobal('fetch',vi.fn(async()=>response));
 LearningVoice({language:'ko',lessonId:'001',lessonText:'lesson',answerText:'',draft:'',disabled:false,onTranscript:vi.fn(),compact:true});m.effects.map(f=>f());
 const signal=new AbortController().signal,reading=vi.fn();expect(await m.stream!({},'안녕하세요. 수업 내용',signal,reading)).toBe(true);
 expect(fetch).toHaveBeenCalledOnce();const [url,init]=vi.mocked(fetch).mock.calls[0];expect(url).toBe('/api/rcv3/learn/speech');expect(init!.signal).toBe(signal);expect(JSON.parse(init!.body as string)).toEqual({text:'안녕하세요. 수업 내용',language:'ko',tutor:'v4-male',stream:true});expect(m.pcmPlay).toHaveBeenCalledWith(response,signal,reading);
});
it('uses the original transport without a streaming request for unsupported Web Audio or configured live video, and leaves V3 unchanged',async()=>{
 vi.stubGlobal('fetch',vi.fn());
 for(const live of [false,true]){
  m.effects=[];m.refs=[];m.canStream=live;
  LearningVoice({language:'ko',lessonId:'001',lessonText:'lesson',answerText:'',draft:'',disabled:false,onTranscript:vi.fn(),compact:true});m.effects.map(f=>f());
  m.refs[0].current={hasLiveVideo:()=>live};expect(await m.stream!({},'lesson',new AbortController().signal,vi.fn())).toBe(false);
 }
 m.effects=[];LearningVoice({language:'ko',lessonId:'001',lessonText:'lesson',answerText:'',draft:'',disabled:false,onTranscript:vi.fn()});m.effects.map(f=>f());expect(m.stream).toBeNull();expect(fetch).not.toHaveBeenCalled();
});


it('prepares one first paragraph without playback and consumes it without a second request',async()=>{
 m.avatarReady=false;m.canStream=true;vi.stubGlobal('window',{SpeechRecognition:Recognition,AudioContext:class{}});
 const fetch=vi.fn(async()=>new Response('audio',{headers:{'Content-Type':'audio/pcm'}}));vi.stubGlobal('fetch',fetch);
 LearningVoice({compact:true,prepareText:'Prepared first paragraph',language:'ko',lessonId:'001',lessonText:'lesson',answerText:'',draft:'',disabled:false,onTranscript:vi.fn()});
 const cleanups=m.effects.map(f=>f());await Promise.resolve();expect(fetch).toHaveBeenCalledTimes(1);expect(m.enqueue).not.toHaveBeenCalled();expect(m.prime).not.toHaveBeenCalled();expect(m.pcmPlay).not.toHaveBeenCalled();
 await m.stream!(null,'Prepared first paragraph',new AbortController().signal,vi.fn());expect(fetch).toHaveBeenCalledTimes(1);expect(m.pcmPlay).toHaveBeenCalled();
 for(const cleanup of cleanups)if(typeof cleanup==='function')cleanup();
});
it('does not late-prepare another request once the selected lesson has started',async()=>{
 m.avatarReady=false;vi.stubGlobal('window',{SpeechRecognition:Recognition,AudioContext:class{}});const fetch=vi.fn(async()=>new Response('audio'));vi.stubGlobal('fetch',fetch);
 LearningVoice({compact:true,prepareText:'First paragraph',language:'ko',lessonId:'001',lessonText:'lesson',answerText:'',draft:'',disabled:false,onTranscript:vi.fn(),onDayPlan:async()=>({parts:[{lesson:'001',paragraph:0,text:'First paragraph'}],index:0})});
 const cleanups=[m.effects[0]()];m.handle!.startDay();m.effects[1]();await Promise.resolve();expect(fetch).not.toHaveBeenCalled();
 for(const cleanup of cleanups)if(typeof cleanup==='function')cleanup();
});
it('keeps background preparation disabled for V3, blocked access, drafts and unknown avatar capability',()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 for(const props of [{compact:false,disabled:false,draft:''},{compact:true,disabled:true,draft:''},{compact:true,disabled:false,draft:'Keep draft'},{compact:true,disabled:false,draft:''}]){
  m.effects=[];m.stateIndex=0;m.avatarReady=null;
  LearningVoice({...props,prepareText:'paragraph',language:'ko',lessonId:'001',lessonText:'lesson',answerText:'',onTranscript:vi.fn()});
  const cleanups=m.effects.map(f=>f());for(const cleanup of cleanups)if(typeof cleanup==='function')cleanup();
 }
 expect(fetch).not.toHaveBeenCalled();
});
