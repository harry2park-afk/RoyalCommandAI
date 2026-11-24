import {applyButtonAppearance} from './button-appearance.mjs';
// Shared send control. Host binds the same submit action as the text composer.
// Disabled until connected; does not claim to send merely by dispatching an event.
export class RCSendControl extends HTMLElement {
 setAppearance(patch){return applyButtonAppearance(this.button,this.shadowRoot.querySelector('.custom-label'),patch);}
 #send; #busy=false;
 constructor(){
  super();this.attachShadow({mode:'open'}).innerHTML=`<style>
  :host{display:inline-block}button{box-sizing:border-box;width:var(--rc-control-width,50px);height:var(--rc-control-height,30px);border:1px solid #bdd5e02e;border-radius:8px;background:#15253755;color:#a6d8e9;display:flex;align-items:center;justify-content:center;gap:4px;cursor:pointer}button:focus-visible{outline:2px solid #a6d8e9;outline-offset:3px}button:disabled{opacity:.4;cursor:default}svg{pointer-events:none;width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linejoin:round}</style><button type="button" aria-label="Send" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3L3 10l7 3 3 8 8-18ZM10 13L21 3"/></svg><span class="custom-label"></span></button>`;
  this.button=this.shadowRoot.querySelector('button');
  this.button.addEventListener('click',async()=>{
   if(this.#busy||!this.#send)return;
   this.#busy=true;this.button.disabled=true;this.button.setAttribute('aria-busy','true');
   try{await this.#send();}
   catch{this.dispatchEvent(new CustomEvent('send-error',{bubbles:true,composed:true,detail:{code:'SEND_FAILED'}}));}
   finally{this.#busy=false;this.button.disabled=!this.#send;this.button.removeAttribute('aria-busy');}
  });
 }
 set submit(handler){this.#send=typeof handler==='function'?handler:undefined;this.button.disabled=this.#busy||!this.#send;}
 setButtonSize(width,height){if(!Number.isFinite(width)||!Number.isFinite(height)||width<30||width>300||height<24||height>120)throw new Error('INVALID_BUTTON_SIZE');this.style.setProperty('--rc-control-width',width+'px');this.style.setProperty('--rc-control-height',height+'px');}
}
if(!customElements.get('rc-send-control'))customElements.define('rc-send-control',RCSendControl);
