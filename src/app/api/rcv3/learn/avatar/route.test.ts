import {beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({session:vi.fn(),client:vi.fn(),ready:true,start:vi.fn(),stop:vi.fn(),receipt:vi.fn()}));
vi.mock('@/lib/rcv3/access',()=>({session:m.session,input:(r:Request)=>{if(r.headers.get('origin')!==new URL(r.url).origin)throw Error('RCV3_ORIGIN');return r.json();},reply:(v:unknown)=>Response.json(v),failure:(e:Error)=>Response.json({code:e.message},{status:400})}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:m.client}));
vi.mock('@/lib/rcv3/learning/avatar',()=>({avatarConfig:()=>({ready:m.ready}),startAvatar:m.start,stopAvatar:m.stop,receiptSession:m.receipt}));
import {GET,POST} from './route';
const request=(body:unknown,origin='https://preview.test')=>new Request('https://preview.test/api/rcv3/learn/avatar',{method:'POST',headers:{origin},body:JSON.stringify(body)});
beforeEach(()=>{vi.clearAllMocks();m.ready=true;m.session.mockResolvedValue({user:{id:'alice'}});m.client.mockImplementation(()=>{throw Error('quota storage unavailable');});m.start.mockResolvedValue({receipt:'owned'});m.receipt.mockReturnValue('own-session');vi.stubEnv('LIVEAVATAR_API_KEY','secret');});
it('status never starts a paid session; disabled owners fail before provider',async()=>{expect(await(await GET()).json()).toEqual({ready:true});expect(m.start).not.toHaveBeenCalled();m.ready=false;expect((await POST(request({action:'start'}))).status).toBe(400);expect(m.client).not.toHaveBeenCalled();});
it('requires auth, same origin, strict input before session creation',async()=>{for(const body of [{action:'start',owner:'bob'},{action:'unknown'}])expect((await POST(request(body))).status).toBe(400);expect((await POST(request({action:'start'},'https://evil.test'))).status).toBe(400);m.session.mockRejectedValueOnce(Error('RCV3_AUTH'));expect((await GET()).status).toBe(400);expect(m.start).not.toHaveBeenCalled();});
it('uses the authenticated owner and signed stop receipt, even if starts are disabled',async()=>{expect((await POST(request({action:'start'}))).status).toBe(200);expect(m.client).not.toHaveBeenCalled();m.ready=false;expect((await POST(request({action:'stop',receipt:'ticket'}))).status).toBe(200);expect(m.receipt).toHaveBeenCalledWith('ticket','alice','secret');expect(m.stop).toHaveBeenCalledWith('own-session','secret');});

it('allows repeat starts for an already allowlisted owner without quota reads or writes',async()=>{for(let i=0;i<40;i++)expect((await POST(request({action:'start'}))).status).toBe(200);expect(m.start).toHaveBeenCalledTimes(40);expect(m.client).not.toHaveBeenCalled();});
