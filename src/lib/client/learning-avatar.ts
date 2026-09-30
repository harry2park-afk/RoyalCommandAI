import {Room,RoomEvent,Track} from 'livekit-client';
export type AvatarState='offline'|'connecting'|'ready'|'error';
type Connection={livekit_url:string;livekit_client_token:string;ws_url:string;receipt:string};
/** Per-mounted-classroom transport. No provider credential or audio is persisted. */
export class LearningAvatarPlayer{
 private room:Room|null=null;private socket:WebSocket|null=null;private receipt='';
 private pending:Promise<void>|null=null;private generation=0;private ready=false;
 private finish:((error?:Error)=>void)|null=null;private utterance='';private audio:HTMLAudioElement[]=[];
 private idle:ReturnType<typeof setTimeout>|undefined;
 constructor(private video:HTMLVideoElement,private state:(s:AvatarState)=>void,private primedAudio?:HTMLAudioElement){}
 private send(type:string,extra:Record<string,string>={}){if(this.socket?.readyState!==WebSocket.OPEN)throw Error('AVATAR');this.socket.send(JSON.stringify({type,event_id:crypto.randomUUID(),...extra}));}
 private release(receipt:string){if(receipt)void fetch('/api/rcv3/learn/avatar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'stop',receipt}),keepalive:true}).catch(()=>{});}
 async connect(){
  if(this.ready)return;if(this.pending)return this.pending;
  const generation=this.generation;this.state('connecting');
  const task=(async()=>{
   const r=await fetch('/api/rcv3/learn/avatar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'start'}),signal:AbortSignal.timeout(45000)});
   if(!r.ok)throw Error('AVATAR');const data=await r.json() as Connection;
   if(generation!==this.generation){this.release(data.receipt);throw Error('CANCELLED');}
   this.receipt=data.receipt;const room=new Room({adaptiveStream:true,dynacast:true});this.room=room;
   let videoReady:()=>void=()=>{};const videoPromise=new Promise<void>(resolve=>{videoReady=resolve;});
   room.on(RoomEvent.TrackSubscribed,track=>{if(generation!==this.generation)return;if(track.kind===Track.Kind.Video){track.attach(this.video);videoReady();}else if(track.kind===Track.Kind.Audio){const audio=(this.primedAudio?track.attach(this.primedAudio):track.attach()) as HTMLAudioElement;this.audio.push(audio);audio.play().catch(()=>{if(generation===this.generation){this.stop();this.state('error');}});}});
   room.on(RoomEvent.Disconnected,()=>{if(generation===this.generation){this.stop();this.state('error');}});
   const socket=new WebSocket(data.ws_url);this.socket=socket;
   const socketPromise=new Promise<void>((resolve,reject)=>{
    socket.onmessage=event=>{try{const message=JSON.parse(event.data);
     if(message.type==='session.state_updated'&&message.state==='connected')resolve();
     if(message.type==='error'){reject(Error('AVATAR'));this.finish?.(Error('AVATAR'));}
     if(message.source_event_id===this.utterance&&message.type==='agent.speak_ended')this.finish?.();
     if(message.source_event_id===this.utterance&&message.type==='agent.speak_interrupted')this.finish?.(Error('INTERRUPTED'));
    }catch{reject(Error('AVATAR'));}};
    socket.onerror=()=>{reject(Error('AVATAR'));if(generation===this.generation){this.stop();this.state('error');}};
    socket.onclose=()=>{reject(Error('AVATAR'));if(generation===this.generation){this.stop();this.state('error');}};
   });
   let timeout:ReturnType<typeof setTimeout>|undefined;
   try{await Promise.race([Promise.all([socketPromise,room.connect(data.livekit_url,data.livekit_client_token).then(()=>room.startAudio()),videoPromise]),new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(Error('AVATAR_TIMEOUT')),20000);})]);}finally{clearTimeout(timeout);}
   if(generation!==this.generation)throw Error('CANCELLED');this.ready=true;this.state('ready');
  })();this.pending=task;
  try{await task;}catch(error){if(generation===this.generation){this.stop();this.state('error');}throw error;}finally{if(this.pending===task)this.pending=null;}
 }
 async play(blob:Blob,signal:AbortSignal){
  if(signal.aborted)throw Error('CANCELLED');
  clearTimeout(this.idle);
  const generation=this.generation;
  const abort=()=>this.stop();signal.addEventListener('abort',abort,{once:true});
  try{
   await this.connect();if(signal.aborted)throw Error('CANCELLED');
   const context=new OfflineAudioContext(1,1,24000);const decoded=await context.decodeAudioData(await blob.arrayBuffer());
   if(signal.aborted||!this.ready)throw Error('CANCELLED');
   // decodeAudioData resamples to 24 kHz; mix all channels into signed PCM16.
   const pcm=new Uint8Array(decoded.length*2),view=new DataView(pcm.buffer);
   const channels=Array.from({length:decoded.numberOfChannels},(_,i)=>decoded.getChannelData(i));
   for(let i=0;i<decoded.length;i++){const sample=Math.max(-1,Math.min(1,channels.reduce((sum,c)=>sum+c[i],0)/channels.length));view.setInt16(i*2,sample<0?sample*32768:sample*32767,true);}
   this.utterance=crypto.randomUUID();
   let timer:ReturnType<typeof setTimeout>|undefined;
   const ended=new Promise<void>((resolve,reject)=>{this.finish=error=>{clearTimeout(timer);this.finish=null;if(error)reject(error);else resolve();};timer=setTimeout(()=>this.finish?.(Error('AVATAR_TIMEOUT')),Math.max(30000,decoded.duration*1000+30000));});
   // Attach a rejection handler before yielding while filling the socket buffer.
   void ended.catch(()=>{});
   for(let offset=0;offset<pcm.length;offset+=48000){
    if(signal.aborted||!this.ready)throw Error('CANCELLED');
    const bytes=pcm.subarray(offset,offset+48000);let binary='';for(let i=0;i<bytes.length;i++)binary+=String.fromCharCode(bytes[i]);
    this.send('agent.speak',{audio:btoa(binary),event_id:this.utterance});
    while((this.socket?.bufferedAmount??0)>192000){await new Promise(r=>setTimeout(r,25));if(signal.aborted||!this.ready)throw Error('CANCELLED');}
   }
   this.send('agent.speak_end');await ended;
   this.idle=setTimeout(()=>{if(generation===this.generation)this.stop();},30000);
  }catch(error){if(generation===this.generation){this.stop();this.state('error');}throw error;}finally{signal.removeEventListener('abort',abort);}
 }
 interrupt(){if(this.ready)try{this.send('agent.interrupt');}catch{}this.finish?.(Error('INTERRUPTED'));}
 stop(){
  this.generation++;clearTimeout(this.idle);this.pending=null;this.interrupt();this.ready=false;
  const socket=this.socket;this.socket=null;if(socket){socket.onclose=null;socket.onerror=null;socket.onmessage=null;socket.close();}
  const room=this.room;this.room=null;if(room)void room.disconnect();
  for(const audio of this.audio){audio.pause();audio.srcObject=null;if(audio!==this.primedAudio)audio.remove();}this.audio=[];this.video.srcObject=null;
  this.release(this.receipt);this.receipt='';this.state('offline');
 }
}
