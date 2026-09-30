import {afterEach,expect,it,vi} from 'vitest';
import {NextRequest,NextResponse} from 'next/server';
vi.mock('@/lib/supabase/middleware',()=>({updateSession:vi.fn(async()=>NextResponse.next())}));
import {updateSession} from '@/lib/supabase/middleware';
import {middleware} from './middleware';
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
it.each([
 'royal-command-ai-git-work-rcv3-219851-harry2park-afks-projects.vercel.app',
 'royal-command-ai-git-feat-indep-0be966-harry2park-afks-projects.vercel.app',
])('keeps education on the requested isolated Preview: %s',async host=>{
 vi.stubEnv('VERCEL_ENV','preview');
 const request=new NextRequest(`https://${host}/rcv3/learn?language=ko&country=AU`);
 const response=await middleware(request);
 expect(response.status).toBe(200);expect(response.headers.get('location')).toBeNull();
 expect(updateSession).toHaveBeenCalledWith(request,expect.any(Headers));
 expect(request.nextUrl.searchParams.get('language')).toBe('ko');
});
it('still blocks unregistered production hosts before authentication',async()=>{
 vi.stubEnv('VERCEL_ENV','production');const response=await middleware(new NextRequest('https://unregistered.invalid/rcv3/learn'));
 expect(response.status).toBe(404);expect(updateSession).not.toHaveBeenCalled();
});
