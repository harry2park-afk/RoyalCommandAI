type Format='pcm'|'blob';
type Entry={text:string;format:Format;abort:AbortController;response:Promise<Response>;expiry:ReturnType<typeof setTimeout>};
/** One private, short-lived first paragraph; never creates audio playback. */
export class PreparedLearningSpeech{
 private entry:Entry|null=null;
 constructor(private request:(text:string,format:Format,signal:AbortSignal)=>Promise<Response>){}
 prepare(text:string,format:Format){
  this.clear();
  if(!text.trim())return;
  const abort=new AbortController();
  const entry={text:text.slice(0,3500),format,abort} as Entry;
  entry.expiry=setTimeout(()=>{if(this.entry===entry)this.clear();},120000);
  // Keep the body unread until the explicit Start gesture. Browser stream
  // backpressure bounds buffering; no decoded audio or persistent cache exists.
  const timeout=setTimeout(()=>abort.abort(),35000);
  entry.response=this.request(entry.text,format,abort.signal).then(r=>{
   clearTimeout(timeout);
   if(!r.ok)throw Error('SPEECH');
   if(abort.signal.aborted){void r.body?.cancel().catch(()=>{});throw Error('CANCELLED');}
   return r;
  });
  this.entry=entry;
  void entry.response.catch(()=>{clearTimeout(timeout);if(this.entry===entry)this.clear();});
 }
 async consume<T>(text:string,format:Format,signal:AbortSignal,read:(response:Response)=>Promise<T>):Promise<T>{
  const entry=this.entry;
  if(!entry||entry.text!==text||entry.format!==format){
   this.clear();
   if(signal.aborted)throw Error('CANCELLED');
   return read(await this.request(text,format,signal));
  }
  this.entry=null;clearTimeout(entry.expiry);
  const abort=()=>entry.abort.abort();
  signal.addEventListener('abort',abort,{once:true});
  try{
   if(signal.aborted){abort();throw Error('CANCELLED');}
   const response=await entry.response;
   if(signal.aborted)throw Error('CANCELLED');
   return await read(response);
  }finally{signal.removeEventListener('abort',abort);entry.abort.abort();}
 }
 clear(){
  const entry=this.entry;this.entry=null;
  if(!entry)return;
  clearTimeout(entry.expiry);entry.abort.abort();
  void entry.response?.then(r=>r.body?.cancel().catch(()=>{})).catch(()=>{});
 }
}
