import { roomPurposes, changePurpose, type RoomDraftInput } from "./room-draft";
import { roomTemplates } from "./templates";
const categories: [string, RegExp, string[]][] = [
 ["legal",/법률|변호|법무|\blaw\b|legal|lawyer/i,["legal","library"]],
 ["accounting",/회계|세무|장부|accounting|bookkeep|tax/i,["finance","office"]],
 ["education",/공부|교육|학습|영어|학교|teach|learn|school|education/i,["library","creative","studio"]],
 ["retail",/쇼핑|판매|상점|쇼핑몰|shop|retail|store/i,["creative","modern"]],
 ["medical",/병원|의료|진료|clinic|medical|dental/i,["calm","white","modern"]],
 ["technology",/개발|소프트웨어|코딩|software|coding|technology/i,["tech","future"]],
 ["business",/회사|고객|사업|업무|business|company|customer/i,["office","executive"]],
];
export function recommendPurpose(brief:string) { return categories.find(([,pattern])=>pattern.test(brief))?.[0] || "custom"; }
export function recommendedDesigns(purpose:string) {
 const words=categories.find(([id])=>id===purpose)?.[2] || ["office","studio"];
 const score=(t:typeof roomTemplates[number])=>words.reduce((n,w)=>n+(JSON.stringify(t).toLowerCase().includes(w)?1:0),0);
 return [...roomTemplates].sort((a,b)=>score(b)-score(a)).slice(0,3);
}
// Suggestions select existing task requests only, never additional paid services.
export function applyRoomBrief(input:RoomDraftInput, brief:string):RoomDraftInput {
 const id=recommendPurpose(brief), purpose=roomPurposes.find(p=>p.id===id)!;
 if(input.purpose===id && input.brief !== undefined) return {...input,brief,answers:id==="custom"?{purpose:brief.trim()?[brief]:[]}:input.answers};
 return {...changePurpose(input,id),brief,
  answers:id==="custom"&&brief.trim()?{purpose:[brief]}:{},
  tasks:[...purpose.suggestedAgents],templateId:recommendedDesigns(id)[0].id};
}
