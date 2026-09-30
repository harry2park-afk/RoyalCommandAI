export type TeachingSegment={lesson:string;text:string;paragraph:number};
export function teachingStopCommand(text:string){return /^(?:오늘은?\s*그만\s*하자|오늘은?\s*그만|그만(?:해|하자)|스톱|정지|멈춰|stop(?: for today)?|that's enough(?: for today)?|今日はここまで|停止|今天到这里|आज बस)[.!?。\s]*$/i.test(text.trim());}
/** Sequential teaching; cursor means the current paragraph, never assessment completion. */
export class LearningDayPlayer{
 private generation=0;private abort?:AbortController;
 constructor(private ports:{speak:(text:string,signal:AbortSignal)=>Promise<void>;stopAudio:()=>void;segment:(index:number,part:TeachingSegment)=>void;done:()=>void;error:()=>void}){}
 stop(){this.generation++;this.abort?.abort();this.ports.stopAudio();}
 async start(parts:readonly TeachingSegment[],index=0){
  this.stop();const generation=this.generation;this.abort=new AbortController();
  try{for(let i=index;i<parts.length;i++){
   if(generation!==this.generation)return;
   this.ports.segment(i,parts[i]);
   await this.ports.speak(parts[i].text,AbortSignal.any([this.abort.signal,AbortSignal.timeout(180000)]));
  }if(generation===this.generation)this.ports.done();}catch{if(generation===this.generation){this.stop();this.ports.error();}}
 }
}
export function teachingParagraphs(lesson:string,text:string):TeachingSegment[]{return text.split(/\n\s*\n/).filter(p=>p.trim()).flatMap(p=>{const chunks:TeachingSegment[]=[];for(let offset=0;offset<p.length;offset+=3000)chunks.push({lesson,text:p.slice(offset,offset+3000),paragraph:0});return chunks;}).map((p,paragraph)=>({...p,paragraph}));}
