const text={
 purpose:["1. What kind of room would you like?","1. 어떤 방을 만들까요?"],
 search:["Search 60 room ideas","60개 방 용도 검색"],
 custom:["Something else — describe your own","목록에 없는 용도 직접 입력"],
 task:["What would you like to do in this room?","이 방에서 무엇을 하고 싶으세요?"],
 design:["2. Name and design","2. 방 이름과 디자인"],
 name:["Room name","방 이름"],
 payment:["3. Review and payment","3. 내용 확인 및 결제"],
 settings:["Additional settings","추가 설정"],
 next:["Next","다음"],
 empty:["No match. Describe any purpose below.","일치하는 용도가 없으면 아래에 직접 적어 주세요."],
 trial:["Owner testing and bank transfer","소유자 시험 및 은행 송금"],
 preview:["Preview: card payment is available only when the server confirms its setup. No successful payment is assumed.","시험판입니다. 서버에서 준비가 확인된 경우에만 카드 결제를 진행할 수 있습니다."],
 more:["More rooms","다른 방 보기"],
} as const;
export function roomFlowText(key:keyof typeof text,language:string){const value=text[key];return language.startsWith("ko")?value[1]:value[0];}
