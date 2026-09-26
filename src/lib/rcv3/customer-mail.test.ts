import { beforeEach, describe, expect, it, vi } from "vitest";
const mock=vi.hoisted(()=>({connection:vi.fn(),api:vi.fn(),admin:{marker:"service-only"}}));
vi.mock("@/lib/google-workspace",()=>({googleWorkspaceConfigured:()=>true,getGoogleConnection:mock.connection,googleApi:mock.api}));
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:()=>mock.admin}));
import { customerMailStatus, verifyCustomerMail } from "./customer-mail";
beforeEach(()=>{vi.clearAllMocks();mock.connection.mockResolvedValue({google_email:"customer@example.test"});mock.api.mockResolvedValue({emailAddress:"customer@example.test"});});
describe("owner mailbox readiness",()=>{
 it("does not report a revoked saved token as connected",async()=>{mock.api.mockRejectedValue(new Error("invalid_grant"));expect(await customerMailStatus("owner")).toEqual({configured:true,connected:false,email:""});});
 it("rejects a different authenticated mailbox from the one on the form",async()=>{await expect(verifyCustomerMail("owner","other@example.test")).rejects.toThrow("RCV3_EMAIL_CONNECT_REQUIRED");});
 it("uses an owner-filtered service client for cookie-free paid webhooks",async()=>{await verifyCustomerMail("paid-owner","customer@example.test",true);expect(mock.connection).toHaveBeenCalledWith("paid-owner",mock.admin);expect(mock.api.mock.calls[0][0]).toBe("paid-owner");expect(mock.api.mock.calls[0][3]).toBe(mock.admin);});
});
