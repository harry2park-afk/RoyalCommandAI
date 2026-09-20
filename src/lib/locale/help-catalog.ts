import { creationMessages } from "./rcv3-creation";
import { ROOM_TEMPLATES } from "@/lib/rooms/templates";
export type HelpEntry = {en:string;ko?:string};
// Public product guidance only. Never register customer text, messages, files,
// contacts or contract bodies here. The translation API accepts these IDs only.
export const helpCatalog: Record<string,HelpEntry> = {
 roomName:{en:"Give your room a name, such as My Office.",ko:"My Office처럼 방 이름을 정해 주세요."},
 purpose:{en:"Choose what you will use this room for. The questions below will change to match.",ko:"방의 사용목적을 선택하세요. 아래 질문이 목적에 맞게 바뀝니다."},
 chooseOptions:{en:"Choose any that apply. You can leave this blank.",ko:"해당하는 항목을 선택하세요. 비워 두어도 됩니다."},
 customPurpose:{en:"In a few words, tell us what you want help with.",ko:"어떤 도움을 원하는지 간단히 적어 주세요."},
 tasks:{en:"Choose the jobs you want your AI to help with.",ko:"AI의 도움을 받을 업무를 선택하세요."},
 ai:{en:"Choose your AI. Open More AI options to change the selection.",ko:"사용할 AI를 선택하세요. 선택을 바꾸려면 More AI options를 여세요."},
 secretary:{en:"Add a secretary to help with email, calls and daily tasks.",ko:"이메일·전화·일상 업무를 도와줄 비서를 추가하세요."},
 email:{en:"Enter your email address. You will connect your own account separately.",ko:"본인 이메일 주소를 입력하세요. 계정 연결은 별도로 진행합니다."},
 phone:{en:"Enter the number for your secretary, including the country code, such as +61. Phone service must be verified separately.",ko:"+61 같은 국가번호를 포함해 비서가 사용할 전화번호를 입력하세요. 전화 서비스는 별도 확인이 필요합니다."},
 design:{en:"Choose the look of your room. This does not change your services.",ko:"방의 디자인을 선택하세요. 선택한 서비스는 바뀌지 않습니다."},
 saved:{en:"Saved forms are kept here so you can finish them later.",ko:"저장한 폼을 나중에 이어서 작성할 수 있습니다."},
 dashboard:{en:"Choose a room to open, or use Create Room to make a new one.",ko:"기존 방을 선택하거나 Create Room으로 새 방을 만드세요."},
 profile:{en:"Your saved account details are shown here. Add only what is missing.",ko:"계정에 저장된 정보입니다. 빠진 항목만 추가하세요."},
 workspace:{en:"Select an AI, then type your message. Use Files for your documents.",ko:"AI를 선택하고 메시지를 입력하세요. 문서는 Files에서 관리합니다."},
 country:{en:"Choose your country for local services and pricing. Your language is a separate setting.",ko:"서비스와 요금에 적용할 국가를 선택하세요. 언어는 별도 설정입니다."},
 services:{en:"Choose only the services you need.",ko:"필요한 서비스만 선택하세요."},
 selectedServices:{en:"Your selected services stay saved when you browse other categories.",ko:"다른 분류를 살펴봐도 선택한 서비스는 유지됩니다."},
 ...Object.fromEntries(Object.entries(creationMessages).map(([key,value])=>[`creation.${key}`,value])),
 ...Object.fromEntries(ROOM_TEMPLATES.map(p=>[`purpose.${p.id}`,{en:p.shortDescription}])),
 "purpose.custom":{en:"For personal tasks or another purpose.",ko:"개인 업무나 다른 용도로 사용할 방입니다."},
 "purpose.legal":{en:"For legal enquiries, documents and appointments.",ko:"법률 문의·서류·상담 일정을 관리할 방입니다."},
 "purpose.accounting":{en:"For bookkeeping, tax documents and accounts.",ko:"장부·세금 서류·회계 업무를 관리할 방입니다."},
};
export function findHelp(key:string):HelpEntry|undefined {
 return Object.prototype.hasOwnProperty.call(helpCatalog,key)?helpCatalog[key]:undefined;
}
export function accountHelpLanguage(value:unknown) {
 if(typeof value!=="string"||value.length>35)throw new Error("HELP_LANGUAGE");
 try {return Intl.getCanonicalLocales(value)[0]||"en";}catch{throw new Error("HELP_LANGUAGE");}
}
