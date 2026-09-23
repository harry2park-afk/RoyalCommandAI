export type NavigationRoom={id:string;name:string};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function roomNavigationTarget(rooms:NavigationRoom[],id:string) {
 if(!uuid.test(id)||!rooms.some(room=>room.id===id))throw new Error("RCV3_NOT_FOUND");
 return `/rcv3?room=${encodeURIComponent(id)}`;
}
export function basicNavigationRoom(rooms:NavigationRoom[],basicRoomId?:string|null) {
 return basicRoomId?rooms.find(room=>room.id===basicRoomId)??null:null;
}
