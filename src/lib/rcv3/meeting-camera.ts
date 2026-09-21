// Local camera preview only. No microphone, recording, signalling or network media upload.
const MODEL_BASE='https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/';
type Result={image:CanvasImageSource;segmentationMask:CanvasImageSource};
type Segmenter={setOptions:(o:{modelSelection:number})=>void;onResults:(fn:(r:Result)=>void)=>void;send:(o:{image:HTMLVideoElement})=>Promise<void>;close:()=>Promise<void>};
type Constructor=new(o:{locateFile:(file:string)=>string})=>Segmenter;
let loading:Promise<Constructor>|undefined;
function model(){
 if(loading)return loading;
 loading=new Promise<Constructor>((resolve,reject)=>{
  const existing=(window as Window&{SelfieSegmentation?:Constructor}).SelfieSegmentation;
  if(existing){resolve(existing);return;}
  const script=document.createElement('script');let settled=false;
  const finish=(ok:boolean)=>{if(settled)return;settled=true;clearTimeout(timer);script.onload=null;script.onerror=null;const ctor=(window as Window&{SelfieSegmentation?:Constructor}).SelfieSegmentation;if(ok&&ctor)resolve(ctor);else{script.remove();reject(new Error('MODEL'));}};
  const timer=setTimeout(()=>finish(false),20000);
  script.src=MODEL_BASE+'selfie_segmentation.js';script.crossOrigin='anonymous';script.onload=()=>finish(true);script.onerror=()=>finish(false);document.head.append(script);
 }).catch(e=>{loading=undefined;throw e;});return loading;
}
function deadline<T>(work:Promise<T>):Promise<T>{return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('TIMEOUT')),20000);work.then(v=>{clearTimeout(timer);resolve(v);},e=>{clearTimeout(timer);reject(e);});});}
export class MeetingCamera {
 private generation=0;private stream:MediaStream|null=null;private segmenter:Segmenter|null=null;private frame=0;private pending:Promise<void>|null=null;
 constructor(private video:HTMLVideoElement,private canvas:HTMLCanvasElement,private settings:()=>{background:HTMLImageElement|null;deskTop:number;zoom:number;offset:number;brightness:number},private failure:()=>void){}
 stop(){
  ++this.generation;cancelAnimationFrame(this.frame);this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.video.pause();this.video.srcObject=null;
  const segmenter=this.segmenter;this.segmenter=null;
  if(segmenter)void Promise.resolve(this.pending).catch(()=>{}).then(()=>segmenter.close()).catch(()=>{});
  this.canvas.getContext('2d')?.clearRect(0,0,this.canvas.width,this.canvas.height);
 }
 async start(){
  this.stop();const token=this.generation;
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('CAMERA');
  const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{width:{ideal:1280},height:{ideal:720},facingMode:'user'}});
  if(token!==this.generation){stream.getTracks().forEach(t=>t.stop());return false;}
  this.stream=stream;this.video.srcObject=stream;
  try{
   await deadline(this.video.play());const Constructor=await model();if(token!==this.generation)return false;
   const segmenter=new Constructor({locateFile:file=>MODEL_BASE+file});this.segmenter=segmenter;
   segmenter.setOptions({modelSelection:1});segmenter.onResults(result=>{if(token===this.generation)this.draw(result);});
   const tick=async()=>{
    if(token!==this.generation)return;
    try{const sending=segmenter.send({image:this.video});this.pending=sending;await deadline(sending);if(this.pending===sending)this.pending=null;if(token===this.generation)this.frame=requestAnimationFrame(()=>void tick());}
    catch{if(token===this.generation){this.stop();this.failure();}}
   };
   // Complete the first processed frame before reporting an active preview.
   const sending=segmenter.send({image:this.video});this.pending=sending;await deadline(sending);if(this.pending===sending)this.pending=null;
   if(token!==this.generation)return false;
   stream.getVideoTracks().forEach(t=>t.addEventListener('ended',()=>{if(token===this.generation){this.stop();this.failure();}},{once:true}));
   this.frame=requestAnimationFrame(()=>void tick());return true;
  }catch(e){if(token===this.generation)this.stop();throw e;}
 }
 private draw(result:Result){
  const {background,deskTop,zoom,offset,brightness}=this.settings();const ctx=this.canvas.getContext('2d');if(!ctx||!background?.complete||!background.naturalWidth)return;
  const w=this.canvas.width,h=this.canvas.height;const dw=w*zoom,dh=h*zoom,x=w*0.41-dw/2,y=(h-dh)/2+offset*h;
  ctx.save();ctx.clearRect(0,0,w,h);ctx.save();ctx.beginPath();ctx.rect(w*0.26,0,w*0.29,h);ctx.clip();ctx.drawImage(result.segmentationMask,x,y,dw,dh);ctx.globalCompositeOperation='source-in';ctx.filter=`brightness(${brightness})`;ctx.drawImage(result.image,x,y,dw,dh);ctx.restore();ctx.filter='none';ctx.globalCompositeOperation='destination-over';ctx.drawImage(background,0,0,w,h);ctx.globalCompositeOperation='source-over';
  // Restore foreground desk above the participant, giving a seated-behind-desk view.
  const top=Math.round(h*deskTop);const sourceTop=Math.round(background.naturalHeight*deskTop);
  ctx.drawImage(background,0,sourceTop,background.naturalWidth,background.naturalHeight-sourceTop,0,top,w,h-top);ctx.restore();
 }
}
