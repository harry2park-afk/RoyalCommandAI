export type NavigationRoom={id:string;name:string;kind?:"rcv3"|"existing";status?:"active"|"draft"|"archived"};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function roomNavigationTarget(rooms:NavigationRoom[],id:string) {
 if(!uuid.test(id)||!rooms.some(room=>room.id===id))throw new Error("RCV3_NOT_FOUND");
 return rooms.find(room=>room.id===id)?.kind==="existing"?`/rooms/${encodeURIComponent(id)}`:`/rcv3?room=${encodeURIComponent(id)}`;
}
export function basicNavigationRoom(rooms:NavigationRoom[],basicRoomId?:string|null) {
 return basicRoomId?rooms.find(room=>room.id===basicRoomId)??null:null;
}
