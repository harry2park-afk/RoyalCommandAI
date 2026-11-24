import {notFound,redirect} from 'next/navigation';
import {session} from '@/lib/rcv3/access';
import {ownCertificate} from '@/lib/rcv3/learning/store';
import PrintButton from '../PrintButton';
import styles from '../../learn.module.css';
export const dynamic='force-dynamic';
export default async function CertificatePage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[a-f0-9-]{36}$/i.test(id))notFound();
 const ctx=await session().catch(e=>{if(e instanceof Error&&e.message==='RCV3_AUTH')redirect(`/login?next=${encodeURIComponent('/rcv3/learn/certificate/'+id)}`);throw e;});
 const c=await ownCertificate(ctx.user.id,id);if(!c)notFound();
 return <main className={styles.certificate}><p>ROYAL COMMAND</p><h1>Certificate of Completion</h1><p>AI Literacy · 100 Lessons · 30-Day Programme</p><p>This certifies that</p><h2>{c.name}</h2><p>completed 100 AI theory and applied learning topics, including AI-assessed written assignments, and passed the final knowledge assessment.</p><p>Final score: <strong>{c.score} / 100</strong> · Pass mark: 70</p><p>Issued: {new Date(c.issuedAt).toLocaleDateString('en-AU',{timeZone:'Australia/Sydney',year:'numeric',month:'long',day:'numeric'})}</p><p>Certificate ID<br/><code>{c.id}</code></p><footer>Issued by Royal Command · Self-paced, unproctored course. The 30-day schedule is a learning plan, not a verified attendance period.<br/>This is a course completion record, not an accredited qualification or professional licence.<br/>The recipient name is taken from the account profile.</footer><nav><a href="/rcv3/learn">← AI Learning Room</a><PrintButton/></nav></main>;
}
