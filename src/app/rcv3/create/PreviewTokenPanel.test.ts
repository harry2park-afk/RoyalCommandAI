import React from "react";
import {beforeEach,describe,expect,it,vi} from "vitest";
const state=vi.hoisted(()=>({values:[] as unknown[],index:0}));
vi.mock("react",async original=>({...await original<typeof import("react")>(),useEffect:()=>{},useState:()=>[state.values[state.index++],vi.fn()]}));
vi.mock("./BankPicker",()=>({default:()=>null}));
import PreviewTokenPanel from "./PreviewTokenPanel";
const props={draftId:"draft",revision:3,disabled:false,language:"ko",accountName:"Harry Park",roomName:"Legal",designName:"Library"};
function render(account:unknown,agreed=true,signature="Harry Park",disabled=false){
 state.index=0;state.values=[account,false,false,"",agreed,"",false,"","",null,"",false,false,signature,false];
 return PreviewTokenPanel({...props,disabled});
}
function nodes(value:unknown):React.ReactElement<Record<string,any>>[]{
 if(Array.isArray(value))return value.flatMap(nodes);
 if(!React.isValidElement(value))return [];
 const element=value as React.ReactElement<Record<string,any>>;
 return [element,...nodes(element.props.children)];
}
function createButton(tree:unknown){return nodes(tree).find(n=>n.type==="button"&&n.props.children==="방 만들기")!;}
beforeEach(()=>{vi.stubGlobal("React",React);vi.stubGlobal("window",{location:{assign:vi.fn()}});});
describe("existing room consent and create control",()=>{
 it("keeps consent and creation visible when account lookup fails, without enabling spending",()=>{
  const tree=render(null);expect(createButton(tree).props.disabled).toBe(true);
  expect(nodes(tree).some(n=>n.type==="input"&&n.props.type==="checkbox")).toBe(true);
 });
 it("requires sufficient tokens, agreement, a name and saved required fields",()=>{
  const account={customerNumber:"RC fixture",balance:9970,cost:30};
  expect(createButton(render(account)).props.disabled).toBe(false);
  expect(createButton(render(account,false)).props.disabled).toBe(true);
  expect(createButton(render(account,true,"")).props.disabled).toBe(true);
  expect(createButton(render(account,true,"Harry",true)).props.disabled).toBe(true);
  expect(createButton(render({...account,balance:29})).props.disabled).toBe(true);
 });
 it("uses the existing token API with explicit consent and navigates only after success",async()=>{
  const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({url:"/rcv3?room=abcd-1234",balance:9940})});vi.stubGlobal("fetch",fetch);
  createButton(render({customerNumber:"RC fixture",balance:9970,cost:30})).props.onClick();
  await vi.waitFor(()=>expect(window.location.assign).toHaveBeenCalledWith("/rcv3?room=abcd-1234"));
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({draftId:"draft",expectedRevision:3,signature:"Harry Park",termsConsent:true});
 });
 it("does not navigate when the server rejects the token charge",async()=>{
  const fetch=vi.fn().mockResolvedValue({ok:false,json:async()=>({code:"RCV3_LIMIT"})});vi.stubGlobal("fetch",fetch);
  createButton(render({customerNumber:"RC fixture",balance:9970,cost:30})).props.onClick();
  await vi.waitFor(()=>expect(fetch).toHaveBeenCalledTimes(1));
  await Promise.resolve();await Promise.resolve();
  expect(window.location.assign).not.toHaveBeenCalled();
 });

});
