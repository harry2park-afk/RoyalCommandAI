/** Only explicit navigation commands change lessons; ordinary numbered questions stay questions. */
export type LearningVoiceCommand={kind:'lesson';number:number}|{kind:'next'}|{kind:'read'}|{kind:'repeat'};
export function learningVoiceCommand(input:string):LearningVoiceCommand|null{
 const text=input.normalize('NFKC').trim().toLowerCase().replace(/[.!?。！？]+$/g,'');
 if(/^(?:다음\s*(?:수업|과목|강의)(?:으로)?(?:\s*(?:가자|가줘|넘어가|시작해|시작해 줘))?|next lesson(?: please)?|次の授業|下一课|अगला पाठ)$/.test(text))return {kind:'next'};
 if(/^(?:그냥\s*)?(?:읽어\s*줘(?:요)?|읽어주세요|수업\s*읽어\s*줘|read (?:it|the lesson)(?: aloud)?(?: please)?|読んで|朗读|पढ़कर सुनाओ)$/.test(text))return {kind:'read'};
 if(/^(?:다시\s*(?:말해|들려)\s*줘(?:요)?|repeat(?: that)?(?: please)?|もう一度|再说一遍|फिर से सुनाओ)$/.test(text))return {kind:'repeat'};
 const numbered=text.match(/^(?:(?:오늘\s*)?(?:(?:과목|수업|강의)\s*)?(\d+|일|이|삼|사|오|육|칠|팔|구|십)\s*(?:번|강|과)(?:\s*(?:수업|과목|강의))?\s*(?:공부하자|공부해|시작(?:하자|해(?:\s*줘(?:요)?)?|해요|해주세요)|가르쳐\s*줘(?:요)?|배우자)|(?:let's (?:study|start)|start|study|open)\s+(?:lesson|class)\s+(\d+)(?: please)?|(?:第)?(\d+)(?:課|课)(?:を始めて|を勉強しよう|开始|开始学习)|(?:पाठ)\s*(\d+)\s*शुरू करो)$/);
 if(!numbered)return null;
 const value=numbered.slice(1).find(Boolean)!;const korean=['','일','이','삼','사','오','육','칠','팔','구','십'];
 return {kind:'lesson',number:/^\d+$/.test(value)?Number(value):korean.indexOf(value)};
}
export function voiceLessonIndex(command:LearningVoiceCommand,current:number,count:number){
 const index=command.kind==='lesson'?command.number-1:command.kind==='next'?current+1:current;
 return Number.isSafeInteger(index)&&index>=0&&index<count?index:null;
}
