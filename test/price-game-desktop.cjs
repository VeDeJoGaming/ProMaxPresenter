/* Hidden native app, isolated synthetic profile: never takes desktop focus. */
const {chromium}=require('playwright');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const executable=process.argv[2]||require('electron'),root=path.join(__dirname,'..');
let child,browser,inspector;
const watchdog=setTimeout(()=>{child?.kill();console.error('Price game timed out');process.exit(1);},150000);watchdog.unref();
async function launch(profile){
  const env={...process.env,PROMAX_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
  child=spawn(executable,['--inspect-brk=127.0.0.1:0','--remote-debugging-port=0',`--user-data-dir=${profile}`,...(process.argv[2]?[]:[root])],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  let stderr='';child.stderr.on('data',d=>stderr+=d);
  async function endpoint(pattern){for(let n=0;n<400;n++){const match=stderr.match(pattern);if(match)return match[1];if(child.exitCode!==null)throw Error(stderr);await new Promise(r=>setTimeout(r,50));}throw Error('Missing debugger endpoint: '+stderr);}
  inspector=new WebSocket(await endpoint(/Debugger listening on (ws:\/\/\S+)/));
  await new Promise((resolve,reject)=>{inspector.onopen=resolve;inspector.onerror=reject;});
  let seq=0;const pending=new Map(),events=new Map();
  inspector.onmessage=event=>{const msg=JSON.parse(event.data);if(msg.id){const p=pending.get(msg.id);pending.delete(msg.id);if(msg.error)p.reject(Error(msg.error.message));else p.resolve(msg.result);}else{events.get(msg.method)?.(msg.params);}};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});inspector.send(JSON.stringify({id,method,params}));});
  await send('Debugger.enable');
  const paused=new Promise(resolve=>events.set('Debugger.paused',resolve));
  await send('Runtime.runIfWaitingForDebugger');
  let pause=await paused;
  if(!process.argv[2]){
    await send('Debugger.setBreakpointByUrl',{lineNumber:0,urlRegex:'[/\\\\]desktop[/\\\\]main\\.js$'});
    const mainPause=new Promise(resolve=>events.set('Debugger.paused',resolve));
    await send('Debugger.resume');pause=await mainPause;
  }
  const hook=await send('Debugger.evaluateOnCallFrame',{callFrameId:pause.callFrames[0].callFrameId,expression:"(()=>{const {BrowserWindow,app}=require('electron');app.whenReady().then(()=>{const {screen}=require('electron');const primary=screen.getPrimaryDisplay;screen.getAllDisplays=()=>{const p=primary();return [p,{...p,id:p.id+1000}];};}); for(const name of ['show','showInactive','focus','moveTop'])BrowserWindow.prototype[name]=function(){};return true;})()",returnByValue:true});
  assert.equal(hook.result?.value,true,'Install hidden-window hooks before application starts: '+JSON.stringify(hook));
  await send('Debugger.resume');
  browser=await chromium.connectOverCDP(await endpoint(/DevTools listening on (ws:\/\/\S+)/));
  const context=browser.contexts()[0];let page;
  for(let i=0;i<400;i++){page=context.pages().find(p=>p.url().endsWith('/index.html'));if(page)break;await new Promise(r=>setTimeout(r,50));}
  assert(page,'Control page loaded');await page.waitForFunction(()=>window.ProMaxControls);await page.evaluate(()=>ProMaxControls.ready);return page;
}
async function close(){await browser?.close();browser=null;inspector?.close();inspector=null;const process=child;child=null;if(process&&process.exitCode===null){process.kill();await new Promise(r=>process.once('exit',r));}}
async function run(){
 const profile=await fs.mkdtemp(path.join(os.tmpdir(),'promax-price-game-'));
 try{
  let page=await launch(profile);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(()=>{goLive(0);window.priorPriceCue=JSON.stringify(state);});
  const savedSettings=await page.evaluate(()=>JSON.stringify(ProMaxLibraryData.normalize(librarySnapshot()).settings));
  await page.locator('[data-tab="price-game"]').click();
  await page.locator('[data-price-field=name]').fill('Kaffe fra fjellbutikken');
  await page.locator('[data-price-field=price]').fill('1234,90');
  const photo=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=400;c.height=500;const x=c.getContext('2d');x.fillStyle='#b52822';x.fillRect(70,80,260,350);x.fillStyle='#ffe8ba';x.fillRect(90,200,220,150);x.fillStyle='#4b2a18';x.font='bold 36px Arial';x.fillText('KAFFE',138,285);return c.toDataURL('image/png').split(',')[1];}),'base64');
  await page.locator('.price-game-photo input').setInputFiles({name:'synthetic-coffee.png',mimeType:'image/png',buffer:photo});
  await page.waitForSelector('.price-game-photo img');
  await page.locator('[data-price-add]').click();
  await page.locator('[data-price-field=name]').nth(1).fill('Sjokolade');
  await page.locator('[data-price-field=price]').nth(1).fill('ikke en pris');
  await page.locator('[data-price-generate]').click();
  assert.match(await page.locator('.price-game-error').innerText(),/Vare 2/);
  assert.equal(await page.evaluate(()=>meetingFolders.length),0,'Invalid rows cannot create partial meetings');
  await page.locator('[data-price-field=price]').nth(1).fill('0');
  assert.equal(await page.evaluate(()=>JSON.stringify(state)===priorPriceCue),true);
  await page.locator('[aria-label="Forhåndsvis vare"]').selectOption('0');
  await page.evaluate(()=>document.querySelector('.workspace').scrollTop=0);

  // A tab switch and reload retain the private draft, including its image.
  await page.locator('[data-tab="scores"]').click();await page.locator('[data-tab="price-game"]').click();
  assert.equal(await page.locator('[data-price-field=name]').first().inputValue(),'Kaffe fra fjellbutikken');
  await page.waitForTimeout(300);await page.reload({waitUntil:'domcontentloaded',timeout:15000});await page.evaluate(()=>ProMaxControls.ready);await page.locator('[data-tab="price-game"]').click();
  assert.equal(await page.locator('[data-price-field=price]').first().inputValue(),'1234,90');
  await page.locator('[data-price-generate]').click();await page.waitForSelector('.prepared-slide');
  assert.equal(await page.locator('.prepared-slide').count(),4);
  assert.equal(await page.evaluate(()=>!!state.image),false,'Generation never shows the new deck live');
  const firstId=await page.evaluate(()=>ProMaxMeetings.folder().items[0].slides[0].id);
  await page.locator('.prepared-slide .thumbnail').first().click();
  await page.waitForFunction(()=>document.querySelector('#preview img')?.naturalWidth===1600);
  let question=await page.evaluate(()=>decodeURIComponent(state.image.split(',')[1]));
  assert.ok(question.includes('? kr'));assert.ok(!question.includes('234,90'),'Question cue cannot leak the answer');

  await page.evaluate(async()=>{await promaxDesktop.toggle();});
  let output;for(let i=0;i<100;i++){output=browser.contexts()[0].pages().find(p=>p.url().endsWith('/desktop/output.html'));if(output)break;await page.waitForTimeout(50);}assert(output);
  await output.waitForSelector('#stage img');await output.waitForFunction(()=>document.querySelector('#stage img').naturalWidth===1600);

  assert.ok(!(await output.locator('#stage img').getAttribute('src')).includes('234%2C90'));
  await page.locator('#next').click();
  await page.waitForFunction(()=>decodeURIComponent(state.image).includes('234,90'));
  await output.waitForFunction(()=>decodeURIComponent(document.querySelector('#stage img').src).includes('234,90'));

  await page.locator('#blackout').click();assert.equal(await page.evaluate(()=>state.black),true);
  await page.locator('#blackout').click();await page.locator('#previous').click();
  assert.ok(!(await page.evaluate(()=>decodeURIComponent(state.image))).includes('234,90'));
  await page.evaluate(()=>window.priceBeforeEdit=state.image);
  await page.getByRole('button',{name:'Rediger varer og priser',exact:true}).click();
  await page.locator('[data-price-field=price]').first().fill('2345,60');
  await page.locator('[data-price-generate]').click();await page.waitForSelector('.prepared-slide');
  assert.equal(await page.evaluate(()=>state.image===priceBeforeEdit),true,'Updating a deck preserves the live cue');
  assert.equal(await page.evaluate(()=>ProMaxMeetings.folder().items[0].slides[0].id),firstId,'Edits retain cue identities');
  await page.locator('#next').click();assert.ok((await page.evaluate(()=>decodeURIComponent(state.image))).includes('345,60'));
  await page.evaluate(()=>ProMaxControls.undo());await page.waitForFunction(()=>!ProMaxControls.busy);
  assert.equal(await page.evaluate(()=>ProMaxMeetings.folder().items[0].priceGame.rounds[0].price),1234.9);
  await page.evaluate(()=>ProMaxControls.redo());await page.waitForFunction(()=>!ProMaxControls.busy);
  assert.equal(await page.evaluate(()=>ProMaxMeetings.folder().items[0].priceGame.rounds[0].price),2345.6);
  await page.evaluate(()=>ProMaxMeetings.open(ProMaxMeetings.folder().items[0]));
  await page.locator('.prepared-slide .slide-edit-button').first().click();await page.waitForSelector('.price-game');
  assert.equal(await page.locator('[data-price-field=price]').first().inputValue(),'2345.6','Slide Edit opens the original structured game');
  assert.equal(await page.evaluate(()=>JSON.stringify(ProMaxLibraryData.normalize(librarySnapshot()).settings)),savedSettings);
  await page.evaluate(()=>{flushPendingSave();window.promaxDesktop?.saveLibrary(JSON.stringify(librarySnapshot()));});await page.waitForTimeout(700);
  await close();page=await launch(profile);
  assert.equal(await page.evaluate(()=>meetingFolders[0].items[0].priceGame.rounds[0].price),2345.6);
  assert.equal(await page.evaluate(()=>meetingFolders[0].items[0].priceGame.rounds[0].image.startsWith('data:image/webp;')),true);
  await page.getByRole('button',{name:'Rediger varer og priser',exact:true}).click();
  assert.equal(await page.locator('[data-price-field=name]').count(),2);
  assert.deepEqual(errors,[]);
  console.log('PASS: price game validation, private draft, images, paired slides, real output, reveal/blackout, editing, undo/redo and restart; hidden native '+executable);
 }finally{await close();clearTimeout(watchdog);}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
