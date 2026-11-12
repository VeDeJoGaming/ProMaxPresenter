/* Synthetic profile; control, output and YouTube remain hidden throughout. */
const {launch}=require('./hidden-native.cjs');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
async function run(){
 const profile=await fs.mkdtemp(path.join(os.tmpdir(),'promax-clear-keys-'));let app;
 const watchdog=setTimeout(()=>{app?.child.kill();console.error('Clear/shortcut check timed out');process.exit(1);},90000);watchdog.unref();
 try{
  app=await launch(profile,process.argv[2]);const {page,context,main}=app,errors=[];page.on('pageerror',error=>errors.push(error.message));
  await main(`(()=>{const {screen,BrowserWindow}=testRequire('electron'),primary=screen.getPrimaryDisplay();screen.getAllDisplays=()=>[primary,{...primary,id:primary.id+1000,label:'Synthetic clear output'}];screen.getDisplayMatching=()=>primary;for(const w of BrowserWindow.getAllWindows())w.webContents.setBackgroundThrottling(false);return true;})()`);
  await page.evaluate(async()=>{
   await ProMaxControls.mutate('Clear example',()=>{songs=[{id:'fade-song',title:'Fade example',lyrics:'Synthetic',lines:4,slides:[{id:'fade-one',text:'First synthetic lyric',section:'Verse',key:''},{id:'fade-two',text:'Second synthetic lyric',section:'Chorus',key:''}]}];selected='fade-song';settings.visual='paint-sweeps';});goLive(0);
  });
  await page.keyboard.press('Control+Enter');
  await page.waitForFunction(()=>nativeOutputActive);
  const output=context.pages().find(p=>p.url().endsWith('/desktop/output.html'));assert(output);await output.waitForFunction(()=>document.querySelector('#stage .screen-text')?.textContent.includes('First synthetic lyric'));
  for(const target of [page,output]){
   const outputPage=target===output;
   await page.evaluate(()=>goLive(0));
   await target.waitForFunction(outputPage=>document.querySelector((outputPage?'#stage':'#preview')+' .screen-text')?.textContent==='First synthetic lyric',outputPage);
   await target.evaluate(async outputPage=>{const container=document.querySelector(outputPage?'#stage':'#preview');window.priorFadeBackground=container.querySelector('canvas[data-glass]');container.querySelector('.screen-text').getAnimations().forEach(a=>a.finish());container.querySelectorAll('.text-outgoing').forEach(e=>e.getAnimations().forEach(a=>a.finish()));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));},outputPage);
   if(!outputPage){await page.evaluate(()=>{$('lyrics-fold').open=true;$('lyrics').focus();});}
   await target.keyboard.press('Control+Shift+C');
   await target.waitForFunction(outputPage=>document.querySelector((outputPage?'#stage':'#preview')+' .text-outgoing'),outputPage);
   const fade=await target.evaluate(outputPage=>{
    const container=document.querySelector(outputPage?'#stage':'#preview'),old=container.querySelector('.text-outgoing'),animation=old.getAnimations()[0];animation.pause();animation.currentTime=225;
    return {text:old.textContent,opacity:Number(getComputedStyle(old).opacity),duration:animation.effect.getTiming().duration,sameBackground:container.querySelector('canvas[data-glass]')===priorFadeBackground};
   },outputPage);
   assert.equal(fade.text,'First synthetic lyric');assert.equal(fade.duration,450);assert(fade.opacity>.4&&fade.opacity<.6);assert.equal(fade.sameBackground,true,'Clearing text preserves the playing background');
   assert.equal(await page.evaluate(()=>state.text),'');
   await page.evaluate(()=>goLive(1));await target.waitForFunction(outputPage=>document.querySelector((outputPage?'#stage':'#preview')+' .screen-text')?.textContent==='Second synthetic lyric',outputPage);
   await target.evaluate(outputPage=>document.querySelector(outputPage?'#stage':'#preview').querySelectorAll('.text-outgoing').forEach(e=>e.getAnimations().forEach(a=>a.finish())),outputPage);
   assert.equal(await target.locator(outputPage?'#stage .screen-text':'#preview .screen-text').innerText(),'Second synthetic lyric','A fast new cue cannot be cleared by the previous fade finishing');
   await target.keyboard.press('Control+b');await page.waitForFunction(()=>state.black);
   await target.evaluate(()=>document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'b',ctrlKey:true,repeat:true,bubbles:true,cancelable:true})));assert.equal(await page.evaluate(()=>state.black),true,'Held Ctrl+B only toggles once');
   await target.keyboard.press('Control+b');await page.waitForFunction(()=>!state.black);
  }
  await page.evaluate(()=>{ProMaxSettings.open('shortcuts');});await page.keyboard.press('Control+b');assert.equal(await page.evaluate(()=>state.black),true,'Blackout works with a settings dialog open');await page.keyboard.press('Control+b');await page.evaluate(()=>$('app-settings-dialog').close());
  await page.evaluate(()=>{window.fadeImage='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="orange"/></svg>');state={text:'Caption over a picture',image:fadeImage,black:false};paint();});
  await output.waitForFunction(()=>document.querySelector('.image-caption')?.textContent==='Caption over a picture');
  await output.evaluate(()=>{window.sameImage=document.querySelector('img[data-cue]');document.querySelector('.image-caption').getAnimations().forEach(a=>a.finish());});
  await page.locator('#clear').click();
  await output.waitForFunction(()=>document.querySelector('.text-outgoing')?.textContent==='Caption over a picture');
  assert.equal(await output.evaluate(()=>document.querySelector('img[data-cue]')===sameImage),true,'Clear fades the caption and retains its picture');
  // Real native YouTube content is replaced by a synthetic local response.
  const clip=(await fs.readFile(path.join(__dirname,'../desktop/smoke-video.webm'))).toString('base64');
  const html='<body><ytd-app><div id="movie_player"><video autoplay muted loop src="data:video/webm;base64,'+clip+'"></video></div></ytd-app>';
  await main(`testRequire('electron').session.fromPartition('persist:promax-youtube-browser').protocol.handle('https',()=>new Response(${JSON.stringify(html)},{headers:{'Content-Type':'text/html'}}))`);
  await page.evaluate(async()=>{window.clearTestEntry=await ProMaxYouTubeLibrary.add('https://youtu.be/abcdefghijk','Synthetic Ctrl keys');});
  const youtube=context.pages().find(p=>p.url().startsWith('https://www.youtube.com/watch'));assert(youtube);await youtube.waitForSelector('video');
  await page.waitForFunction(()=>/\d+p/.test(document.querySelector('[data-youtube-status]')?.textContent));
  await page.evaluate(()=>ProMaxYouTubeLibrary.play(clearTestEntry));await page.waitForFunction(()=>state.youtube?.id===clearTestEntry.id);
  const youtubeKey=(key,shift=false)=>main(`(()=>{let prevented=false;const wc=testRequire('electron').webContents.getAllWebContents().find(w=>w.getURL().startsWith('https://www.youtube.com/watch'));wc.emit('before-input-event',{preventDefault(){prevented=true;}},{type:'keyDown',key:${JSON.stringify(key)},control:true,shift:${shift},alt:false,meta:false,isAutoRepeat:false});return prevented;})()`);
  await youtube.evaluate(()=>{window.samePlayer=document.querySelector('video');});assert.equal(await youtubeKey('C',true),true);
  assert.equal(await page.evaluate(()=>state.youtube?.id===clearTestEntry.id),true,'Clear does not stop the active YouTube cue');
  assert.equal(await youtube.evaluate(()=>document.querySelector('video')===samePlayer),true);
  assert.equal(await youtubeKey('b'),true);await page.waitForFunction(()=>state.black);await page.keyboard.press('Control+b');await page.waitForFunction(()=>!state.black);
  assert.equal(await youtubeKey('Enter'),true);await page.waitForFunction(()=>!nativeOutputActive);
  await page.evaluate(()=>{ProMaxFeatures.showTab('videos');});
  assert.equal(await page.evaluate(()=>!!(document.querySelector('.youtube-library').compareDocumentPosition(document.querySelector('.asset-list'))&Node.DOCUMENT_POSITION_FOLLOWING)),true,'YouTube is above the local video section');
  assert.deepEqual(errors,[]);console.log('PASS: 450 ms text fade, fast next cue, background/image/video retention, Ctrl clear/blackout/presentation in control/output/YouTube, repeat and dialog protection, YouTube above local videos; '+(process.argv[2]||'source'));
 }finally{clearTimeout(watchdog);await app?.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
