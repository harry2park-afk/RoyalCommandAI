// Component integration test with an in-memory API fixture; no customer service
// credentials, paid requests, or external calls are used. Not a live Preview test.
import {chromium} from 'playwright-core';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {TOOL_REGISTRY,createToolButton} from '../../rcv3/tool-registry.mjs';
import {createServer} from 'vite';
import {resolve} from 'node:path';
import {validateDesign} from '../../rcv3/core.mjs';
const server=await createServer({configFile:false,root:process.cwd(),publicDir:'public',resolve:{alias:{'@':resolve('src')}},esbuild:{jsx:'automatic'},server:{host:'127.0.0.1',port:4317,strictPort:true}});
await server.listen();
const origin='http://127.0.0.1:4317';
const room='11111111-1111-4111-8111-111111111111', second='22222222-2222-4222-8222-222222222222';
const stateFor=()=>({release:'rcv3-1',name:'Test room',revision:1,connectedProviders:['openai'],selectedProviders:['openai'],secretaryRoomId:null,gmailEnabled:false,design:{backgroundAssetId:null,buttons:[createToolButton('chat',crypto.randomUUID())]},appearances:{},bindings:{}});
const states={[room]:stateFor(),[second]:stateFor()};for(const state of Object.values(states))state.bindings=Object.fromEntries(state.design.buttons.map(b=>[b.id,b.capability]));
const histories={[room]:[],[second]:[]},files={[room]:[],[second]:[]};let rejectWrite=false,audioRequests=0;
const browser=await chromium.launch({executablePath:process.env.RC_BROWSER_PATH||'/tmp/rc-browser/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write']});
 await context.addInitScript(()=>{
  window.__mockSpeech=null;
  window.SpeechRecognition=class{start(){window.__mockSpeech=this;}stop(){this.onend?.();}abort(){this.onend?.();}};
  HTMLMediaElement.prototype.play=function(){setTimeout(()=>this.dispatchEvent(new Event('ended')),20);return Promise.resolve();};
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/**',async route=>{
  const request=route.request(),url=new URL(request.url());const data=request.method()==='GET'?{}:request.postDataJSON();const id=data.roomId||url.searchParams.get('room')||room;
  let result={};let status=200;
  if(url.pathname==='/api/rcv3/rooms')result={rooms:[{id:room,name:'Test room'},{id:second,name:'Second room'}]};
  else if(url.pathname==='/api/rcv3/state'){
   if(request.method()==='PUT'){
    if(rejectWrite){rejectWrite=false;status=409;result={error:'Could not save',code:'RCV3_CONFLICT'};}
    else{assert.equal(data.revision,states[id].revision);validateDesign(data.state.design);states[id]=data.state;result={state:states[id]};}
   }else result={state:states[id],background:null};
  }else if(url.pathname==='/api/rcv3/chat'){
   if(request.method()==='GET')result={turns:histories[id]};else{result={requestId:crypto.randomUUID(),scope:'chat',provider:'openai',prompt:data.prompt,answer:'Fixture answer for '+data.prompt,at:new Date().toISOString(),durationMs:5};histories[id].push(result);}
  }else if(url.pathname==='/api/rcv3/files'){
   if(request.method()==='GET')result={files:files[id]};else{files[id].push(data.file);result={ok:true};}
  }else if(url.pathname==='/api/rcv3/asset')result={id:'44444444-4444-4444-8444-444444444444',image:data.image};
  else if(url.pathname==='/api/rcv3/audio'){audioRequests++;await route.fulfill({status:200,contentType:'audio/wav',body:Buffer.alloc(100)});return;}
  else if(url.pathname==='/api/ui/help')result={text:'Translated tool help',language:'ko'};
  else throw new Error('Unexpected API request '+url.pathname);
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(result)});
 });
 const open=async()=>{await page.goto(origin+'/tests/rcv3-toolbox/index.html');await page.locator('header [data-rc-tool="toolbox"]').waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('header [data-rc-tool="toolbox"]').disabled);};
 const tile=id=>page.locator(`[aria-label="Room layout"] [data-rc-tool="${id}"]`);
 const tools=async()=>{await page.locator('header [data-rc-tool="toolbox"]').click();await page.getByRole('dialog',{name:'Toolbox',exact:true}).waitFor();};
 const close=()=>page.getByRole('button',{name:'Close',exact:true}).click();
 await open();await tools();
 assert.equal(await page.locator('[data-tool-card]').count(),TOOL_REGISTRY.length);
 for(const tool of TOOL_REGISTRY.filter(tool=>tool.id!=='chat')){
  const card=page.locator(`[data-tool-card="${tool.id}"]`);await card.getByRole('button',{name:'Add to Room',exact:true}).click();await card.getByRole('button',{name:'Added',exact:true}).waitFor();
 }
 assert.equal(states[room].design.buttons.length,TOOL_REGISTRY.length);await close();
 await page.screenshot({path:'/tmp/rc-toolbox-room.png',fullPage:true});
 await open();assert.equal(await page.locator('[aria-label="Room layout"] [data-rc-tool]').count(),TOOL_REGISTRY.length);
 // Send and Copy use the same conversation as existing controls.
 await page.getByRole('textbox',{name:'Message',exact:true}).fill('hello');await tile('send').click();await page.getByText('Fixture answer for hello',{exact:true}).waitFor();
 await tile('copy-answer').click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'Fixture answer for hello');
 await tile('speaker').click();await page.waitForFunction(()=>document.querySelector('[aria-label="ChatGPT speaker on"]'));await page.waitForTimeout(100);assert.ok(audioRequests>0);await tile('speaker').click();
 // Microphone start/stop must preserve draft and use original voice-toggle path.
 await page.getByRole('textbox',{name:'Message',exact:true}).fill('draft');await tile('microphone').click();
 await page.evaluate(()=>{const s=window.__mockSpeech;if(!s)throw new Error('No speech session');s.onresult({resultIndex:0,results:[Object.assign([{transcript:'spoken'}],{isFinal:true})]});});
 await page.waitForFunction(()=>document.querySelector('[aria-label=Message]').value==='draft spoken');assert.equal(await page.getByRole('textbox',{name:'Message',exact:true}).inputValue(),'draft spoken');await tile('microphone').click();
 await tile('files').click();await page.getByRole('heading',{name:'Files',exact:true}).waitFor();await page.getByRole('button',{name:'Close Files'}).click();
 const chooserPromise=page.waitForEvent('filechooser');await tile('upload-file').click();const chooser=await chooserPromise;await chooser.setFiles({name:'note.txt',mimeType:'text/plain',buffer:Buffer.from('Fixture note')});await page.getByRole('button',{name:'note.txt',exact:true}).waitFor();assert.equal(files[room].length,1);await page.getByRole('button',{name:'Close Files'}).click();
 // Background Cancel restores the previous design, not a stale editor snapshot.
 const before=structuredClone(states[room].design);const imagePromise=page.waitForEvent('filechooser');await tile('background').click();await (await imagePromise).setFiles({name:'pixel.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jgE0AAAAASUVORK5CYII=','base64')});await page.getByRole('group',{name:'Button editor'}).waitFor();await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.deepEqual(states[room].design,before);assert.equal(await page.locator('[aria-label="Room layout"]').evaluate(el=>el.style.backgroundImage),'');
 await tile('helper').click();await page.getByRole('dialog',{name:'AI Helper',exact:true}).waitFor();await close();
 await tile('ai-list').click();await page.getByRole('heading',{name:'Select AIs'}).waitFor();await close();
 await tile('personal-ai').click();await page.getByRole('dialog',{name:'My AI account',exact:true}).getByRole('button',{name:'My AI account ▾'}).click();assert.equal(await page.getByRole('link',{name:'Claude ↗'}).getAttribute('href'),'https://claude.ai/');await close();
 // Explicit remove, save, failed re-add and retry: neither duplicate nor phantom.
 await tile('edit-buttons').click();const handle=page.getByRole('button',{name:'Move Button Settings'});await handle.focus();for(let i=0;i<65;i++)await handle.press('ArrowLeft');await tile('copy-answer').click();await page.getByRole('button',{name:'Remove',exact:true}).click();await page.getByRole('button',{name:'Save',exact:true}).click();await page.getByRole('group',{name:'Button editor'}).waitFor({state:'hidden'});await page.waitForFunction(()=>!document.querySelector('header [data-rc-tool="toolbox"]').disabled);
 await tools();rejectWrite=true;await page.locator('[data-tool-card="copy-answer"]').getByRole('button',{name:'Add to Room'}).click();await page.getByText(/Could not save/).waitFor();assert.equal(states[room].design.buttons.filter(b=>b.capability==='copy-answer').length,0);await page.locator('[data-tool-card="copy-answer"]').getByRole('button',{name:'Add to Room'}).click();await page.locator('[data-tool-card="copy-answer"]').getByRole('button',{name:'Added',exact:true}).waitFor();await close();
 // Existing-room reuse: installing in second room does not touch the first.
 const snapshot=JSON.stringify(states[room]);await tile('room-list').click();await page.getByRole('button',{name:'Second room',exact:true}).click();await page.waitForFunction(()=>location.search.includes('22222222'));
 await tools();await page.locator('[data-tool-card="files"]').getByRole('button',{name:'Add to Room'}).click();await page.locator('[data-tool-card="files"]').getByRole('button',{name:'Added',exact:true}).waitFor();assert.equal(JSON.stringify(states[room]),snapshot);assert.equal(states[second].design.buttons.length,2);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/rc-toolbox-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
 assert.deepEqual(errors,[]);writeFileSync('/tmp/rc-toolbox-browser-result.json',JSON.stringify({status:'passed',scope:'local component integration with in-memory API fixtures',tools:TOOL_REGISTRY.length,checks:['install all','persist/reload','send','copy clipboard','speaker toggle','mic draft + stop','files/upload','background cancel','helper','AI list','personal links','remove','failed save/retry','second room isolation','mobile layout','Escape'],livePreviewVerified:false},null,2));console.log(readFileSync('/tmp/rc-toolbox-browser-result.json','utf8'));
}finally{await browser.close();await server.close();}
