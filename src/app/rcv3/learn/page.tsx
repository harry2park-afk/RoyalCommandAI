import {notFound,redirect} from 'next/navigation';
export const dynamic='force-dynamic';
/** Retired Preview entry. The active education branch owns the course UI and authentication. */
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 if(process.env.VERCEL_ENV!=='preview')notFound();
 const query=await searchParams;
 const target=new URL('https://royal-command-ai-git-work-rcv3-219851-harry2park-afks-projects.vercel.app/rcv3/learn');
 for(const key of ['language','country']){const value=query[key];if(typeof value==='string'&&/^[a-zA-Z_-]{2,12}$/.test(value))target.searchParams.set(key,value);}
 // Avoid browsers reusing the retired permanent redirect from the active host.
 target.searchParams.set('revision','20260930-education');
 redirect(target.toString());
}
