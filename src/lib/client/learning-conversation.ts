export type ConversationPhase='idle'|'listening'|'thinking'|'speaking'|'error';
type Recognition={start():void;cancel():void};
type Options={
 listen:(onText:(text:string)=>void,onEnd:()=>void,onError:()=>void)=>Recognition;
 ask:(text:string,signal:AbortSignal)=>Promise<string>;
 speak:(text:string,signal:AbortSignal)=>Promise<void>;
 stopAudio:()=>void;phase:(value:ConversationPhase)=>void;draft:(text:string)=>void;
 silenceMs?:number;
};
/** Course-neutral turn-taking. No grading, purchasing or progress mutations. */
export class LearningConversation{
 private generation=0;private active=false;private recognition?:Recognition;private timer?:ReturnType<typeof setTimeout>;private abort?:AbortController;private text='';
 constructor(private options:Options){}
 start(openingQuestion?:string){this.stop(false);this.active=true;if(openingQuestion?.trim()){this.text=openingQuestion.slice(0,2000);void this.turn(this.generation);}else this.listen();}
 stop(notify=true){this.active=false;this.generation++;clearTimeout(this.timer);this.recognition?.cancel();this.recognition=undefined;this.abort?.abort();this.options.stopAudio();if(notify)this.options.phase('idle');}
 private fail(){this.stop();this.options.phase('error');}
 private listen(){
  if(!this.active)return;const generation=++this.generation;this.text='';this.options.phase('listening');
  const finish=()=>{if(!this.active||generation!==this.generation)return;if(this.text.trim())void this.turn(generation);else this.fail();};
  try{this.recognition=this.options.listen(text=>{if(!this.active||generation!==this.generation)return;this.text=text.slice(0,2000);this.options.draft(this.text);clearTimeout(this.timer);this.timer=setTimeout(finish,this.options.silenceMs??3000);},finish,()=>{if(this.active&&generation===this.generation)this.fail();});this.recognition.start();}catch{this.fail();}
 }
 private async turn(generation:number){
  if(!this.active||generation!==this.generation)return;
  this.generation++;const turn= this.generation;clearTimeout(this.timer);this.recognition?.cancel();this.recognition=undefined;
  const text=this.text.trim();if(/^(stop|end conversation|음성 중지|대화 종료|停止|終了|रोकें)[.!?。\s]*$/i.test(text)){this.stop();return;}
  this.abort=new AbortController();const signal=AbortSignal.any([this.abort.signal,AbortSignal.timeout(65000)]);
  this.options.phase('thinking');
  try{const answer=await this.options.ask(text,signal);if(!this.active||turn!==this.generation)return;if(!answer.trim())throw Error('EMPTY');this.options.phase('speaking');await this.options.speak(answer,AbortSignal.any([this.abort.signal,AbortSignal.timeout(120000)]));if(this.active&&turn===this.generation)this.listen();}catch{if(this.active&&turn===this.generation)this.fail();}
 }
}
