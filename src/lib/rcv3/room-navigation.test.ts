import {it,expect} from "vitest";
import {roomNavigationTarget,basicNavigationRoom} from "./room-navigation";
const a={id:"11111111-1111-4111-8111-111111111111",name:"Basic"};
const b={id:"22222222-2222-4222-8222-222222222222",name:"Second"};
it("never guesses a basic room from the first or only result",()=>{expect(basicNavigationRoom([a])).toBeNull();expect(basicNavigationRoom([a],b.id)).toBeNull();expect(basicNavigationRoom([b,a],a.id)).toEqual(a);});
it("routes directly to a listed room and rejects unlisted or injected destinations",()=>{expect(roomNavigationTarget([a,b],b.id)).toBe(`/rcv3?room=${b.id}`);expect(()=>roomNavigationTarget([a],b.id)).toThrow();expect(()=>roomNavigationTarget([a],"https://evil.example")).toThrow();});
it("opens an existing room in its own runtime",()=>{expect(roomNavigationTarget([{...a,kind:"existing"}],a.id)).toBe(`/rooms/${a.id}`);});

import {compactRoomNavigation} from "./room-navigation";
it("shows no list for zero or one, five names for five, and overflow for six",()=>{
 for(const count of [0,1,5,6]){const rooms=Array.from({length:count},(_,i)=>({...a,id:String(i),status:"draft" as const}));const result=compactRoomNavigation(rooms);expect(result.visible).toHaveLength(Math.min(5,count));expect(result.overflow).toBe(count>5);}
});
it("excludes archived rooms, keeps created preview drafts, deduplicates, preserves pagination",()=>{
 expect(compactRoomNavigation([{...a,status:"archived"},{...b,status:"draft"},b]).visible).toEqual([b]);expect(compactRoomNavigation([a],true).overflow).toBe(true);
});
