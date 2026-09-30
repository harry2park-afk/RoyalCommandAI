import {createHmac,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
const base='https://api.liveavatar.com/v1/sessions';
export function avatarConfig(owner:string){
 const key=process.env.LIVEAVATAR_API_KEY?.trim(),avatar=process.env.LIVEAVATAR_AVATAR_ID?.trim();
 const allowed=(process.env.RC_LEARNING_AVATAR_OWNER_IDS??'').split(',').map(s=>s.trim()).includes(owner);
 return {key,avatar,ready:Boolean(allowed&&key&&z.string().uuid().safeParse(avatar).success&&process.env.RC_LEARNING_AVATAR_ENABLED==='true'),sandbox:process.env.LIVEAVATAR_SANDBOX!=='false'};
}
export function avatarReceipt(owner:string,id:string,key:string){
 const body=Buffer.from(JSON.stringify({owner,id,until:Date.now()+3600000})).toString('base64url');
 return body+'.'+createHmac('sha256',key).update('learning-avatar:'+body).digest('base64url');
}
export function receiptSession(receipt:string,owner:string,key:string){
 const [body,mac,...extra]=receipt.split('.');if(!body||!mac||extra.length)throw Error('RCV3_AUTH');
 const expected=createHmac('sha256',key).update('learning-avatar:'+body).digest();const given=Buffer.from(mac,'base64url');
 if(given.length!==expected.length||!timingSafeEqual(given,expected))throw Error('RCV3_AUTH');
 const value=z.object({owner:z.string(),id:z.string().uuid(),until:z.number()}).parse(JSON.parse(Buffer.from(body,'base64url').toString()));
 if(value.owner!==owner||value.until<Date.now())throw Error('RCV3_AUTH');return value.id;
}
export async function stopAvatar(id:string,key:string){
 const r=await fetch(base+'/stop',{method:'POST',headers:{'X-API-KEY':key,'Content-Type':'application/json'},body:JSON.stringify({session_id:id,reason:'USER_CLOSED'}),signal:AbortSignal.timeout(7000),cache:'no-store'});
 if(!r.ok)throw Error('RCV3_AVATAR');
}
const socketUrl=z.string().url().refine(s=>new URL(s).protocol==='wss:');
const started=z.object({session_id:z.string().uuid(),livekit_url:socketUrl,livekit_client_token:z.string().min(1),ws_url:socketUrl});
export async function startAvatar(owner:string,signal:AbortSignal){
 const config=avatarConfig(owner);if(!config.ready||!config.key||!config.avatar)throw Error('RCV3_AVATAR_UNAVAILABLE');
 const r=await fetch(base+'/token',{method:'POST',headers:{'X-API-KEY':config.key,'Content-Type':'application/json'},body:JSON.stringify({mode:'LITE',avatar_id:config.avatar,is_sandbox:config.sandbox,max_session_duration:config.sandbox?60:600,video_settings:{quality:'high',encoding:'H264'}}),signal:AbortSignal.timeout(10000),cache:'no-store'});
 if(!r.ok)throw Error('RCV3_AVATAR');
 const token=z.object({session_id:z.string().uuid(),session_token:z.string().min(1)}).parse((await r.json()).data);
 try{
  if(signal.aborted)throw Error('RCV3_AVATAR');
  const response=await fetch(base+'/start',{method:'POST',headers:{Authorization:`Bearer ${token.session_token}`},signal:AbortSignal.timeout(20000),cache:'no-store'});
  if(!response.ok)throw Error('RCV3_AVATAR');const data=started.parse((await response.json()).data);
  if(signal.aborted||data.session_id!==token.session_id)throw Error('RCV3_AVATAR');
  return {...data,receipt:avatarReceipt(owner,token.session_id,config.key)};
 }catch{await stopAvatar(token.session_id,config.key).catch(()=>{});throw Error('RCV3_AVATAR');}
}
