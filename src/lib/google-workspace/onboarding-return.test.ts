import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase/server",()=>({createClient:vi.fn()}));
import {createOAuthState,oauthReturnPath,onboardingReturnPath} from "./index";
const path="/rcv3/create?draft=10000000-0000-4000-8000-000000000001";
afterEach(()=>vi.unstubAllEnvs());
describe("signed onboarding continuation",()=>{
 it("preserves only the verified customer's draft return",()=>{vi.stubEnv("GOOGLE_WORKSPACE_TOKEN_KEY","test-only-secret");const state=createOAuthState("owner",path);expect(oauthReturnPath(state,"owner")).toBe(path);expect(oauthReturnPath(state,"someone-else")).toBeUndefined();expect(oauthReturnPath(`${state}x`,"owner")).toBeUndefined();});
 it("rejects external, protocol-relative, encoded and extra-parameter redirects",()=>{for(const value of ["https://evil.test", "//evil.test", "/rcv3/create?draft=%2f%2fevil", `${path}&next=https://evil.test`, "/dashboard"])expect(onboardingReturnPath(value)).toBeUndefined();});
});
