import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({rooms:[] as any[]}));
vi.mock('livekit-client',()=>({Track:{Kind:{Video:'video',Audio:'audio'}},RoomEvent:{TrackSubscribed:'track',Disconnected:'disconnect'},Room:class{
 handlers:Record<string,(arg?:any)=>void>={};constructor(){m.rooms.push(this);}on(k:string,f:(arg?:any)=>void){this.handlers[k]=f;}connect=vi.fn(async()=>{this.handlers.track({kind:'video',attach:vi.fn()});});startAudio=vi.fn(async()=>{});disconnect=vi.fn(async()=>{});
}}));
import {LearningAvatarPlayer} from './learning-avatar';
class Socket{
 static OPEN=1;static all:Socket[]=[];readyState=1;bufferedAmount=0;onmessage:((e:{data:string})=>void)|null=null;onclose:(()=>void)|null=null;onerror:(()=>void)|null=null;
 sent:any[]=[];constructor(){Socket.all.push(this);}send(s:string){this.sent.push(JSON.parse(s));}close=vi.fn();event(v:unknown){this.onmessage?.({data:JSON.stringify(v)});}
}
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
beforeEach(()=>{vi.useFakeTimers();m.rooms=[];Socket.all=[];vi.stubGlobal('WebSocket',Socket);vi.stubGlobal('OfflineAudioContext',class{decodeAudioData=vi.fn(async()=>({length:4,numberOfChannels:1,duration:1,getChannelData:()=>new Float32Array([0,1,-1,.5])}));});vi.stubGlobal('fetch',vi.fn(async(_url,options)=>JSON.parse(options.body).action==='start'?Response.json({livekit_url:'wss://room.test',livekit_client_token:'client',ws_url:'wss://avatar.test',receipt:'owned'}):Response.json({stopped:true})));});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it('waits for provider connected, sends PCM and completes only its own utterance; idle releases session',async()=>{
 const state=vi.fn(),player=new LearningAvatarPlayer({srcObject:null} as HTMLVideoElement,state),signal=new AbortController();let ended=false;
 const task=player.play(new Blob(['audio']),signal.signal).then(()=>{ended=true;});await flush();const ws=Socket.all[0];expect(ws.sent).toHaveLength(0);
 ws.event({type:'session.state_updated',state:'connected'});await flush();expect(ws.sent.map(x=>x.type)).toEqual(['agent.speak','agent.speak_end']);
 expect(ws.sent[0].audio).toBe('AAD/fwCA/z8=');ws.event({type:'agent.speak_ended',source_event_id:'old'});await flush();expect(ended).toBe(false);
 ws.event({type:'agent.speak_ended',source_event_id:ws.sent[0].event_id});await task;expect(state).toHaveBeenCalledWith('ready');await vi.advanceTimersByTimeAsync(30000);expect(ws.close).toHaveBeenCalled();expect(JSON.parse(vi.mocked(fetch).mock.calls.at(-1)![1]!.body as string)).toEqual({action:'stop',receipt:'owned'});
});
it('Stop interrupts current speech, releases resources and rejects pending playback',async()=>{
 const player=new LearningAvatarPlayer({srcObject:null} as HTMLVideoElement,vi.fn());const task=player.play(new Blob(['a']),new AbortController().signal);void task.catch(()=>{});await flush();const ws=Socket.all[0];ws.event({type:'session.state_updated',state:'connected'});await flush();player.stop();await expect(task).rejects.toThrow('INTERRUPTED');expect(ws.sent.at(-1).type).toBe('agent.interrupt');expect(m.rooms[0].disconnect).toHaveBeenCalled();
});
it('late start response after Stop is closed without joining its room',async()=>{
 let resolve!:(r:Response)=>void;vi.mocked(fetch).mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));const player=new LearningAvatarPlayer({srcObject:null} as HTMLVideoElement,vi.fn());const task=player.connect();void task.catch(()=>{});player.stop();resolve(Response.json({receipt:'late'}));await expect(task).rejects.toThrow('CANCELLED');expect(m.rooms).toHaveLength(0);expect(JSON.parse(vi.mocked(fetch).mock.calls.at(-1)![1]!.body as string).receipt).toBe('late');
});
