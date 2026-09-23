import {it,expect} from "vitest";
import {roomNavigationTarget,basicNavigationRoom} from "./room-navigation";
const a={id:"11111111-1111-4111-8111-111111111111",name:"Basic"};
const b={id:"22222222-2222-4222-8222-222222222222",name:"Second"};
it("never guesses a basic room from the first or only result",()=>{expect(basicNavigationRoom([a])).toBeNull();expect(basicNavigationRoom([a],b.id)).toBeNull();expect(basicNavigationRoom([b,a],a.id)).toEqual(a);});
it("routes directly to a listed room and rejects unlisted or injected destinations",()=>{expect(roomNavigationTarget([a,b],b.id)).toBe(`/rcv3?room=${b.id}`);expect(()=>roomNavigationTarget([a],b.id)).toThrow();expect(()=>roomNavigationTarget([a],"https://evil.example")).toThrow();});
