const text={
 list:["My Rooms","내 방 목록"],search:["Find a room","방 이름 검색"],empty:["No created rooms found.","생성된 방이 없습니다."],loading:["Loading rooms…","방 목록을 불러오는 중…"],error:["Could not load rooms.","방 목록을 불러오지 못했습니다."],retry:["Retry","다시 시도"],close:["Close","닫기"],more:["Load more rooms","방 더 보기"],current:["Current room","현재 방"],
 delete:["Delete","삭제"],deleteQuestion:["Delete this room from My Rooms? It will disappear from this list immediately.","이 방을 내 방 목록에서 삭제할까요? 삭제하면 이 목록에서 즉시 사라집니다."],cancel:["Cancel","취소"],confirmDelete:["Delete room","방 삭제"],deleting:["Deleting…","삭제 중…"],deleteError:["Could not delete this room.","이 방을 삭제하지 못했습니다."]
} as const;
export function navigationText(key:keyof typeof text,language:string){return text[key][language.toLowerCase().startsWith("ko")?1:0];}
