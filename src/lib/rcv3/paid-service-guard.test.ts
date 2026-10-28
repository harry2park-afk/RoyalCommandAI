import {beforeEach,expect,it,vi} from "vitest";
const mock=vi.hoisted(()=>({one:vi.fn(),legacy:vi.fn(),paid:vi.fn(),service:vi.fn(),room:vi.fn()}));
vi.mock("./checkout-ledger",()=>({orderLedger:()=>({one:mock.one,db:{from:()=>{const query={select:()=>query,eq:()=>query,limit:mock.legacy,maybeSingle:mock.room};return query;}}}),paidRoomEntitlement:mock.paid,requirePaidService:mock.service}));
import {guardPaidRoom} from "./paid-service-guard";
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("VERCEL_ENV","preview");mock.one.mockResolvedValue(null);mock.legacy.mockResolvedValue({data:[{room_id:"legacy"}],error:null});});
it("preserves existing legacy Command Room aliases",async()=>{expect(await guardPaidRoom("owner","rca")).toBeNull();expect(mock.one).not.toHaveBeenCalled();});
it("does not let a new account use a legacy alias to bypass payment",async()=>{mock.legacy.mockResolvedValue({data:[],error:null});await expect(guardPaidRoom("new","rca")).rejects.toThrow("RCV3_PAYMENT_REQUIRED");});
it("checks paid-room ownership even for legacy accounts",async()=>{mock.one.mockResolvedValue({owner_id:"another"});await expect(guardPaidRoom("owner","10000000-0000-4000-8000-000000000001")).rejects.toThrow("RCV3_NOT_FOUND");});
it("never changes Production service access",async()=>{vi.stubEnv("VERCEL_ENV","production");vi.stubEnv("NODE_ENV","production");expect(await guardPaidRoom("owner","rca")).toBeNull();expect(mock.legacy).not.toHaveBeenCalled();});

it("does not let legacy accounts request somebody else's non-ledger room",async()=>{mock.room.mockResolvedValue({data:null,error:null});await expect(guardPaidRoom("owner","10000000-0000-4000-8000-000000000001")).rejects.toThrow("RCV3_NOT_FOUND");});
it("rejects unknown aliases even for legacy accounts",async()=>{await expect(guardPaidRoom("owner","invented-alias")).rejects.toThrow("RCV3_ROOM_REQUIRED");});
