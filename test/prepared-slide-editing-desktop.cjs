/* Hidden native app, isolated synthetic profile: never takes desktop focus. */
const {chromium}=require('playwright');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const executable=process.argv[2]||require('electron'),root=path.join(__dirname,'..');
let child,browser,inspector;
const watchdog=setTimeout(()=>{child?.kill();console.error('Prepared editing timed out');process.exit(1);},90000);watchdog.unref();
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
  const hook=await send('Debugger.evaluateOnCallFrame',{callFrameId:pause.callFrames[0].callFrameId,expression:"(()=>{const {BrowserWindow}=require('electron'); for(const name of ['show','showInactive','focus','moveTop'])BrowserWindow.prototype[name]=function(){};return true;})()",returnByValue:true});
  assert.equal(hook.result?.value,true,'Install hidden-window hooks before application starts: '+JSON.stringify(hook));
  await send('Debugger.resume');
  browser=await chromium.connectOverCDP(await endpoint(/DevTools listening on (ws:\/\/\S+)/));
  const context=browser.contexts()[0];let page;
  for(let i=0;i<400;i++){page=context.pages().find(p=>p.url().endsWith('/index.html'));if(page)break;await new Promise(r=>setTimeout(r,50));}
  assert(page,'Control page loaded');await page.waitForFunction(()=>window.ProMaxControls);await page.evaluate(()=>ProMaxControls.ready);return page;
}
async function close(){await browser?.close();browser=null;inspector?.close();inspector=null;const process=child;child=null;if(process&&process.exitCode===null){process.kill();await new Promise(r=>process.once('exit',r));}}
async function run(){
 const profile=await fs.mkdtemp(path.join(os.tmpdir(),'promax-prepared-edit-'));
 try{
  let page=await launch(profile);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(async()=>{
   settings.visual='neon-depth';
   window.preparedTestImage='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#ff7f32"/></svg>');
   ProMaxMeetings.create('Synthetic entertainment');
   ProMaxMeetings.add({type:'text',title:'Fetch game',slides:[{id:uid(),text:'FETCH A PEN',section:'Slide',key:''},{id:uid(),text:'FETCH MARKUS',section:'Slide',key:'',image:preparedTestImage}]});
   ProMaxMeetings.add({type:'bible',title:'Synthetic passage',slides:[{id:uid(),text:'Synthetic original',section:'Text',biblePassage:{reference:'Test 1:1',verses:[{verse:1,text:'Synthetic original'}]}}]});
   await ProMaxMeetings.open(ProMaxMeetings.folder().items[0]);goLive(0);window.priorEditCue=JSON.stringify(state);window.priorSlideSettings=JSON.stringify(settings);
  });
  assert.equal(await page.locator('.prepared-slide .slide-edit-button').count(),2);
  assert.equal(await page.locator('.prepared-slide').nth(1).locator('.thumbnail canvas,.thumbnail .shade').count(),0,'A pictured slide must not be covered by the shared animated background');
  await page.locator('.prepared-slide .slide-edit-button').nth(1).click();
  const png=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=800;c.height=600;c.getContext('2d').fillRect(0,0,800,600);return c.toDataURL('image/png').split(',')[1];}),'base64');
  const upload=()=>page.locator('#slide-image-editor input[type=file]').setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:png});
  await upload();await page.waitForFunction(()=>ProMaxMeetings.folder().items[0].slides[1].image.startsWith('data:image/webp;'));
  await page.locator('#slide-remove-image').click();assert.equal(await page.evaluate(()=>!!ProMaxMeetings.folder().items[0].slides[1].image),false);
  assert.equal(await page.locator('.prepared-slide').nth(1).locator('.thumbnail canvas').count(),1,'Removing the photo restores the shared background in its card');
  await upload();await page.waitForFunction(()=>ProMaxMeetings.folder().items[0].slides[1].image?.startsWith('data:image/webp;'));
  assert.equal(await page.locator('.prepared-slide').nth(1).locator('.thumbnail canvas,.thumbnail .shade').count(),0,'Import refreshes the card without sending a live cue');
  await page.evaluate(()=>{preparedTestImage=ProMaxMeetings.folder().items[0].slides[1].image;});
  await page.locator('#slide-image-editor input[type=file]').setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('not a valid image')});
  await page.waitForFunction(()=>!document.querySelector('[data-file-picker="slide-image"]').disabled);
  assert.equal(await page.evaluate(()=>ProMaxMeetings.folder().items[0].slides[1].image===preparedTestImage),true,'Invalid images keep the existing photo');
  await page.locator('#slide-edit-text').fill('FETCH MARKUS!\nWelcome to the stage');
  await page.locator('#slide-edit-section').fill('Final task');
  await page.locator('#slide-edit-key').fill('m');
  assert.equal(await page.evaluate(()=>JSON.stringify(state)===priorEditCue),true,'Autosaving cannot change live cue');
  await page.locator('#slide-edit-cancel').click();
  await page.locator('.prepared-slide .card-footer').nth(1).click();await page.keyboard.press('F2');
  assert.equal(await page.locator('#slide-edit-text').inputValue(),'FETCH MARKUS!\nWelcome to the stage');
  await page.locator('#slide-save-live').click();
  await page.waitForFunction(()=>state.text==='FETCH MARKUS!\nWelcome to the stage');
  assert.equal(await page.evaluate(()=>state.image===preparedTestImage),true,'Editing keeps the slide photo');
  await page.waitForFunction(()=>{const img=document.querySelector('#preview img[data-cue=image]');return img?.complete&&img.naturalWidth===800;});
  assert.equal(await page.locator('#preview .image-caption').innerText(),'FETCH MARKUS!\nWelcome to the stage');
  for(let n=0;n<3;n++){await page.evaluate(()=>ProMaxControls.undo());await page.waitForFunction(()=>!ProMaxControls.busy);}
  assert.equal(await page.evaluate(()=>ProMaxMeetings.folder().items[0].slides[1].text),'FETCH MARKUS');
  assert.equal(await page.evaluate(()=>state.text),'FETCH MARKUS!\nWelcome to the stage','Undo preserves live text');
  for(let n=0;n<3;n++){await page.evaluate(()=>ProMaxControls.redo());await page.waitForFunction(()=>!ProMaxControls.busy);}
  await page.evaluate(()=>ProMaxMeetings.open(ProMaxMeetings.folder().items[1]));
  await page.locator('.prepared-slide .slide-edit-button').click();await page.locator('#slide-edit-text').fill('Edited synthetic passage');
  assert.equal(await page.evaluate(()=>Object.hasOwn(ProMaxMeetings.folder().items[1].slides[0],'biblePassage')),false);
  await page.locator('#slide-edit-cancel').click();
  // Song editor still updates lyrics without requiring the song to be live.
  await page.evaluate(()=>{ProMaxMeetings.select(null);selectSong(songs[0].id);});
  await page.locator('.slide-edit-button').first().click();await page.locator('#slide-edit-text').fill('Edited synthetic song');
  await upload();await page.waitForFunction(()=>current().slides[0].image?.startsWith('data:image/webp;'));
  assert.equal(await page.locator('.slide-card').first().locator('.thumbnail canvas,.thumbnail .shade').count(),0,'Song cards show the photo too');
  await page.locator('#slide-save-live').click();await page.waitForFunction(()=>!!state.image);
  assert.equal(await page.locator('#preview .image-caption').innerText(),'Edited synthetic song');
  await page.locator('.slide-edit-button').first().click();await page.locator('#slide-remove-image').click();
  assert.equal(await page.evaluate(()=>!!state.image),true,'Removing a saved photo waits for an explicit cue');
  await page.locator('#slide-save-live').click();
  assert.equal(await page.evaluate(()=>!!state.image),false);assert.equal(await page.locator('#preview .image-caption').count(),0);
  assert.equal(await page.locator('#preview .screen-text').evaluate(e=>e.style.bottom),'','Normal lyrics regain centered layout');
  assert.equal(await page.evaluate(()=>current().lyrics.includes('Edited synthetic song')),true);
  assert.equal(await page.evaluate(()=>JSON.stringify(settings)===priorSlideSettings),true,'Per-slide pictures leave shared appearance settings unchanged');
  await page.evaluate(()=>{ProMaxMeetings.select(meetingFolders[0].id);flushPendingSave();});
  await page.evaluate(()=>ProMaxMeetings.open(ProMaxMeetings.folder().items[0]));
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('promax-library')));
  // Test-only forced shutdown: explicitly save the synthetic recovery snapshot.
  await page.evaluate(()=>window.promaxDesktop?.saveLibrary(JSON.stringify(librarySnapshot())));await new Promise(r=>setTimeout(r,1200));
  await close();page=await launch(profile);
  assert.deepEqual(await page.evaluate(()=>meetingFolders),saved.meetingFolders);
  assert.equal(await page.evaluate(()=>songs[0].slides[0].text),'Edited synthetic song');
  assert.equal(await page.evaluate(()=>meetingFolders[0].items[0].slides[1].image.startsWith('data:image/webp;')),true,'Imported photo survives restart');
  assert.deepEqual(errors,[]);
  console.log('PASS: Edit/F2 for prepared text and Bible, autosave, cue isolation, explicit Show slide, undo/redo, song regression, restart; hidden native '+executable);
 }finally{await close();clearTimeout(watchdog);/* Keep isolated evidence if a check fails; no private user data. */}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
