// Actual shared React classroom with controlled API responses; no paid or live-account calls.
import {chromium} from 'playwright-core';
import chromiumBundle from '@sparticuz/chromium';
import {createServer} from 'vite';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const server=await createServer({configFile:false,define:{'process.env':JSON.stringify({NODE_ENV:'development'})},root:process.cwd(),publicDir:'public',resolve:{alias:{'@':resolve('src')}},esbuild:{jsx:'automatic'},server:{host:'127.0.0.1',port:4318,strictPort:true}});
await server.listen();
const browser=await chromium.launch({executablePath:process.env.RC_BROWSER_PATH||await chromiumBundle.executablePath(),headless:true,args:chromiumBundle.args});
const course='ai-tools-60-preview-v1',requests=[],errors=[];let fail=false;
const labels=JSON.parse(readFileSync('src/lib/locale/learning-messages.json','utf8'));
try{
 const page=await browser.newPage({viewport:{width:1366,height:900}});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.SpeechRecognition=class{start(){window.__speech=this;}stop(){this.onend?.();}abort(){this.onend?.();}};});
 await page.route('**/_next/image?**',async route=>{const path=new URL(route.request().url()).searchParams.get('url');assert.ok(['/images/rc-v4-male-teacher-blue-eyes-20261001.png','/images/katie-avatar.png'].includes(path));await route.fulfill({contentType:'image/png',body:readFileSync('public'+path)});});
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/avatar'))return route.fulfill({json:{ready:false}});
  if(path.endsWith('/speech'))return route.fulfill({status:503,json:{code:'RCV3_UNAVAILABLE'}});
  const data=route.request().postDataJSON();requests.push({path,data});
  if(path.endsWith('/content')){
   assert.equal(data.course,course);return route.fulfill({json:{language:data.language,day:data.day,text:{'title.p001':'練習の質問','body.p001':'質問を実行し、結果を確認してください。','title.p002':'もう一度質問','body.p002':'結果を修正してください。'}}});
  }
  assert.equal(path,'/api/rcv3/learn');assert.equal(data.action,'chat');assert.equal(data.course,course);assert.match(data.lesson,/^p\d{3}$/);
  return route.fulfill({status:fail?503:200,json:fail?{code:'RCV3_UNAVAILABLE'}:{answer:'Fixture feedback: compare your real output and revise one condition.'}});
 });
 const url='http://127.0.0.1:4318/tests/learning-preview/index.html';
 await page.goto(url);await page.getByText('PRACTICE TEST',{exact:true}).waitFor();
 const field=()=>page.getByRole('textbox',{name:labels.m6.en,exact:true});
 await field().fill('Explain this first exercise.');await page.locator('[data-rc-tool="send"]').click();
 await page.getByText('Fixture feedback: compare your real output and revise one condition.',{exact:false}).waitFor();
 assert.equal(requests.at(-1).data.lesson,'p001');assert.equal(await field().inputValue(),'');
 const evidence=()=>page.locator('textarea[maxlength="1800"]');
 await evidence().fill('I asked for two sentences, got two, then asked for one everyday example and checked it.');
 await page.getByRole('button',{name:labels.submitFeedback.en,exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('textarea[maxlength="1800"]').disabled);
 await page.waitForTimeout(100);assert.match(requests.at(-1).data.message,/I asked for two sentences/);
 assert.equal(await page.getByRole('heading',{name:labels.finalExam.en,exact:true}).count(),0);
 fail=true;await field().fill('Keep this question after failure');await page.locator('[data-rc-tool="send"]').click();
 await page.getByRole('alert').first().waitFor();assert.equal(await field().inputValue(),'Keep this question after failure');fail=false;
 await page.reload();await field().waitFor();await page.waitForFunction(()=>document.querySelector('[data-rc-tool="send"]')&&!document.querySelector('[data-rc-tool="send"]').disabled);
 assert.equal(await field().inputValue(),'Keep this question after failure');assert.match(await evidence().inputValue(),/I asked/);
 await page.getByRole('button',{name:labels.lessonList.en,exact:true}).click();
 const dialog=page.getByRole('dialog');assert.equal(await dialog.locator('button[aria-pressed]').count(),60);
 await dialog.locator('button[aria-pressed]').last().click();await page.getByRole('heading',{name:/060.*Review and plan next week/}).waitFor();
 await page.getByRole('button',{name:labels.teacherStop.en,exact:true}).click();
 await field().fill('Last lesson draft');await evidence().fill('My plan: use two tools for three tasks next week.');
 await page.reload();await page.getByRole('heading',{name:/060.*Review and plan next week/}).waitFor();assert.equal(await field().inputValue(),'Last lesson draft');
 const keys=await page.evaluate(()=>Object.keys(localStorage));assert.ok(keys.some(k=>k.includes('ai-tools-60-preview-v1:p060')));assert.ok(keys.every(k=>!k.includes('ai-literacy-100-v1')));
 await page.locator('select').last().selectOption('1');await page.getByRole('heading',{name:/001.*ChatGPT/}).waitFor();
 await page.locator('select').nth(1).selectOption('ja');await page.getByText('質問を実行し、結果を確認してください。',{exact:true}).waitFor();
 assert.equal(requests.at(-1).data.course,course);
 await page.locator('select').nth(1).selectOption('en');await page.getByText('PRACTICE TEST',{exact:true}).waitFor();assert.equal(await page.getByText(labels.previewOverview.ko,{exact:true}).count(),0);
 mkdirSync('/tmp/rc-v4-practical-evidence',{recursive:true});
 for(const width of [1366,390]){await page.setViewportSize({width,height:900});await page.locator('[class*=curriculum]').evaluate(el=>{el.scrollTop=0;});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`/tmp/rc-v4-practical-evidence/${width}.png`,fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));}
 await page.goto(url+'?legacy=1');await page.getByRole('heading',{name:labels.finalExam.en,exact:true}).waitFor();assert.equal(await page.getByText('PRACTICE TEST',{exact:true}).count(),0);
 assert.deepEqual(errors,[]);
 const result={passed:true,requests:requests.map(r=>({path:r.path,action:r.data.action,course:r.data.course,lesson:r.data.lesson,language:r.data.language})),pageErrors:errors,scope:'Local React classroom with API fixtures; no live provider/audio audition'};
 writeFileSync('/tmp/rc-v4-practical-evidence/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();await server.close();}
