import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({index:0,values:[] as unknown[],changes:[] as unknown[][]}));
vi.mock('react',async original=>({...await original<typeof import('react')>(),useEffect:()=>{},useRef:(v:unknown)=>({current:v}),useState:()=>{const i=m.index++;return [m.values[i],(v:unknown)=>m.changes.push([i,v])];}}));
vi.mock('@/components/help/HelpText',()=>({default:()=>null}));
import LearningRoom from './LearningRoom';
import {sourceDay} from '@/lib/rcv3/learning/groups';
import {lessons} from '@/lib/rcv3/learning/course';
function nodes(v:unknown):React.ReactElement<Record<string,any>>[]{if(Array.isArray(v))return v.flatMap(nodes);if(!React.isValidElement(v))return [];const e=v as React.ReactElement<Record<string,any>>;return [e,...nodes(e.props.children)];}
function render(unit:number,completed:string[],work={},language='ko',entryPath:'/rcv3/learn'|'/rcv4/learn'='/rcv3/learn',message=''){m.index=0;m.values=[{completed,certificate:null,work},[],sourceDay(lessons[unit].id),'',0,0,true,false,unit,[],message,null,false,true,'','',null,{},null];return nodes(LearningRoom({language,ownerId:'alice',entryPath}));}
beforeEach(()=>{vi.unstubAllGlobals();m.changes=[];vi.stubGlobal('React',React);vi.stubGlobal('requestAnimationFrame',vi.fn());});
it('moves a completed lesson to the next day without marking another lesson complete',()=>{const n=render(3,['004']);const b=n.find(e=>e.type==='button'&&e.props.children==='다음 과목')!;expect(b.props.disabled).toBe(false);b.props.onClick();expect(m.changes).toContainEqual([2,2]);expect(m.changes).toContainEqual([8,4]);expect(m.changes.some(([i])=>i===0)).toBe(false);});
it('does not offer next-completion controls before completion or after lesson 100',()=>{for(const [unit,completed] of [[0,[]],[99,['100']]] as const){expect(render(unit,[...completed]).some(e=>e.type==='button'&&e.props.children==='다음 과목')).toBe(false);}});
it('shows revision status from server work and saves input under the current account',()=>{const setItem=vi.fn();vi.stubGlobal('window',{localStorage:{getItem:()=>null,setItem}});const n=render(50,[],{'051':{score:60,feedback:'Revise',artifact:'Old'}});expect(n.some(e=>e.type==='strong'&&Array.isArray(e.props.children)&&e.props.children[0]==='수정 필요 · 보완 후 다시 제출하세요')).toBe(true);n.find(e=>e.type==='textarea'&&e.props.maxLength===6000)!.props.onChange({target:{value:'New draft'}});expect(setItem).toHaveBeenCalledWith('rc-learning-draft:alice:ai-literacy-100-v1:051',JSON.stringify({message:'',artifact:'New draft'}));});

it('renders Korean lesson text directly without an English-first translate button',()=>{const html=renderToStaticMarkup(render(0,[])[0]);expect(html).toContain('AI 교육방');expect(html).toContain('AI 역사: 규칙 기반에서 오늘의 AI까지');expect(html).not.toContain('Learn with AI');expect(html).not.toContain('Translate');expect(html).not.toContain('PAID COURSE');});
it('renders each requested language and restores English-only course labels',()=>{for(const [language,title] of [['en','AI Learning Room'],['ja','AI学習ルーム'],['zh','AI学习室'],['hi','AI शिक्षण कक्ष']]){const html=renderToStaticMarkup(render(0,[],{},language)[0]);expect(html).toContain(title);expect(html).not.toContain('AI 교육방');expect(html).not.toContain('AI 역사: 규칙 기반에서 오늘의 AI까지');}});

it('changes country or language in place without clearing progress, drafts or conversation',()=>{
 const replaceState=vi.fn();vi.stubGlobal('window',{history:{state:{},replaceState}});
 const n=render(50,[],{'051':{score:60,feedback:'Keep',artifact:'Keep'}});
 const region=n.find(e=>typeof e.type==='function'&&e.type.name==='LearningRegion')!;
 region.props.onChange('ko','AU');
 expect(replaceState).toHaveBeenLastCalledWith({},'', '/rcv3/learn?language=ko&country=AU');
 expect(m.changes.every(([i])=>Number(i)>=22)).toBe(true);
 region.props.onChange('en','AU');
 expect(replaceState).toHaveBeenLastCalledWith({},'', '/rcv3/learn?language=en&country=AU');
});

it('reuses the V4 toolbox send control inside the input without visible chat headings',()=>{
 const n=render(0,[],{},'ko','/rcv4/learn');
 const send=n.find(e=>e.props.toolId==='send')!;
 expect(send.props.disabled).toBe(true);
 expect(n.find(e=>e.type==='textarea'&&e.props.maxLength===2000)?.props['aria-label']).toBeTruthy();
 const html=renderToStaticMarkup(n[0]);
 expect(html).not.toContain('튜터와 말하고 글로 대화하기');
 expect(html).not.toContain('>질문 또는 실습 답변<');
 expect(html).toContain('data-rc-tool="send"');
});

it('sends one V4 typed request, persists its answer, and clears only the successful draft',async()=>{
 const setItem=vi.fn();vi.stubGlobal('window',{localStorage:{setItem}});
 const fetch=vi.fn<(url:unknown,init:RequestInit)=>Promise<{ok:boolean;json:()=>Promise<{answer:string}>}>>().mockResolvedValue({ok:true,json:async()=>({answer:'Tutor answer'})});vi.stubGlobal('fetch',fetch);
 const send=render(0,[],{},'ko','/rcv4/learn','My question').find(e=>e.props.toolId==='send')!;
 send.props.onClick();send.props.onClick();
 await vi.waitFor(()=>expect(m.changes).toContainEqual([10,'']));
 expect(fetch).toHaveBeenCalledTimes(1);
 expect(JSON.parse(String(fetch.mock.calls[0][1].body))).toMatchObject({action:'chat',lesson:'001',language:'ko',message:'My question'});
 expect(m.changes).toContainEqual([9,[{role:'user',content:'My question'},{role:'assistant',content:'Tutor answer'}]]);
 expect(setItem).toHaveBeenCalledWith('rc-learning-draft:alice:ai-literacy-100-v1:001',JSON.stringify({message:'',artifact:''}));
});

it('preserves the V4 typed draft and releases busy state when sending fails',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,json:async()=>({code:'RCV3_LIMIT'})})));
 render(0,[],{},'ko','/rcv4/learn','Keep my draft').find(e=>e.props.toolId==='send')!.props.onClick();
 await vi.waitFor(()=>expect(m.changes).toContainEqual([12,false]));
 expect(m.changes.some(([i,v])=>i===14&&Boolean(v))).toBe(true);
 expect(m.changes.some(([i])=>i===9||i===10)).toBe(false);
});
