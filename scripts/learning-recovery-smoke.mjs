// Local component hydration test. All application APIs are fixtures; no customer
// session, payment, speech provider or hosted deployment is contacted.
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {chromium} from 'playwright-core';
import bundledChromium from '@sparticuz/chromium';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const temp=await mkdtemp(path.join(root,'.learning-smoke-'));
let server,browser;
try{
 await writeFile(path.join(temp,'fixture.jsx'),`
import React from 'react';
import {hydrateRoot} from 'react-dom/client';
import {renderToString} from 'react-dom/server';
import LearningRoom from '../src/app/rcv3/learn/LearningRoom';
import {learningLabel} from '../src/lib/locale/learning';
export const label=learningLabel;
const props={ownerId:'fixture-alice',language:'ko',entryPath:'/rcv4/learn',initialLearning:{state:{completed:['001'],certificate:null},practice:[]}};
const view=(next=props)=><React.StrictMode><LearningRoom {...next}/></React.StrictMode>;
export const ssr=()=>renderToString(view());
if(typeof window!=='undefined'){
 const app=hydrateRoot(document.getElementById('root'),view(),{onRecoverableError:error=>window.__hydrationErrors.push(error.message)});
 window.changeOwner=ownerId=>app.render(view({...props,ownerId}));
}
`);
 // Only the image transport is replaced; the learning controls/hooks are real.
 await writeFile(path.join(temp,'image.jsx'),"import React from 'react';export default function Image({src,alt}){return <img src={src} alt={alt}/>;}");
 server=await createServer({root:temp,configFile:false,plugins:[react()],resolve:{alias:{'@':path.join(root,'src'),'next/image':path.join(temp,'image.jsx')}},server:{host:'127.0.0.1',port:0,fs:{allow:[root]}},logLevel:'error'});
 await server.listen();
 const fixture=await server.ssrLoadModule('/fixture.jsx');
 const markup=fixture.ssr();
 assert(!markup.includes('Saved private answer'));
 await writeFile(path.join(temp,'index.html'),`<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root">${markup}</div><script>window.__hydrationErrors=[];</script><script type="module" src="/fixture.jsx"></script></body></html>`);
 const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
 browser=await chromium.launch({headless:true,executablePath:process.env.RC_TEST_CHROMIUM_PATH??await bundledChromium.executablePath(),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-software-rasterizer']});
 const context=await browser.newContext();
 const external=[];
 let translationCalls=0,finishTranslation;
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!==origin){external.push(url.origin);return route.abort();}
  if(url.pathname==='/api/rcv3/learn/content'){
   translationCalls++;
   if(translationCalls===1||translationCalls===3)return route.fulfill({status:503,body:'fixture unavailable'});
   const input=route.request().postDataJSON();
   await new Promise(resolve=>{finishTranslation=resolve;});
   return route.fulfill({json:{day:input.day,language:input.language,text:{}}}).catch(()=>{});
  }
  if(url.pathname.startsWith('/api/'))return route.fulfill({json:{ready:false}});
  if(url.pathname.startsWith('/images/'))return route.fulfill({status:204,body:''});
  return route.continue();
 });
 await context.addInitScript(()=>{
  const prefix='rc-learning-resume:fixture-alice:ai-literacy-100-v1:ko';
  localStorage.setItem(prefix,JSON.stringify({lesson:'051',messages:[{role:'assistant',content:'Saved private answer'}]}));
  localStorage.setItem('rc-learning-draft:fixture-alice:ai-literacy-100-v1:051',JSON.stringify({message:'Saved question',artifact:'Saved assignment'}));
  localStorage.setItem(prefix+':reading',JSON.stringify({lesson:'051',paragraph:0,source:'Stored reading position.',fraction:0.5}));
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin);
 const input=page.locator('textarea[maxlength="2000"]'),artifact=page.locator('textarea[maxlength="6000"]');
 await input.waitFor();
 await page.waitForFunction(()=>document.querySelector('textarea[maxlength="2000"]')?.value==='Saved question');
 assert.equal(await artifact.inputValue(),'Saved assignment');
 assert(!(await page.locator('body').innerText()).includes('Saved private answer'));
 assert.equal(await page.locator('progress').getAttribute('value'),'0');
 await input.fill('Current unsent question');await artifact.fill('Current unsent assignment');
 const language=page.locator('select:has(option[value="ja"])');
 await language.selectOption('ja');
 const retry=page.getByRole('button',{name:fixture.label('retry','ja'),exact:true});
 await retry.waitFor();
 // A language revisit starts a new request and cannot resurrect the old error.
 await language.selectOption('en');await language.selectOption('ja');
 await page.waitForFunction(()=>document.querySelector('main')?.lang==='ja');
 assert.equal(await retry.count(),0);
 for(let attempt=0;!finishTranslation&&attempt<100;attempt++)await page.waitForTimeout(20);
 assert(finishTranslation,'translation request must start');
 finishTranslation();finishTranslation=undefined;
 await page.waitForTimeout(100);
 assert.equal(await retry.count(),0);
 await language.selectOption('hi');
 const retryHindi=page.getByRole('button',{name:fixture.label('retry','hi'),exact:true});
 await retryHindi.waitFor();await retryHindi.click();
 assert.equal(await retryHindi.count(),0);
 for(let attempt=0;!finishTranslation&&attempt<100;attempt++)await page.waitForTimeout(20);
 assert(finishTranslation,'retry request must start');
 // A response arriving after a language change cannot restore its stale state.
 await language.selectOption('en');finishTranslation();finishTranslation=undefined;
 await page.waitForTimeout(100);
 assert.equal(await page.locator('main').getAttribute('lang'),'en');
 assert.equal(await retryHindi.count(),0);
 assert.equal(await input.inputValue(),'Current unsent question');
 assert.equal(await artifact.inputValue(),'Current unsent assignment');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('rc-learning-draft:fixture-alice:ai-literacy-100-v1:051')).message),'Current unsent question');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('rc-learning-resume:fixture-alice:ai-literacy-100-v1:ko:reading')).fraction),0.5);
 // A new owner starts with no prior account chat or draft.
 await page.evaluate(()=>window.changeOwner('fixture-bob'));
 await page.waitForFunction(()=>document.querySelector('textarea[maxlength="2000"]')?.value==='');
 assert(!(await page.locator('body').innerText()).includes('Saved private answer'));
 assert.deepEqual(await page.evaluate(()=>window.__hydrationErrors),[]);
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log(JSON.stringify({result:'PASS',hydrationErrors:0,pageErrors:0,externalRequests:0,checks:['SSR/StrictMode hydration','saved lesson and draft','fresh board preserves history','typing survives rerender and locale change','translation failure language revisit','retry and cancellation','reading marker preservation','owner reset']},null,2));
}finally{
 await browser?.close();await server?.close();await rm(temp,{recursive:true,force:true});
}
