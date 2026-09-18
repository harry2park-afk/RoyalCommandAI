// Trusted visual presets only. All templates use the same immutable capabilities.
export const roomTemplates = [
 {id:'blank',name:'Blank Room',category:'Simple',keywords:'빈방 기본 버튼',wall:'#142536',floor:'#102030',accent:'#79edc7'},
 {id:'executive',name:'Executive Office',category:'Office',keywords:'사무실 오피스 사장',wall:'#d9d4cb',floor:'#877364',accent:'#564538'},
 {id:'skyline',name:'City Office',category:'Office',keywords:'도시 창문 사무실',wall:'#bccdd9',floor:'#516578',accent:'#183a51'},
 {id:'library',name:'Private Library',category:'Study',keywords:'서재 책 도서관',wall:'#c4a584',floor:'#795840',accent:'#4b382d'},
 {id:'garden',name:'Garden Studio',category:'Nature',keywords:'정원 자연 나무',wall:'#d4e4d5',floor:'#a4b995',accent:'#376755'},
 {id:'creative',name:'Creative Studio',category:'Studio',keywords:'작업실 아트 스튜디오',wall:'#e7d8dc',floor:'#c09a9d',accent:'#8b5171'},
 {id:'cartoon',name:'Cartoon Room',category:'Illustration',keywords:'만화 그림',wall:'#cfe6fb',floor:'#b6cef0',accent:'#5a57bc'},
 {id:'night',name:'Night Workspace',category:'Office',keywords:'야간 밤 사무실',wall:'#263b55',floor:'#162437',accent:'#7098c9'},
 {id:'minimal',name:'Minimal Workspace',category:'Simple',keywords:'심플 미니멀 흰방',wall:'#eeeeea',floor:'#d1d4d0',accent:'#727f7a'},
] as const;
export type RoomTemplate = typeof roomTemplates[number];
export function templateImage(t:RoomTemplate) {
 if(t.id==='blank')return '';
 const books=t.id==='library';
 // These SVGs are authored UI illustrations, never arbitrary customer SVG input.
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700"><rect width="1200" height="700" fill="${t.wall}"/><path d="M0 470H1200V700H0Z" fill="${t.floor}"/><path d="M0 700L340 470M1200 700L860 470M0 590H1200" fill="none" stroke="${t.accent}" opacity=".14"/><rect x="350" y="55" width="650" height="330" rx="8" fill="#eef8fc"/><rect x="365" y="70" width="620" height="300" fill="${t.id==='night'?'#142842':'#b9dfeb'}"/><path d="M365 270L435 210 495 240 570 140 630 175 725 100 790 180 865 160 985 255V370H365Z" fill="${t.accent}" opacity=".25"/><path d="M675 65V380M350 225H1000" stroke="${t.wall}" stroke-width="12"/><circle cx="880" cy="125" r="29" fill="#fff0b6"/><rect x="55" y="95" width="215" height="300" rx="8" fill="${t.accent}" opacity=".8"/>${books?'<path d="M65 170H260M65 245H260M65 320H260" stroke="#d7bd9f" stroke-width="9"/><path d="M95 110V165M125 115V165M170 105V165M205 115V165M105 185V240M140 182V240M185 185V240M230 182V240M90 260V315M135 260V315M190 255V315M225 265V315" stroke="#e7d3a9" stroke-width="18"/>':'<rect x="78" y="118" width="169" height="254" rx="4" fill="#e9e3d3"/><circle cx="161" cy="213" r="52" fill="'+t.floor+'"/><path d="M80 350L145 235 245 350Z" fill="'+t.accent+'"/>'}<ellipse cx="620" cy="614" rx="335" ry="45" fill="#000" opacity=".08"/><path d="M320 462H950L1010 548H270Z" fill="${t.accent}"/><path d="M300 548V645M980 548V645" stroke="${t.accent}" stroke-width="22"/><rect x="550" y="336" width="218" height="132" rx="9" fill="#263442"/><rect x="560" y="346" width="198" height="110" rx="4" fill="#a5ccd2"/><path d="M660 468V491M620 492H700" stroke="#263442" stroke-width="10"/><path d="M545 503H775L790 524H535Z" fill="#d5dedf"/><rect x="848" y="462" width="34" height="38" rx="6" fill="#f4efdf"/><path d="M1080 515V370" stroke="#3d6950" stroke-width="9"/><ellipse cx="1048" cy="400" rx="30" ry="66" fill="#679478" transform="rotate(-30 1048 400)"/><ellipse cx="1110" cy="380" rx="30" ry="66" fill="#477b60" transform="rotate(30 1110 380)"/><path d="M1038 498H1124L1112 572H1050Z" fill="${t.accent}"/></svg>`;
 return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
