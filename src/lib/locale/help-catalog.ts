import { creationMessages } from "./rcv3-creation";
import { ROOM_TEMPLATES } from "@/lib/rooms/templates";
export type HelpEntry = {en:string;ko?:string};
// Public product guidance only. Never register customer text, messages, files,
// contacts or contract bodies here. The translation API accepts these IDs only.
export const helpCatalog: Record<string,HelpEntry> = {
 mobileInstall:{en:"Android: open RC in Chrome and choose Install RC when available, or use Add to Home screen in the browser menu. iPhone: open RC in Safari, then Share → Add to Home Screen. Sign in with your existing RC account.",ko:"안드로이드: Chrome에서 RC를 열고 Install RC를 누르거나 브라우저 메뉴의 홈 화면에 추가를 선택하세요. 아이폰: Safari에서 RC를 열고 공유 → 홈 화면에 추가를 선택하세요. 기존 RC 계정으로 로그인하세요."},
 mobileOnline:{en:"Your rooms and history stay in your RC account. An internet connection is needed for AI, email and calls. Installing RC does not enable background phone answering.",ko:"룸과 대화 기록은 기존 RC 계정에 유지됩니다. AI·이메일·전화에는 인터넷 연결이 필요합니다. RC를 설치하는 것만으로 백그라운드 전화 수신이 활성화되지는 않습니다."},
 mobileInstallFailed:{en:"Installation did not finish. Use Add to Home screen in your browser menu, or keep using RC in the browser.",ko:"설치를 완료하지 못했습니다. 브라우저 메뉴의 홈 화면에 추가를 사용하거나 브라우저에서 RC를 계속 사용하세요."},
 setupAI:{en:"ChatGPT is selected to start. Use RC AI, or connect your own supported API account.",ko:"처음에는 ChatGPT가 선택됩니다. RC AI를 사용하거나 지원되는 본인 API 계정을 연결하세요."},
 setupPersonalAI:{en:"Use an API key from your own AI account. ChatGPT subscriptions and API billing are separate. Never enter your password here.",ko:"본인 AI 계정의 API 키를 사용하세요. ChatGPT 구독과 API 요금은 별도입니다. 로그인 비밀번호는 입력하지 마세요."},
 setupPersonalConnected:{en:"Your API connection was verified. We check it again before payment.",ko:"본인 API 연결을 확인했습니다. 결제 전에 다시 확인합니다."},
 setupPersonalNeeded:{en:"Connect your own API account before continuing.",ko:"계속하려면 본인 API 계정을 연결하세요."},
 setupPlatformAvailable:{en:"Available through RC. We check the connection before payment.",ko:"RC를 통해 사용할 수 있습니다. 결제 전에 연결을 확인합니다."},
 setupPersonalUnavailable:{en:"Personal API connections are not available yet. You can use the available RC AI.",ko:"개인 API 연결은 아직 준비되지 않았습니다. 사용 가능한 RC AI를 선택할 수 있습니다."},
 setupAIUnavailable:{en:"This AI is not connected. Choose an available AI or connect your own supported account.",ko:"이 AI는 연결되지 않았습니다. 사용 가능한 AI나 본인의 지원 계정을 선택하세요."},
 setupChecking:{en:"Checking connection…",ko:"연결 확인 중…"},
 setupAIError:{en:"Could not verify your AI account. Check the API key and API balance, then retry.",ko:"AI 계정을 확인하지 못했습니다. API 키와 API 잔액을 확인한 뒤 다시 시도하세요."},
 setupError:{en:"Could not finish this connection. Your form is kept. Please retry.",ko:"연결을 완료하지 못했습니다. 폼은 유지됩니다. 다시 시도하세요."},
 setupVerified:{en:"Your connection is verified.",ko:"본인 계정 연결을 확인했습니다."},
 setupEmail:{en:"Your sign-up email is filled in for you. Authorise your own Gmail account to let your secretary read it.",ko:"가입 이메일이 자동 입력됩니다. 비서가 메일을 읽을 수 있도록 본인의 Gmail을 인증하세요."},
 setupMailConnected:{en:"Verified Gmail account:",ko:"확인된 Gmail 계정:"},
 setupMailNeeded:{en:"Gmail needs your permission. Connect your account, then return to this form.",ko:"Gmail 사용 권한이 필요합니다. 본인 계정을 연결한 뒤 이 폼으로 돌아오세요."},
 setupContactPhone:{en:"Your contact number, if needed. This does not buy or connect a secretary phone line.",ko:"필요한 경우 본인 연락처를 입력하세요. 비서 전화번호의 구매나 연결을 의미하지 않습니다."},
 setupPhone:{en:"Your country determines the recommended phone provider. Buy your number directly from that provider using your own account. Phone charges are separate from RC fees.",ko:"선택한 국가에 맞는 통신사를 안내합니다. 본인 계정으로 통신사에서 직접 번호를 구매하세요. 전화 요금은 RC 이용료와 별도입니다."},
 setupCarrierBilling:{en:"Opens a new tab. Register with your own email, billing address and payment method. The phone company bills you directly; RC does not collect your phone charges.",ko:"새 탭이 열립니다. 고객 본인의 이메일·청구 주소·결제수단으로 가입하세요. 전화 요금은 통신사가 고객에게 직접 청구하며 RC가 받지 않습니다."},
 setupCarrierAccount:{en:"After buying your number, connect your own Twilio account here. Account details stay private and are never copied to another customer.",ko:"번호를 구매한 뒤 본인의 Twilio 계정을 연결하세요. 계정 정보는 비공개로 보관하며 다른 고객에게 복사하지 않습니다."},
 setupOwnedNumbersEmpty:{en:"No voice numbers were found in your account. Buy a voice number from your provider, then refresh this list.",ko:"계정에서 음성 통화 번호를 찾지 못했습니다. 통신사에서 번호를 구매한 뒤 목록을 새로고침하세요."},
 setupPhoneRoutingPending:{en:"Your account can be verified, but RC phone routing is not ready yet. Payment for this setup stays unavailable until routing is ready.",ko:"계정 확인은 가능하지만 RC 전화 수신 연결은 아직 준비되지 않았습니다. 연결 준비 전에는 이 구성으로 결제할 수 없습니다."},
 setupPhoneConsent:{en:"After RC payment, connect this number's incoming calls to my RC secretary. This replaces its current incoming-call destination. My phone provider continues to bill me directly.",ko:"RC 결제 후 이 번호의 수신 전화를 내 RC 비서에 연결하는 데 동의합니다. 기존 수신 목적지가 변경됩니다. 전화 요금은 통신사가 계속 본인에게 직접 청구합니다."},
 setupPhoneAccountError:{en:"Could not verify your phone account. Check your account details and retry. No number has been purchased by RC.",ko:"전화 계정을 확인하지 못했습니다. 계정 정보를 확인한 뒤 다시 시도하세요. RC가 번호를 구매하지 않았습니다."},
 setupPhoneConnectionPending:{en:"Buying a number does not connect it to RC. Automatic connection of customer-owned phone accounts is not ready yet. Keep this service off to continue with an AI room.",ko:"번호 구매만으로 RC에 연결되지는 않습니다. 고객 명의 전화 계정의 자동 연결은 아직 준비되지 않았습니다. AI 방을 먼저 사용하려면 전화 서비스를 해제하세요."},
 setupPhoneUnavailable:{en:"Phone connection is not ready for this country yet. No number has been purchased or connected by RC.",ko:"이 국가의 전화 연결은 아직 준비되지 않았습니다. RC가 번호를 구매하거나 연결하지 않았습니다."},
 setupPhoneSelection:{en:"Selecting a number does not buy or connect it. Buy it from the phone provider; RC must verify its connection before activation.",ko:"번호 선택만으로 구매되거나 연결되지 않습니다. 통신사에서 직접 구매한 뒤 RC 연결 확인이 필요합니다."},
 setupNoNumbers:{en:"No matching numbers are currently available. Try another area code.",ko:"현재 조건에 맞는 번호가 없습니다. 다른 지역번호로 검색하세요."},
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
