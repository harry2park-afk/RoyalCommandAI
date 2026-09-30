import React from 'react';
import {expect,it,vi} from 'vitest';
vi.mock('react',async original=>({...await original<typeof import('react')>(),useRef:()=>({current:null})}));
import LearningLessonList from './LearningLessonList';
function nodes(v:unknown):React.ReactElement<Record<string,any>>[]{if(Array.isArray(v))return v.flatMap(nodes);if(!React.isValidElement(v))return [];const e=v as React.ReactElement<Record<string,any>>;return [e,...nodes(e.props.children)];}
it('opens only from the list button, renders number and title, closes before starting each lesson',()=>{
 vi.stubGlobal('React',React);const onStart=vi.fn(),showModal=vi.fn(),close=vi.fn();const titles=Array.from({length:60},(_,i)=>`제목 ${i+1}`);const tree=nodes(LearningLessonList({language:'ko',titles,selected:27,completed:[1],disabled:false,onStart}));
 const dialog=tree.find(n=>n.type==='dialog')!;expect(dialog.props.open).toBeUndefined();dialog.props.ref.current={showModal,close};
 const buttons=tree.filter(n=>n.type==='button');buttons[0].props.onClick();expect(showModal).toHaveBeenCalledOnce();buttons[1].props.onClick();expect(close).toHaveBeenCalledOnce();
 const rows=buttons.slice(2);expect(rows).toHaveLength(60);rows.forEach((b,i)=>{expect(nodes(b).find(n=>n.type==='strong')?.props.children).toBe(titles[i]);b.props.onClick();expect(onStart).toHaveBeenLastCalledWith(i+1);expect(close.mock.invocationCallOrder.at(-1)).toBeLessThan(onStart.mock.invocationCallOrder.at(-1)!);});expect(rows[26].props['aria-pressed']).toBe(true);
});
