import {it,expect} from "vitest";
import {roomPurposeCatalog,selectRoomPurpose,catalogLabel} from "./room-purpose-catalog";
import {newRoomDraft,draftInputSchema} from "./room-draft";
it("offers 60 unique ideas which all produce valid existing draft schemas",()=>{
 expect(roomPurposeCatalog).toHaveLength(60);expect(new Set(roomPurposeCatalog.map(x=>x.id)).size).toBe(60);
 for(const entry of roomPurposeCatalog){const result=selectRoomPurpose(newRoomDraft(),entry.id,"ko");expect(draftInputSchema.safeParse(result).success,entry.id).toBe(true);expect(result.brief).toBe(entry.name[1]);}
});
it("preserves custom names, design and connection selections without purchasing anything",()=>{
 const input={...newRoomDraft(),name:"My guitar",brief:"Keep",providers:["openai" as const]};
 const next=selectRoomPurpose(input,"purpose-3-1","en");expect(next.name).toBe(input.name);expect(next.templateId).toBe(input.templateId);expect(next.providers).toEqual(input.providers);expect(next.purpose).toBe("music");
});
it("supports custom purposes and removes secondary text in English",()=>{
 const next=selectRoomPurpose(newRoomDraft(),"purpose-1-1","en");expect(next.answers.purpose).toEqual(["Daily planning"]);expect(catalogLabel(["Family","가족"],"en-AU")).toBe("Family");expect(()=>selectRoomPurpose(newRoomDraft(),"unknown","en")).toThrow();
});
