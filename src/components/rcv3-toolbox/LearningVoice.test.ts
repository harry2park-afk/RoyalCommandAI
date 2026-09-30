import React from 'react';
import {beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({effects:[] as (()=>unknown)[],handle:null as null|{start:(text?:string,typed?:boolean)=>void;stop:()=>void;stopDictation:()=>void;startDay:()=>void},enqueue:vi.fn(),stop:vi.fn(),prime:vi.fn()}));
vi.mock('react-dom',()=>({createPortal:(children:unknown)=>children}));
vi.mock('react',async original=>({...await original<typeof import('react')>(),useEffect:(f:()=>unknown)=>m.effects.push(f),useState:(v:unknown)=>[v,vi.fn()],useRef:(v:unknown)=>({current:v}),useImperativeHandle:(_ref:unknown,f:()=>typeof m.handle)=>{m.handle=f();}}));
vi.mock('@/lib/client/answer-speaker',()=>({AnswerSpeaker:class{enqueue=m.enqueue;stop=m.stop;prime=m.prime;}}));
import LearningVoice from './LearningVoice';
function nodes(v:unknown):React.ReactElement<Record<string,any>>[]{if(Array.isArray(v))return v.flatMap(nodes);if(!React.isValidElement(v))return [];const e=v as React.ReactElement<Record<string,any>>;return [e,...nodes(e.props.children)];}
let recog:any;
class Recognition{lang='';onresult:any;onend:any;onerror:any;start=vi.fn();abort=vi.fn();constructor(){recog=this;}}
beforeEach(()=>{vi.clearAllMocks();m.effects=[];vi.stubGlobal('React',React);vi.stubGlobal('window',{SpeechRecognition:Recognition});vi.stubGlobal('document',{hidden:false,addEventListener:vi.fn(),removeEventListener:vi.fn()});vi.stubGlobal('navigator',{mediaDevices:{addEventListener:vi.fn(),removeEventListener:vi.fn()}});});
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
it('moves the existing stop handler into the V4 answer target without static tutor guidance',()=>{
 const onActiveChange=vi.fn();
 const tree=nodes(LearningVoice({language:'ko',lessonId:'001',lessonTitle:'Original lesson title',lessonText:'lesson',answerText:'',draft:'',disabled:false,onTranscript:vi.fn(),onActiveChange,compact:true,controlsTarget:{} as HTMLElement}));
 m.effects.map(f=>f());
 expect(tree.some(n=>n.type==='strong'||n.type==='small')).toBe(false);
 expect(tree.some(n=>n.type==='span'&&n.props.role==='status')).toBe(false);
 tree.find(n=>n.type==='button'&&n.props.children==='스톱')!.props.onClick();
 expect(m.stop).toHaveBeenCalled();expect(onActiveChange).toHaveBeenCalledWith(false);
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
