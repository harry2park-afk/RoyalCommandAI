import {describe,it,expect} from "vitest";
import {v4HomeHref} from "../../components/rcv3-toolbox/V4HomeLink";
describe("V4 first room navigation",()=>{
 it("resolves the authenticated first room without a customer ID or arbitrary destination",()=>{
  for(const lang of ["en","ko","ja","zh","hi"]){const url=new URL(v4HomeHref(lang));expect(url.origin).toBe("https://royalcommand.ai");expect(url.pathname).toBe("/v4/enter");expect([...url.searchParams]).toEqual([["lang",lang]]);}
  for(const value of ["//evil.invalid","ko&test=1","", "en&id=someone-else"])expect(v4HomeHref(value)).toBe("https://royalcommand.ai/v4/enter?lang=en");
 });
});
