import {beforeEach,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const m=vi.hoisted(()=>({insert:vi.fn(),read:vi.fn(),eq:vi.fn(),client:vi.fn()}));
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:()=>{m.client();return {from:()=>({insert:m.insert,select:()=>{const query={eq:m.eq,then:(resolve:(value:unknown)=>unknown,reject:(e:unknown)=>unknown)=>m.read().then(resolve,reject)};m.eq.mockReturnValue(query);return query;}})}; }}));
import {reserveLearning} from './store';
beforeEach(()=>{vi.clearAllMocks();m.client.mockReset();m.read.mockResolvedValue({data:[],error:null});m.insert.mockResolvedValue({error:null});});
it('skips 2 occupied exam slots with one read and one atomic insert',async()=>{
 m.read.mockResolvedValue({data:Array.from({length:2},(_,slot)=>({slot})),error:null});
 await reserveLearning('owner','exam');expect(m.read).toHaveBeenCalledTimes(1);expect(m.insert).toHaveBeenCalledTimes(1);
 expect(m.insert).toHaveBeenCalledWith({owner_id:'owner',kind:'exam',day:new Date().toISOString().slice(0,10),slot:2});
 expect(m.eq.mock.calls).toEqual([['owner_id','owner'],['day',new Date().toISOString().slice(0,10)],['kind','exam']]);
});
it.each([['exam',3]] as const)('rejects full %s quota without probing occupied slots',async(kind,limit)=>{
 m.read.mockResolvedValue({data:Array.from({length:limit},(_,slot)=>({slot})),error:null});
 await expect(reserveLearning('owner',kind)).rejects.toThrow('RCV3_LIMIT');expect(m.insert).not.toHaveBeenCalled();
});
it('retries a competing slot without charging two successful slots',async()=>{
 m.insert.mockResolvedValueOnce({error:{code:'23505'}}).mockResolvedValueOnce({error:null});await reserveLearning('owner','exam');
 expect(m.insert).toHaveBeenCalledTimes(2);expect(m.insert.mock.calls[1][0]).toMatchObject({owner_id:'owner',kind:'exam',slot:1});
});
it.each([['exam',3]] as const)('retains the atomic %s cap when every read is stale',async(kind,limit)=>{
 const occupied=new Set<number>();m.insert.mockImplementation(async(row:{slot:number})=>{if(occupied.has(row.slot))return {error:{code:'23505'}};occupied.add(row.slot);return {error:null};});
 const results=await Promise.allSettled(Array.from({length:limit+5},()=>reserveLearning('owner',kind)));
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(limit);
 for(const result of results)if(result.status==='rejected')expect(result.reason.message).toBe('RCV3_LIMIT');
 expect([...occupied].sort((a,b)=>a-b)).toEqual(Array.from({length:limit},(_,i)=>i));
 expect(m.insert.mock.calls.every(([row])=>row.slot>=0&&row.slot<limit&&row.kind===kind&&row.owner_id==='owner')).toBe(true);
});
it('fails closed on read failure or missing data and never consumes quota',async()=>{
 for(const result of [{data:null,error:{code:'storage'}},{data:null,error:null}]){
  m.read.mockResolvedValue(result);await expect(reserveLearning('owner','exam')).rejects.toThrow('RCV3_STORAGE');
 }
 expect(m.insert).not.toHaveBeenCalled();
});
it('fails closed on a non-duplicate insert error without trying more slots',async()=>{
 m.insert.mockResolvedValue({error:{code:'storage'}});await expect(reserveLearning('owner','exam')).rejects.toThrow('RCV3_STORAGE');expect(m.insert).toHaveBeenCalledTimes(1);
});

it('allows repeated AI requests without creating a database client or accessing quota storage',async()=>{
 m.client.mockImplementation(()=>{throw Error('quota storage unavailable');});
 await Promise.all(Array.from({length:100},()=>reserveLearning('owner','chat')));
 expect(m.client).not.toHaveBeenCalled();expect(m.read).not.toHaveBeenCalled();expect(m.insert).not.toHaveBeenCalled();expect(m.eq).not.toHaveBeenCalled();
});
