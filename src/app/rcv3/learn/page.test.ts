import {afterEach,expect,it,vi} from 'vitest';
vi.mock('next/navigation',()=>({notFound:()=>{throw Error('NOT_FOUND');},redirect:(url:string)=>{throw Error(url);}}));
import Page from './page';
afterEach(()=>vi.unstubAllEnvs());
it('retires the old UI and preserves language and country on the fixed replacement host',async()=>{
 vi.stubEnv('VERCEL_ENV','preview');await expect(Page({searchParams:Promise.resolve({language:'ko',country:'AU',next:'https://untrusted.invalid'})})).rejects.toThrow('https://royal-command-ai-git-work-rcv3-219851-harry2park-afks-projects.vercel.app/rcv3/learn?language=ko&country=AU&revision=20260930-education');
});
it('never enables the Preview handoff on production',async()=>{
 vi.stubEnv('VERCEL_ENV','production');await expect(Page({searchParams:Promise.resolve({})})).rejects.toThrow('NOT_FOUND');
});
