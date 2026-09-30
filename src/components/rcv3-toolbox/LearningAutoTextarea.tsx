'use client';
import {useLayoutEffect,useRef,type TextareaHTMLAttributes} from 'react';

/** Shared content sizing for typed and dictated learning drafts; never changes the value. */
export default function LearningAutoTextarea(props:TextareaHTMLAttributes<HTMLTextAreaElement>){
 const field=useRef<HTMLTextAreaElement|null>(null);
 function fit(){
  const el=field.current;if(!el)return;
  const css=getComputedStyle(el),minimum=parseFloat(css.minHeight)||72,maximum=parseFloat(css.maxHeight)||220;
  el.style.height='0px';
  const height=el.scrollHeight+(parseFloat(css.borderTopWidth)||0)+(parseFloat(css.borderBottomWidth)||0);
  el.style.height=`${Math.max(minimum,Math.min(maximum,height))}px`;
 }
 useLayoutEffect(()=>{fit();},[props.value]);
 useLayoutEffect(()=>{
  const el=field.current;if(!el)return;
  let width=el.getBoundingClientRect().width;
  const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(()=>{
   const next=el.getBoundingClientRect().width;if(next!==width){width=next;fit();}
  });
  observer?.observe(el);window.addEventListener('resize',fit);
  return()=>{observer?.disconnect();window.removeEventListener('resize',fit);};
 },[]);
 return <textarea {...props} ref={field}/>;
}
