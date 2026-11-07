const {launch}=require('./hidden-native.cjs');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
async function run(){
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'promax-youtube-timers-')),evidence=path.join(__dirname,'../artifacts/test-results/youtube-timers');await fs.mkdir(evidence,{recursive:true});
  let app;const watchdog=setTimeout(()=>{app?.child.kill();console.error('YouTube timer test timed out');process.exit(1);},90000);watchdog.unref();
  try{
    app=await launch(profile,process.argv[2]);const {page,main,context}=app,errors=[];page.on('pageerror',e=>errors.push(e.message));
    const clip=(await fs.readFile(path.join(__dirname,'../desktop/smoke-video.webm'))).toString('base64');
    const html='<!doctype html><body style="margin:0;background:#172b3b"><ytd-app><div id="movie_player"><video autoplay muted loop src="data:video/webm;base64,'+clip+'"></video></div></ytd-app>';
    await main(`(()=>{const {screen,session}=testRequire('electron'),primary=screen.getPrimaryDisplay();screen.getAllDisplays=()=>[primary,{...primary,id:primary.id+1000,label:'Synthetic timer output'}];screen.getDisplayMatching=()=>primary;session.fromPartition('persist:promax-youtube-browser').protocol.handle('https',()=>new Response(${JSON.stringify(html)},{headers:{'Content-Type':'text/html'}}));return true;})()`);
    await page.evaluate(async()=>{window.timerEntry=await ProMaxYouTubeLibrary.add('https://youtu.be/abcdefghijk','Synthetic YouTube clip');});
    const youtube=context.pages().find(p=>p.url().startsWith('https://www.youtube.com/watch'));assert(youtube);await youtube.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
    await page.evaluate(()=>openOutput());await page.waitForTimeout(1100);await page.evaluate(()=>ProMaxYouTubeLibrary.play(timerEntry));
    await youtube.waitForSelector('[data-promax-presentation]');await youtube.evaluate(()=>{window.originalPlayer=document.querySelector('video');window.originalSource=originalPlayer.currentSrc;});
    await page.evaluate(()=>{document.querySelector('#minutes').closest('details').open=true;document.querySelector('#minutes').value='0.1';document.querySelector('#countdown-position').value='bottom-right';document.querySelector('#countdown-position').dispatchEvent(new Event('change'));document.querySelector('#countdown').click();});
    await youtube.waitForSelector('[data-promax-countdown]');assert.equal(await youtube.locator('[data-promax-countdown]').innerText(),'0:06');
    for(const place of ['top-left','top-center','top-right','middle-left','center','middle-right','bottom-left','bottom-center','bottom-right']){
      await page.selectOption('#countdown-position',place);await youtube.waitForFunction(place=>document.querySelector('[data-promax-countdown]')?.dataset.position===place,place);
      const geometry=await youtube.locator('[data-promax-countdown]').evaluate(el=>{const r=el.getBoundingClientRect();return {visible:getComputedStyle(el).visibility==='visible',inside:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight};});assert.deepEqual(geometry,{visible:true,inside:true},place);
    }
    console.log('Timer positions verified');
    await page.evaluate(()=>document.querySelector('#countdown-pause').click());const paused=await youtube.locator('[data-promax-countdown]').innerText();await page.waitForTimeout(1100);assert.equal(await youtube.locator('[data-promax-countdown]').innerText(),paused);
    await page.evaluate(()=>toggleBlackout());assert.equal(await main("(()=>{const win=testRequire('electron').BrowserWindow.getAllWindows().find(w=>w.getTitle()==='ProMax Presentation');return win.contentView.children.every(v=>!v.getVisible());})()"),true);
    await page.evaluate(()=>toggleBlackout());await page.waitForTimeout(150);assert.equal(await youtube.locator('[data-promax-countdown]').innerText(),paused);
    await page.evaluate(()=>document.querySelector('#stop-countdown').click());await youtube.waitForSelector('[data-promax-countdown]',{state:'detached'});
    assert.equal(await youtube.evaluate(()=>document.querySelector('video')===originalPlayer&&originalPlayer.currentSrc===originalSource&&!originalPlayer.paused),true,'Timer controls preserve video identity, source and playback');
    await page.selectOption('#timer-mode','stopwatch');await page.evaluate(()=>document.querySelector('#countdown').click());await youtube.waitForFunction(()=>document.querySelector('[data-promax-countdown]')?.textContent==='0:01');
    await page.evaluate(()=>document.querySelector('#countdown-pause').click());const elapsed=await page.evaluate(()=>stopwatchClock.snapshot().elapsedMs);await page.waitForTimeout(1100);assert.equal(await page.evaluate(()=>stopwatchClock.snapshot().elapsedMs),elapsed);
    await page.evaluate(()=>document.querySelector('#countdown-pause').click());await page.waitForFunction(elapsed=>stopwatchClock.snapshot().elapsedMs>elapsed+900,elapsed);
    await page.evaluate(()=>goLive(0));await youtube.waitForSelector('[data-promax-presentation]',{state:'detached'});assert.equal(await youtube.locator('[data-promax-countdown]').count(),0);assert.equal(await page.evaluate(()=>stopwatchClock.snapshot().phase),'idle');
    const output=context.pages().find(p=>p.url().endsWith('/desktop/output.html'));await output.waitForFunction(()=>!document.querySelector('#stage .screen-text')?.hidden);
    // Standalone stopwatch uses the actual output renderer too.
    await page.evaluate(()=>document.querySelector('#countdown').click());await output.waitForFunction(()=>document.querySelector('[data-promax-countdown]')?.textContent==='0:01');
    await page.evaluate(()=>{stopTimer();save();});assert.deepEqual(errors,[]);
    console.log('Timer behavior verified, checking restart');await app.close();app=await launch(profile,process.argv[2]);assert.equal(await app.page.inputValue('#timer-mode'),'stopwatch');assert.equal(await app.page.inputValue('#countdown-position'),'bottom-right');
    console.log('PASS: native YouTube timer overlay, all nine positions, video preservation, pause/resume, blackout, stopwatch, cue cancellation, standalone output and saved controls; '+(process.argv[2]||'source'));
  }finally{clearTimeout(watchdog);await app?.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
