import {applyButtonAppearance} from './button-appearance.mjs';
// Shared browser component. Mount once in the application shell, outside route content.
// Host supplies transcribe(blob,{signal}) with authenticated server-side credentials.
const template=document.createElement('template');
template.innerHTML=`<style>
:host{display:block;color:#f1f5ff;font:15px system-ui,sans-serif}*{box-sizing:border-box}.dock{display:flex;align-items:center;gap:12px;padding:12px 16px;border:0;border-radius:0;background:transparent;box-shadow:none;max-width:540px}button{flex:none;width:var(--rc-control-width,50px);height:var(--rc-control-height,30px);border-radius:8px;border:0;background:transparent;color:#8fffe2;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px}button:focus-visible{outline:3px solid #fff;outline-offset:4px}button:disabled{opacity:.45;cursor:wait}button[aria-pressed=true]{background:#14645c33;box-shadow:none}svg{pointer-events:none;width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round}.body{min-width:0;flex:1}canvas{width:100%;height:42px;display:block}.status{font-size:13px;color:#bed3df;min-height:20px;overflow-wrap:anywhere}.error{color:#ffb4ac}@media(prefers-reduced-motion:reduce){.dock{box-shadow:none}}</style>
<div class="dock"><button type="button" aria-label="Start microphone" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0014 0v-2M12 19v3M8 22h8"/></svg><span class="custom-label"></span></button><div class="body"><canvas aria-hidden="true"></canvas><div class="status" role="status" aria-live="polite">마이크 준비 중</div></div></div>`;
export class RCVoiceControl extends HTMLElement {
 autoSubmit=false; conversationActive=false;
 cancel(){this.conversationActive=false;this.#generation++;this.#cleanup();this.#idle();}
 setAppearance(patch){return applyButtonAppearance(this.button,this.shadowRoot.querySelector('.custom-label'),patch);}
 #setupTimer; #recordingTimer; #stream; #context; #recorder; #frame; #abort; #generation=0; #busy=false; #transcribe; #samples=[]; #lastBar=0;
 constructor(){super();this.attachShadow({mode:'open'}).append(template.content.cloneNode(true));this.button=this.shadowRoot.querySelector('button');this.status=this.shadowRoot.querySelector('.status');this.canvas=this.shadowRoot.querySelector('canvas');this.button.addEventListener('click',()=>{const enabled=this.autoSubmit?!this.conversationActive:this.#recorder?.state!=='recording';this.conversationActive=enabled;this.dispatchEvent(new CustomEvent('voice-toggle',{detail:{enabled},bubbles:true,composed:true}));if(enabled)this.start();else if(this.autoSubmit)this.cancel();else this.stop();});}
 set transcribe(adapter){this.#transcribe=adapter;if(this.isConnected&&!this.#busy)this.#idle();}
 connectedCallback(){this.#idle();}
 disconnectedCallback(){this.#generation++;this.#cleanup();}
 #idle(){this.button.disabled=typeof this.#transcribe!=='function';this.#state(this.button.disabled?'음성 연결 준비가 필요합니다':'눌러서 말씀하세요',this.button.disabled);this.#draw(0);}
 setButtonSize(width,height){if(!Number.isFinite(width)||!Number.isFinite(height)||width<30||width>300||height<24||height>120)throw new Error('INVALID_BUTTON_SIZE');this.style.setProperty('--rc-control-width',width+'px');this.style.setProperty('--rc-control-height',height+'px');}
 #state(text,error=false){this.status.textContent=text;this.status.classList.toggle('error',error);}
 async start(){
  if(this.#busy||typeof this.#transcribe!=='function')return;
  this.#busy=true;const generation=++this.#generation;this.button.disabled=true;this.#state('마이크 권한 확인 중');
  this.#setupTimer=setTimeout(()=>{if(generation===this.#generation){this.#generation++;this.#cleanup();this.#state('마이크 준비 시간이 초과됐습니다. 다시 눌러주세요.',true);}},20000);
  try{
   if(!navigator.mediaDevices?.getUserMedia||!globalThis.MediaRecorder)throw new Error('UNSUPPORTED');
   const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
   if(generation!==this.#generation){stream.getTracks().forEach(t=>t.stop());return;}
   this.#stream=stream;this.#context=new AudioContext();await this.#context.resume();
   if(generation!==this.#generation)return;
   const analyser=this.#context.createAnalyser();analyser.fftSize=256;this.#context.createMediaStreamSource(stream).connect(analyser);
   const data=new Uint8Array(analyser.fftSize);this.#samples=[];this.#lastBar=0;let heard=false,lastSpeech=performance.now();
   const tick=()=>{analyser.getByteTimeDomainData(data);const rms=Math.sqrt(data.reduce((sum,n)=>sum+((n-128)/128)**2,0)/data.length);this.#draw(rms);if(rms>.025){heard=true;lastSpeech=performance.now();}if(this.autoSubmit&&heard&&performance.now()-lastSpeech>1400&&this.#recorder?.state==='recording'){this.stop();return;}this.#frame=requestAnimationFrame(tick);};tick();
   const chunks=[];const recorder=new MediaRecorder(stream);this.#recorder=recorder;
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   recorder.onerror=()=>{this.#generation++;this.#cleanup();this.#state('녹음에 실패했습니다. 다시 눌러주세요.',true);};
   recorder.onstop=async()=>{
    if(generation!==this.#generation)return;
    this.#cleanup(false);this.#busy=true;this.button.disabled=true;this.#state('말씀을 글로 바꾸는 중');
    const controller=new AbortController();this.#abort=controller;const timer=setTimeout(()=>controller.abort(),20000);
    try{const signal=this.#abort.signal;const text=await Promise.race([this.#transcribe(new Blob(chunks,{type:recorder.mimeType}),{signal}),new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('CANCELLED')),{once:true}))]);
     if(generation!==this.#generation)return;
     if(typeof text!=='string'||!text.trim())throw new Error('EMPTY');
     this.dispatchEvent(new CustomEvent('transcript',{detail:{text},bubbles:true,composed:true}));this.#state('입력했습니다. 다시 말씀하실 수 있습니다');
    }catch{if(generation===this.#generation)this.#state('음성을 글로 바꾸지 못했습니다. 다시 눌러주세요.',true);}
    finally{clearTimeout(timer);if(generation===this.#generation){this.#busy=false;this.button.disabled=false;this.#abort=undefined;if(this.autoSubmit&&this.conversationActive){this.button.setAttribute('aria-label','Stop voice conversation');this.button.setAttribute('aria-pressed','true');}}}
   };
   stream.getAudioTracks()[0].onended=()=>{if(generation===this.#generation){this.#generation++;this.#cleanup();this.#state('마이크 연결이 끊겼습니다. 다시 연결해 주세요.',true);}};
   clearTimeout(this.#setupTimer);recorder.start();this.#recordingTimer=setTimeout(()=>this.stop(),60000);this.button.disabled=false;this.button.setAttribute('aria-pressed','true');this.button.setAttribute('aria-label','Stop voice conversation');this.#state(this.autoSubmit?'듣고 있습니다':'듣고 있습니다 · 다시 누르면 전송');
  }catch(error){if(generation!==this.#generation)return;this.conversationActive=false;this.dispatchEvent(new CustomEvent('voice-toggle',{detail:{enabled:false},bubbles:true,composed:true}));this.#cleanup();this.#state(error.name==='NotAllowedError'?'브라우저에서 마이크 사용을 허용해 주세요.':error.name==='NotFoundError'?'연결된 마이크를 찾을 수 없습니다.':'마이크를 시작하지 못했습니다. 다시 눌러주세요.',true);}
 }
 stop(){if(this.#recorder?.state==='recording'){this.button.disabled=true;this.#recorder.stop();}}
 #cleanup(abort=true){clearTimeout(this.#setupTimer);clearTimeout(this.#recordingTimer);cancelAnimationFrame(this.#frame);if(abort)this.#abort?.abort();if(this.#recorder){this.#recorder.onstop=null;this.#recorder.onerror=null;if(this.#recorder.state==='recording')this.#recorder.stop();}this.#recorder=undefined;this.#stream?.getTracks().forEach(t=>{t.onended=null;t.stop();});this.#stream=undefined;this.#context?.close().catch(()=>{});this.#context=undefined;this.#busy=false;this.button.disabled=false;this.button.setAttribute('aria-pressed','false');this.button.setAttribute('aria-label','Start microphone');}
 #draw(level){const c=this.canvas;const ratio=devicePixelRatio||1;const width=c.clientWidth||240;c.width=width*ratio;c.height=42*ratio;const ctx=c.getContext('2d');ctx.scale(ratio,ratio);ctx.clearRect(0,0,width,42);const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const now=performance.now();if(now-this.#lastBar>=70){this.#samples.unshift(Math.min(1,level*5));this.#lastBar=now;}this.#samples.length=Math.min(this.#samples.length,Math.ceil(width/8));const gradient=ctx.createLinearGradient(0,0,width,0);gradient.addColorStop(0,'#8affdb');gradient.addColorStop(1,'#679dff');ctx.strokeStyle=gradient;ctx.lineWidth=1;ctx.lineCap='round';ctx.beginPath();for(let x=0;x<width;x+=8){const value=reduced?Math.min(1,level*5):(this.#samples[x/8]||0);const h=1+value*18;ctx.moveTo(x,21-h);ctx.lineTo(x,21+h);}ctx.stroke();}
}
if(!customElements.get('rc-voice-control'))customElements.define('rc-voice-control',RCVoiceControl);
