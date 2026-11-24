import {notFound,redirect} from 'next/navigation';
import {session,RCV3_MARKER} from '@/lib/rcv3/access';
import {accountAnswerLanguage} from '@/lib/rcv3/answer-language';
import MeetingPreview from './MeetingPreview';
export const dynamic='force-dynamic';
export default async function Page(){
 if(process.env.VERCEL_ENV!=='preview'&&process.env.NODE_ENV!=='development')notFound();
 let access;try{access=await session();}catch(e){if(e instanceof Error&&e.message==='RCV3_AUTH')redirect('/login?next=%2Frcv3%2Fmeetings');throw e;}
 const {data:rooms,error}=await access.db.from('rooms').select('id,name').eq('room_owner_id',access.user.id).eq('description',RCV3_MARKER).eq('status','draft').limit(100);
 if(error)throw new Error('RCV3_STORAGE');
 return <MeetingPreview language={await accountAnswerLanguage(access)} rooms={rooms??[]}/>;
}
