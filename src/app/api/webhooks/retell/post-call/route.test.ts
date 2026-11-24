import { createHmac } from "node:crypto";
import { describe,expect,it } from "vitest";
import { verifyRetellWebhook } from "./route";
describe("Retell signature",()=>{
 it("accepts valid and rejects changed body",()=>{const now=1789084800000,raw='{"event":"call_ended"}',key="key";const d=createHmac("sha256",key).update(raw+now).digest("hex"),s=`v=${now},d=${d}`;expect(verifyRetellWebhook(raw,s,key,now)).toBe(true);expect(verifyRetellWebhook(raw+"x",s,key,now)).toBe(false);});
 it("normalizes copied key and signature whitespace",()=>{const now=1789084800000,raw="{}",key="key",d=createHmac("sha256",key).update(raw+now).digest("hex");expect(verifyRetellWebhook(raw,` v=${now}, d=${d} `,` ${key}\n`,now)).toBe(true);});
 it("rejects stale",()=>{const t=1789084800000,raw="{}",key="key",d=createHmac("sha256",key).update(raw+t).digest("hex");expect(verifyRetellWebhook(raw,`v=${t},d=${d}`,key,t+300001)).toBe(false);});
});
