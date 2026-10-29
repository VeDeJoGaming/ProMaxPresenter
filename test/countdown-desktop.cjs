/* Countdown control and native output, with isolated data and a synthetic clip. */
const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
async function run(){
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'promax-countdown-')),executablePath=process.argv[2],env={...process.env,PROMAX_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
  let app;const errors=[];
  const watchdog=setTimeout(()=>{console.error('Countdown check timed out');app?.process().kill();process.exit(1);},90000);watchdog.unref();
  try{
    app=await electron.launch({executablePath,args:executablePath?[`--user-data-dir=${profile}`]:[path.join(__dirname,'..')],env,timeout:45000});
    assert.equal(path.resolve(await app.evaluate(({app})=>app.getPath('userData'))).toLowerCase(),path.resolve(profile).toLowerCase());
    const page=await app.firstWindow();page.on('pageerror',error=>errors.push(error.message));await page.waitForFunction(()=>window.ProMaxControls);await page.evaluate(()=>ProMaxControls.ready);
    await page.evaluate(async bytes=>{await ProMaxFeatures.addVideos([new File([Uint8Array.from(atob(bytes),c=>c.charCodeAt(0))],'Countdown test clip.webm',{type:'video/webm'})]);await ProMaxFeatures.playVideo(ProMaxFeatures.getVideos()[0]);document.querySelector('#minutes').closest('details').open=true;window.beforeInvalidCountdown=state;},(await fs.readFile(path.join(__dirname,'../desktop/smoke-video.webm'))).toString('base64'));
    await page.locator('#minutes').fill('0');await page.locator('#countdown').click();assert.equal(await page.evaluate(()=>state===beforeInvalidCountdown&&!!ProMaxFeatures.videoSnapshot()),true,'Invalid countdown input must preserve the current video and transport');
    await page.evaluate(()=>{goLive(0);});assert.equal(await page.locator('#countdown-pause').isDisabled(),true);
    await app.evaluate(({screen})=>{const primary=screen.getPrimaryDisplay();screen.getAllDisplays=()=>[primary,{...primary,id:primary.id+1000,label:'Synthetic countdown output'}];screen.getDisplayMatching=()=>primary;});
    const opened=app.waitForEvent('window',p=>p.url().endsWith('/desktop/output.html'));await page.evaluate(()=>openOutput());const output=await opened;await output.waitForFunction(()=>document.querySelector('#stage .screen-text'));
    await page.locator('#minutes').fill('0.1');await page.locator('#countdown').click();await output.waitForFunction(()=>document.querySelector('#stage .screen-text')?.textContent==='0:06');
    await page.waitForFunction(()=>countdownClock.snapshot().seconds<6);await page.locator('#countdown-pause').click();const paused=await page.evaluate(()=>({text:state.text,remaining:countdownClock.snapshot().remainingMs}));
    await page.waitForTimeout(650);assert.equal(await page.evaluate(()=>state.text),paused.text);assert.equal(await page.evaluate(()=>countdownClock.snapshot().remainingMs),paused.remaining);await output.waitForFunction(text=>document.querySelector('#stage .screen-text')?.textContent===text,paused.text);assert.equal(await page.locator('#countdown-pause').innerText(),'Resume countdown');
    await fs.mkdir(path.join(__dirname,'../test-results'),{recursive:true});await page.locator('#countdown-pause').evaluate(el=>el.scrollIntoView({block:'center'}));await page.screenshot({path:path.join(__dirname,'../test-results/countdown-paused.png')});
    await page.evaluate(()=>toggleBlackout());await output.waitForFunction(()=>document.querySelector('#stage').style.backgroundColor==='rgb(0, 0, 0)');await page.locator('#countdown-pause').click();await page.waitForTimeout(600);assert.equal(await page.evaluate(()=>state.black),true);assert.ok(await page.evaluate(()=>countdownClock.snapshot().remainingMs)<paused.remaining-400);
    await page.locator('#countdown-pause').click();await page.evaluate(()=>toggleBlackout());const restored=await page.evaluate(()=>state.text);await output.waitForFunction(text=>document.querySelector('#stage .screen-text')?.textContent===text,restored);
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.getTitle()==='ProMax Presenter').setSize(850,650));assert.equal(await page.locator('.countdown-actions').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);await page.locator('#countdown-pause').evaluate(el=>el.scrollIntoView({block:'center'}));await page.screenshot({path:path.join(__dirname,'../test-results/countdown-paused-compact.png')});
    await page.locator('#countdown').click();await page.waitForFunction(()=>countdownClock.snapshot().phase==='finished');await output.waitForFunction(()=>document.querySelector('#stage .screen-text')?.textContent==='0:00');assert.equal(await page.locator('#countdown-pause').isDisabled(),true);
    await page.locator('#countdown').click();await page.locator('#stop-countdown').click();const stopped=await page.evaluate(()=>state.text);await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>state.text),stopped);assert.equal(await page.locator('#countdown-pause').isDisabled(),true);
    await page.locator('#countdown').click();await page.evaluate(()=>goLive(0));const song=await page.evaluate(()=>state);await page.waitForTimeout(350);assert.deepEqual(await page.evaluate(()=>state),song);assert.equal(await page.evaluate(()=>countdownClock.snapshot().phase),'idle');
    assert.deepEqual(errors,[]);console.log('PASS: invalid input preserves transport, exact pause/resume, native output, blackout/restore, completion, restart/stop, new-cue cancellation and responsive controls; '+(executablePath||'source'));
  }finally{
    clearTimeout(watchdog);await app?.close();if(path.dirname(profile)!==os.tmpdir()||!path.basename(profile).startsWith('promax-countdown-'))throw Error('Unexpected countdown profile');await fs.rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});
  }
}
run().then(()=>process.exit(0),error=>{console.error(error);process.exit(1);});
