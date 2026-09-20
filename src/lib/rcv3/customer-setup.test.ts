import { beforeEach, describe, expect, it, vi } from "vitest";
const mock=vi.hoisted(()=>({selection:vi.fn(),resolve:vi.fn(),complete:vi.fn(),mail:vi.fn(),phone:vi.fn()}));
vi.mock("./customer-ai",()=>({verifyCustomerAISelection:mock.selection,resolveCustomerAI:mock.resolve}));
vi.mock("./customer-mail",()=>({verifyCustomerMail:mock.mail}));
vi.mock("./customer-phone-account",()=>({validateCustomerOwnedPhone:mock.phone}));
import { verifyCustomerSetup } from "./customer-setup";
import { newRoomDraft, draftInputSchema } from "./room-draft";
const draft=()=>({...newRoomDraft(),providers:["openai" as const],onboarding:{country:"AU",aiSources:{openai:"personal" as const},emailEnabled:false,phoneOfferId:""}});
beforeEach(()=>{vi.clearAllMocks();mock.selection.mockResolvedValue(undefined);mock.resolve.mockResolvedValue({complete:mock.complete});mock.complete.mockResolvedValue({content:"OK"});mock.mail.mockResolvedValue({connected:true});});
describe("customer setup before payment",()=>{
 it("rejects omitted setup on a new checkout without changing legacy parsing",async()=>{expect(draftInputSchema.safeParse(newRoomDraft()).success).toBe(true);await expect(verifyCustomerSetup("owner","draft",newRoomDraft())).rejects.toThrow("RCV3_FORM_REQUIRED");});
 it("resolves the customer's chosen personal account, never silently platform",async()=>{const reserve=vi.fn().mockResolvedValue(undefined);await verifyCustomerSetup("owner","draft",draft(),reserve);expect(mock.resolve).toHaveBeenCalledWith("owner","openai","personal");expect(reserve).toHaveBeenCalledOnce();});
 it("does not make chargeable AI calls when the owner quota is exhausted",async()=>{const reserve=vi.fn().mockRejectedValue(new Error("RCV3_LIMIT"));await expect(verifyCustomerSetup("owner","draft",draft(),reserve)).rejects.toThrow("RCV3_LIMIT");expect(mock.complete).not.toHaveBeenCalled();});
 it("fails before checkout when the selected AI fails",async()=>{mock.complete.mockResolvedValue({content:"",error:"unavailable"});await expect(verifyCustomerSetup("owner","draft",draft(),async()=>{})).rejects.toThrow("RCV3_AI_NOT_CONNECTED");});
 it("uses only the paying owner's explicitly requested mailbox",async()=>{const d=draft();await verifyCustomerSetup("owner","draft",d);expect(mock.mail).not.toHaveBeenCalled();await verifyCustomerSetup("owner","draft",{...d,secretary:true,secretarySetup:{email:"customer@example.test",phone:""},onboarding:{...d.onboarding,emailEnabled:true}});expect(mock.mail).toHaveBeenCalledWith("owner","customer@example.test");});
});
