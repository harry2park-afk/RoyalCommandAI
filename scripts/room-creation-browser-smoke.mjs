// Real shared UI, fixture-only transport. Never contacts customer/payment services.
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {chromium} from 'playwright-core';
import bundled from '@sparticuz/chromium';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(),temp=await mkdtemp(path.join(root,'.room-smoke-'));
await writeFile(path.join(temp,'index.html'),'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><div id="root"></div><script type="module" src="/entry.tsx"></script></body></html>');
await writeFile(path.join(temp,'entry.tsx'),`
import React from 'react';import {createRoot} from 'react-dom/client';
import Wizard from '@/app/rcv3/create/CreateRoomWizard';
import {newRoomDraft} from '@/lib/rcv3/room-draft';
const params=new URLSearchParams(location.search);const count=Number(params.get('count')||0);
let registry={revision:1,drafts:[]};
const original={...newRoomDraft(),name:'Saved guitar room',brief:'Guitar practice',purpose:'music',providers:['openai'],onboarding:{country:'AU',aiSources:{},emailEnabled:false,phoneOfferId:''}};
if(params.has('draft'))registry.drafts=[{id:params.get('draft'),updatedAt:new Date().toISOString(),input:original}];
window.requests=[];window.registry=registry;
window.fetch=async (url,init={})=>{window.requests.push({url:String(url),method:init.method||'GET'});const route=String(url).split('?')[0];
if(route==='/api/rcv3/drafts'){if(init.method==='PUT'){if(params.has('failSave'))return Response.json({code:'RCV3_CONFLICT'},{status:409});const body=JSON.parse(init.body);registry={revision:registry.revision+1,drafts:[{id:body.id,input:body.input,updatedAt:new Date().toISOString()}]};window.registry=registry;}return Response.json(registry);}
if(route==='/api/rcv3/rooms'){if(params.has('failRooms'))return Response.json({},{status:503});return Response.json({rooms:Array.from({length:count},(_,i)=>({id:'11111111-1111-4111-8111-'+String(i).padStart(12,'0'),name:'Room '+(i+1),kind:'rcv3',status:'draft'})),hasMore:false});}
if(route==='/api/rcv3/token-room'||route==='/api/rcv3/checkout/bank-start')return Response.json({},{status:403});
if(route==='/api/rcv3/checkout/quote')return Response.json({code:'RCV3_CHECKOUT_NOT_CONFIGURED'},{status:503});
throw new Error('Unexpected request '+url);};
createRoot(document.getElementById('root')).render(<Wizard helperAvailable={false} accountName="Fixture" accountEmail="fixture@example.test" country="AU" language="ko" providers={[{id:'openai',label:'OpenAI'}]}/>);
`);
const server=await createServer({root:temp,publicDir:path.join(root,"public"),configFile:false,plugins:[react()],resolve:{alias:{'@':path.join(root,'src')}},server:{host:'127.0.0.1',port:4179,strictPort:true,fs:{allow:[root]}}});
await server.listen();
const browser=await chromium.launch({executablePath:process.env.RC_BROWSER_PATH||await bundled.executablePath(),args:bundled.args,headless:true});
const errors=[];let checks=0;
try{
 const page=await browser.newPage({viewport:{width:1366,height:900}});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const u=new URL(route.request().url());return u.hostname==='127.0.0.1'?route.continue():route.abort();});
 for(const count of [0,1,5,6]){
  await page.goto('http://127.0.0.1:4179/?count='+count);await page.getByRole('heading',{name:'1. 어떤 방을 만들까요?'}).waitFor();
  const nav=page.locator('header nav');await page.waitForFunction(()=>window.requests.some(x=>x.url.includes('navigation=1')));await page.waitForTimeout(100);
  assert.equal(await nav.getByRole('button',{name:/^Room \d$/}).count(),Math.min(5,count));assert.equal(await nav.getByRole('button',{name:'다른 방 보기'}).count(),count>5?1:0);checks++;
 }
 await page.getByRole('button',{name:'다른 방 보기'}).click();await page.locator('dialog[open]').waitFor();await page.getByRole('button',{name:'닫기',exact:true}).click();checks++;
 await page.goto('http://127.0.0.1:4179/');await page.getByRole('heading',{name:'1. 어떤 방을 만들까요?'}).waitFor();
 assert.equal(await page.locator('fieldset legend').count(),10);assert.equal(await page.locator('button[aria-pressed]').count(),60);
 await page.getByRole('searchbox').fill('기타');await page.getByRole('button',{name:'Guitar · 기타 배우기',exact:true}).click();
 await page.waitForFunction(()=>window.registry.drafts[0]?.input.purpose==='music');
 assert.equal(await page.locator('input[autocomplete="off"]').inputValue(),'기타 배우기');checks++;
 await page.getByRole('button',{name:'목록에 없는 용도 직접 입력'}).click();await page.locator('textarea').first().fill('내가 원하는 새로운 방');await page.locator('textarea').first().blur();
 await page.waitForFunction(()=>window.registry.drafts[0]?.input.answers.purpose?.[0]==='내가 원하는 새로운 방');checks++;
 await page.goto('http://127.0.0.1:4179/?draft=22222222-2222-4222-8222-222222222222');await page.getByRole('heading',{name:'1. 어떤 방을 만들까요?'}).waitFor();
 assert.equal(await page.locator('input[autocomplete="off"]').inputValue(),'Saved guitar room');await page.getByRole('searchbox').fill('기타');await page.getByRole('button',{name:'Guitar · 기타 배우기',exact:true}).click();assert.equal(await page.locator('input[autocomplete="off"]').inputValue(),'Saved guitar room');checks++;
 // Enter the actual design preview, switch design, persist, close and reopen.
 await page.locator('button:has(img)').first().click();const preview=page.getByRole('dialog',{name:'방 디자인 둘러보기'});await preview.waitFor();
 await preview.getByRole('button',{name:'방 디자인 목록',exact:true}).click();assert.equal(await preview.locator('#room-design-choices').count(),0);
 await preview.getByRole('button',{name:'방 디자인 목록',exact:true}).click();const choice=preview.locator('#room-design-choices button').nth(1);const chosenName=(await choice.innerText()).trim();await choice.click();
 await page.waitForFunction(()=>window.registry.drafts[0]?.input.templateId&&document.querySelector('dialog strong')?.textContent===document.querySelector('#room-design-choices button[aria-pressed=true] span')?.textContent);
 assert.equal((await preview.locator('strong').innerText()).trim(),chosenName);assert.equal(await page.locator('input[autocomplete="off"]').inputValue(),'Saved guitar room');
 await preview.getByRole('button',{name:'이 디자인으로 계속'}).click();await preview.waitFor({state:'hidden'});checks++;
 await page.locator('button:has(img)[aria-pressed=true]').first().click();await preview.waitFor();assert.equal((await preview.locator('strong').innerText()).trim(),chosenName);await page.keyboard.press('Escape');await preview.waitFor({state:'hidden'});checks++;
 await page.goto('http://127.0.0.1:4179/?failSave=1');await page.getByRole('heading',{name:'1. 어떤 방을 만들까요?'}).waitFor();await page.getByRole('searchbox').fill('기타');await page.getByRole('button',{name:'Guitar · 기타 배우기',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(await page.locator('input[autocomplete="off"]').inputValue(),'기타 배우기');checks++;
 await page.goto('http://127.0.0.1:4179/?failRooms=1');await page.locator('header nav [role="alert"]').waitFor();assert.equal(await page.locator('header nav').getByRole('button',{name:'다른 방 보기'}).count(),0);checks++;
 await page.setViewportSize({width:800,height:1280});await page.goto('http://127.0.0.1:4179/');await page.getByRole('heading',{name:'1. 어떤 방을 만들까요?'}).waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(process.env.RC_SCREENSHOT)await page.screenshot({path:process.env.RC_SCREENSHOT,fullPage:true});checks++;
 await page.setViewportSize({width:390,height:844});await page.reload();await page.getByRole('button',{name:'내 방 목록',exact:true}).waitFor();assert.equal(await page.getByRole('searchbox').count(),0);assert.equal(await page.getByRole('button',{name:'현재 작성 취소',exact:true}).count(),1);checks++;
 assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,pageErrors:errors,result:'PASS',scope:'Real Chromium UI with fixture API; no live payment/customer verification'}));
}finally{await browser.close();await server.close();await rm(temp,{recursive:true,force:true});}
