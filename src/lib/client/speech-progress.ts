/** Playback timing only; never estimates words or advances learning records. */
export type SpeechProgress={elapsed:number;duration:number|null};
export type SpeechBlock={start:number;duration:number};
export function pcmPlaybackProgress(blocks:readonly SpeechBlock[],now:number,complete:boolean):SpeechProgress{
 const duration=blocks.reduce((sum,block)=>sum+block.duration,0);
 const elapsed=blocks.reduce((sum,block)=>sum+Math.max(0,Math.min(block.duration,now-block.start)),0);
 return {elapsed,duration:complete&&duration>0?duration:null};
}
export function speechProgressRatio(progress:SpeechProgress|null){
 if(!progress||!progress.duration||!Number.isFinite(progress.duration)||!Number.isFinite(progress.elapsed))return 0;
 return Math.max(0,Math.min(1,progress.elapsed/progress.duration));
}
/** Sentence-level rewind from an approximate text position, not word alignment. */
export function resumeSentenceOffset(text:string,fraction:number){
 const position=Math.floor(text.length*Math.max(0,Math.min(1,fraction))),starts=[0];
 for(const match of text.matchAll(/(?:[.!?。！？।][ \t]*|\n+)\s*/gu))starts.push(match.index+match[0].length);
 let index=0;while(index+1<starts.length&&starts[index+1]<=position)index++;
 return starts[Math.max(0,index-1)];
}
