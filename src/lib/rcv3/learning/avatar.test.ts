import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {avatarConfig,avatarReceipt,receiptSession,startAvatar} from './avatar';
const id='12345678-1234-4234-8234-123456789abc';
beforeEach(()=>{vi.stubEnv('LIVEAVATAR_API_KEY','server-secret');vi.stubEnv('LIVEAVATAR_AVATAR_ID',id);vi.stubEnv('RC_LEARNING_AVATAR_ENABLED','true');vi.stubEnv('RC_LEARNING_AVATAR_OWNER_IDS','alice');vi.stubEnv('LIVEAVATAR_SANDBOX','true');});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.restoreAllMocks();});
it('only enables explicitly configured owners and fails closed for absent configuration',()=>{expect(avatarConfig('alice').ready).toBe(true);expect(avatarConfig('bob').ready).toBe(false);vi.stubEnv('RC_LEARNING_AVATAR_ENABLED','');expect(avatarConfig('alice').ready).toBe(false);});
it('stop receipt binds owner, session, signature and expiry',()=>{const receipt=avatarReceipt('alice',id,'secret');expect(receiptSession(receipt,'alice','secret')).toBe(id);expect(()=>receiptSession(receipt,'bob','secret')).toThrow();expect(()=>receiptSession(receipt+'x','alice','secret')).toThrow();vi.spyOn(Date,'now').mockReturnValue(Date.now()+3600001);expect(()=>receiptSession(receipt,'alice','secret')).toThrow();});
it('starts LITE with bounded duration and returns client credentials only',async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce(Response.json({data:{session_id:id,session_token:'server-session'}})).mockResolvedValueOnce(Response.json({data:{session_id:id,livekit_url:'wss://room.livekit.cloud',livekit_client_token:'client',livekit_agent_token:'private-agent',ws_url:'wss://api.liveavatar.com/socket'}}));vi.stubGlobal('fetch',fetcher);
 const result=await startAvatar('alice',new AbortController().signal);expect(result.livekit_client_token).toBe('client');expect(JSON.stringify(result)).not.toContain('private-agent');expect(JSON.stringify(result)).not.toContain('server-session');
 expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({mode:'LITE',max_session_duration:60,is_sandbox:true});
});
it('cleans up a minted session when start fails or request is cancelled',async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce(Response.json({data:{session_id:id,session_token:'token'}})).mockResolvedValueOnce(new Response('',{status:500})).mockResolvedValue(new Response(''));vi.stubGlobal('fetch',fetcher);
 await expect(startAvatar('alice',new AbortController().signal)).rejects.toThrow('RCV3_AVATAR');expect(fetcher.mock.calls[2][0]).toContain('/stop');
});
