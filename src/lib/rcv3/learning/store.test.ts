import {beforeEach,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const m=vi.hoisted(()=>({insert:vi.fn()}));
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:()=>({from:()=>({insert:m.insert})})}));
import {reserveLearning} from './store';
beforeEach(()=>vi.clearAllMocks());
it('caps tutor attempts at 30 atomic slots per day',async()=>{m.insert.mockResolvedValue({error:{code:'23505'}});await expect(reserveLearning('owner','chat')).rejects.toThrow('RCV3_LIMIT');expect(m.insert).toHaveBeenCalledTimes(30);});
it('caps exams at 3 atomic slots per day',async()=>{m.insert.mockResolvedValue({error:{code:'23505'}});await expect(reserveLearning('owner','exam')).rejects.toThrow('RCV3_LIMIT');expect(m.insert).toHaveBeenCalledTimes(3);});
it('retries a competing slot without charging two successful slots',async()=>{m.insert.mockResolvedValueOnce({error:{code:'23505'}}).mockResolvedValueOnce({error:null});await reserveLearning('owner','chat');expect(m.insert).toHaveBeenCalledTimes(2);expect(m.insert.mock.calls[1][0]).toMatchObject({owner_id:'owner',kind:'chat',slot:1});});
