// RC V3 shared tool warehouse.
// Every tool must carry its manual with the reusable definition. A visual button
// without a manual is not allowed into the warehouse.
const install='Toolbox에서 Place를 누르면 창고가 닫힙니다. 반투명 버튼 그림자를 원하는 빈 위치로 이동한 뒤 한 번 클릭하세요. 필요하면 Edit Buttons에서 모양을 조정하고 Save를 눌러 고정합니다.';
const manual=(use,requires)=>Object.freeze({
  purpose:use,
  use,
  requirements:requires,
  install,
  save:'배치·크기·색상·위치 변경은 Save를 눌러 서버 저장이 확인되어야 고정됩니다.',
  duplicate:'같은 Tool은 한 Room에 하나만 설치합니다.',
});
const entries = /** @type {const} */ ([
  {id:'chat',label:'My AI',description:'Open this room’s AI conversation.',requires:'Select an available AI before sending.',manual:manual('질문을 입력하고 선택된 AI와 대화하는 기본 버튼입니다.','사용 가능한 AI가 하나 이상 선택되어 있어야 합니다.'),source:'src/app/rcv3/Room.tsx'},
  {id:'secretary',label:'Katie',description:'Open your secretary with this room’s own connections.',requires:'Secretary access and your own account connections.',manual:manual('이 Room에 연결된 개인 비서 Katie를 엽니다.','비서 이용권과 고객 본인의 계정 연결이 필요합니다.'),source:'src/app/rcv3/Room.tsx'},
  {id:'files',label:'Files',description:'Open the text files saved in this room.',requires:'Access to this room.',manual:manual('이 Room에 저장한 TXT, MD, CSV 파일 목록을 열어 사용합니다.','해당 Room 접근 권한이 필요합니다.'),source:'src/app/rcv3/Room.tsx'},
  {id:'ai-list',label:'AI List',description:'Choose and arrange the AIs used by this room.',requires:'An available provider and the room’s existing usage allowance.',manual:manual('Room에서 사용할 AI를 선택하고 순서를 정합니다.','사용 가능한 AI Provider와 이용 한도가 필요합니다.'),source:'src/app/rcv3/Room.tsx'},
  {id:'personal-ai',label:'My AI account',description:'Open the existing list of external AI websites in a new tab.',requires:'Sign in to your own account on the external website.',manual:manual('고객 본인의 외부 AI 계정으로 이동하는 목록을 엽니다.','각 외부 서비스에 고객 본인이 로그인해야 합니다.'),source:'src/app/rcv3/PersonalAI.tsx'},
  {id:'microphone',label:'Microphone',description:'Use the existing microphone to write in the message box.',requires:'Microphone permission and the existing audio service.',manual:manual('마이크 음성을 받아쓰기하여 메시지 입력창에 글로 넣습니다.','브라우저 마이크 권한과 음성 서비스가 필요합니다.'),source:'rcv3/voice-control.mjs'},
  {id:'send',label:'Send',description:'Send the current message using this room’s selected AIs.',requires:'A message, selected AI and available usage allowance.',manual:manual('현재 입력한 메시지를 선택된 AI에게 보냅니다.','메시지, 선택된 AI, 사용 가능한 이용 한도가 필요합니다.'),source:'src/app/rcv3/Room.tsx'},
  {id:'speaker',label:'Speaker',description:'Turn the most recent answer’s existing speaker on or off.',requires:'An AI answer and the existing audio service.',manual:manual('AI 답변을 음성으로 읽거나 중지합니다.','AI 답변과 음성 서비스가 필요합니다.'),source:'src/app/rcv3/AnswerCards.tsx'},
  {id:'copy-answer',label:'Copy',description:'Copy the most recent AI answer to your clipboard.',requires:'An AI answer and browser clipboard permission.',manual:manual('최근 AI 답변을 클립보드에 복사합니다.','복사할 AI 답변과 브라우저 클립보드 권한이 필요합니다.'),source:'src/components/rcv3-toolbox/CopyText.tsx'},
  {id:'helper',label:'AI Helper',description:'Open help for this room and its tools.',requires:'Help text is available immediately; translation requires a connection.',manual:manual('현재 Room과 기능의 도움말을 엽니다.','기본 도움말은 즉시 사용하며 번역은 연결이 필요할 수 있습니다.'),source:'src/components/help/HelpText.tsx'},
  {id:'learning',label:'AI Learning Room',description:'Open the existing course, tutor, assignments and certificate.',requires:'Your signed-in account. Existing course limits apply.',manual:manual('AI 교육 과정, Tutor, 과제, 시험 및 수료증 화면으로 이동합니다.','로그인 계정과 교육 과정의 기존 이용 조건이 적용됩니다.'),source:'src/app/rcv3/learn/LearningRoom.tsx'},
  {id:'meetings',label:'Meetings',description:'Open meeting backgrounds, camera preview and meeting translation.',requires:'Camera or microphone permission for the selected feature. This is a local preview, not a meeting call.',manual:manual('회의 배경, 카메라 Preview, 회의 통역 기능을 엽니다.','선택 기능에 따라 카메라 또는 마이크 권한이 필요합니다.'),source:'src/app/rcv3/meetings/MeetingPreview.tsx'},
  {id:'create-room',label:'Create Room',description:'Create a room in one column with purpose-based design and feature suggestions, account-language prompts and server-verified pricing.',requires:'Existing price, account and payment conditions apply.',manual:manual('새 Room의 이름, 용도, 디자인, 기능, 결제를 순서대로 설정합니다. Save/결제 확인 전 실제 Room을 만들지 않습니다.','계정, 가격표, 결제 조건이 준비되어야 최종 생성할 수 있습니다.'),source:'src/app/rcv3/create/CreateRoomWizard.tsx'},
  {id:'room-list',label:'My Rooms',description:'Search your created rooms and move directly between them.',requires:'Authenticated owned room list. Never bypass room permissions.',manual:manual('본인이 만든 Room을 검색·이동하고 확인 후 삭제할 수 있습니다.','로그인한 본인 소유 Room만 표시됩니다.'),source:'src/components/rcv3-toolbox/RoomNavigation.tsx'},
  {id:'background',label:'Background',description:'Choose a PNG, JPG or WebP background for this room.',requires:'An image under 950KB. Save the room design to keep the change.',manual:manual('Room 배경 이미지를 PNG, JPG, WebP 파일로 바꿉니다.','950KB 이하 이미지가 필요하며 변경 후 Save해야 고정됩니다.'),source:'src/app/rcv3/Room.tsx'},
  {id:'edit-buttons',label:'Edit Buttons',description:'Move, resize, recolour, rename or remove installed buttons.',requires:'Save or cancel your current edits first.',manual:manual('버튼의 위치, 크기, 색, 테두리, 글씨 크기와 이름을 수정합니다. Same Style을 켜면 다음 버튼에도 같은 모양을 연속 적용합니다.','한 번에 하나의 편집 세션만 사용하며 완료 후 Save 또는 Cancel해야 합니다.'),source:'src/app/rcv3/Room.tsx'},
  {id:'upload-file',label:'Add Text File',description:'Add a TXT, MD or CSV file to this room.',requires:'A text file under 100KB and access to this room.',manual:manual('TXT, MD, CSV 텍스트 파일을 현재 Room에 추가합니다.','100KB 이하 파일과 해당 Room 접근 권한이 필요합니다.'),source:'src/app/rcv3/Room.tsx'},
  {id:'toolbox',label:'Toolbox',description:'RC-managed shared tools for approved installation.',requires:'Harry’s authenticated RC owner account and authorization. Customers cannot install directly.',manual:manual('검증된 공통 버튼과 기능을 보관하고 Room에 배치하는 RC 전용 버튼 창고입니다.','RC 관리자 권한이 필요하며 일반 고객은 직접 설치할 수 없습니다.'),source:'src/components/rcv3-toolbox/Toolbox.tsx'},
  {id:'payment',label:'Payment',description:'Open payment guidance and the existing room subscription payment page.',requires:'Your own RC order. Server-confirmed payment is required before paid tools can run.',manual:manual('현재 Room의 결제 안내와 구독 결제 화면을 엽니다.','본인 RC 주문과 서버에서 확인된 결제 상태가 필요합니다.'),source:'src/components/rcv3-toolbox/PaymentGate.tsx'},
]);
for(const entry of entries){
  if(!entry.description||!entry.requires||!entry.source||!entry.manual?.purpose||!entry.manual?.use||!entry.manual?.requirements||!entry.manual?.install||!entry.manual?.save)throw new Error(`TOOL_MANUAL_REQUIRED:${entry.id}`);
}
export const TOOL_REGISTRY = Object.freeze(entries.map(entry => Object.freeze({...entry,version:'1.0.0'})));
export const TOOL_IDS = Object.freeze(entries.map(entry => entry.id));
export const TOOL_MANUALS = Object.freeze(Object.fromEntries(TOOL_REGISTRY.map(tool=>[tool.id,Object.freeze({toolId:tool.id,label:tool.label,version:tool.version,...tool.manual})])));
/** @param {string} id */
export function getTool(id) {
  const tool = TOOL_REGISTRY.find(entry => entry.id === id);
  if (!tool) throw new Error('UNKNOWN_TOOL');
  return tool;
}
/** Return only portable design, never a connection or an entitlement.
 * @param {string} toolId @param {string} id @param {number} [index]
 */
export function createToolButton(toolId,id,index=0) {
  const tool = getTool(toolId);
  return {id,capability:tool.id,label:tool.label,x:5+(index%3)*30,y:5+(Math.floor(index/3)%7)*13,width:24,height:11,opacity:1};
}
