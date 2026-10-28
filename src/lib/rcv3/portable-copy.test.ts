import { describe, expect, it } from "vitest";
import { portableRoomState } from "./portable-copy";
import { stateSchema } from "./cloud-state";
import { randomUUID } from "node:crypto";

describe("customer-safe portable room", () => {
  it("keeps functional capabilities but excludes all source runtime and personal settings", () => {
    const oldButton = randomUUID(), oldAsset = randomUUID(), oldSecretary = randomUUID();
    const source = stateSchema.parse({revision:8,release:"rcv3-1",name:"PRIVATE_NAME_SENTINEL",gmailEnabled:true,
      connectedProviders:["anthropic"],selectedProviders:["anthropic"],providerOrder:["anthropic"],secretaryRoomId:oldSecretary,
      design:{backgroundAssetId:oldAsset,buttons:[{id:oldButton,capability:"secretary",label:"PRIVATE_PHONE_SENTINEL",x:10,y:15,width:20,height:12,opacity:1}]},
      appearances:{[oldButton]:{color:"#aabbcc"}},bindings:{[oldButton]:"secretary"}});
    const copy = portableRoomState(Object.assign(source,{history:["PRIVATE_HISTORY_SENTINEL"],oauthToken:"PRIVATE_TOKEN_SENTINEL",phone:"PRIVATE_PHONE_SENTINEL",futurePrivateSetting:"PRIVATE_FUTURE_SENTINEL"}),"New Room",()=>randomUUID());
    expect(copy.design.buttons[0]).toMatchObject({capability:"secretary",label:"Katie",x:10,y:15});
    expect(copy.bindings[copy.design.buttons[0].id]).toBe("secretary");
    expect(copy.connectedProviders).toEqual(["openai"]); // Product default, not the source selection.
    expect(copy.selectedProviders).toEqual(["openai"]);
    expect(copy.secretaryRoomId).toBeNull();
    expect(copy.gmailEnabled).toBe(false);
    expect(copy.design.backgroundAssetId).toBeNull();
    expect(copy.appearances).toEqual({});
    for (const value of ["PRIVATE_",oldSecretary,oldButton,oldAsset]) expect(JSON.stringify(copy)).not.toContain(value);
    expect(source.secretaryRoomId).toBe(oldSecretary);
    expect(source.design.buttons[0].label).toBe("PRIVATE_PHONE_SENTINEL");
  });
  it("creates fresh identities for every function, and never shares source objects", () => {
    const buttons = (["chat","secretary","files"] as const).map(capability=>({id:randomUUID(),capability,label:"private",x:0,y:0,width:10,height:10,opacity:1}));
    const source=stateSchema.parse({revision:1,release:"rcv3-1",name:"Source",design:{backgroundAssetId:null,buttons},appearances:{},bindings:Object.fromEntries(buttons.map(b=>[b.id,b.capability]))});
    const one=portableRoomState(source,"One",()=>randomUUID()),two=portableRoomState(source,"Two",()=>randomUUID());
    expect(one.design.buttons.map(b=>b.capability)).toEqual(["chat","secretary","files"]);
    expect(one.design.buttons.map(b=>b.id)).not.toEqual(two.design.buttons.map(b=>b.id));
    one.design.buttons[0].label="Changed";
    expect(source.design.buttons[0].label).toBe("private");
  });
});
