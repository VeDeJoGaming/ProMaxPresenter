/* Real native players, synthetic profiles/HTTPS responses and hidden windows. */
const {launch}=require('./hidden-native.cjs');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
async function run(){
 const profile=await fs.mkdtemp(path.join(os.tmpdir(),'promax-close-youtube-'));let app;
 const watchdog=setTimeout(()=>{app?.child.kill();console.error('YouTube preview close timed out');process.exit(1);},90000);watchdog.unref();
 try{
  app=await launch(profile,process.argv[2]);const {page,context,main}=app,errors=[];page.on('pageerror',e=>errors.push(e.message));
  const clip=(await fs.readFile(path.join(__dirname,'../desktop/smoke-video.webm'))).toString('base64');
  const html='<body><ytd-app><div id="movie_player"><video autoplay muted loop src="data:video/webm;base64,'+clip+'"></video></div></ytd-app>';
  await main(`(()=>{const {screen,session}=testRequire('electron'),primary=screen.getPrimaryDisplay();screen.getAllDisplays=()=>[primary,{...primary,id:primary.id+1000,label:'Synthetic preview output'}];screen.getDisplayMatching=()=>primary;globalThis.holdPreviewLoad=false;session.fromPartition('persist:promax-youtube-browser').protocol.handle('https',async()=>{if(holdPreviewLoad)await new Promise(r=>globalThis.releasePreviewLoad=r);return new Response(${JSON.stringify(html)},{headers:{'Content-Type':'text/html'}});});return true;})()`);
  await page.evaluate(async()=>{window.originalPreviewCue=state;window.previewEntry=await ProMaxYouTubeLibrary.add('https://youtu.be/abcdefghijk','Synthetic preview clip');});
  let player=context.pages().find(p=>p.url().startsWith('https://www.youtube.com/watch'));assert(player);await player.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
  const close=()=>page.locator('[data-youtube-preview-close]').click();
  let closed=player.waitForEvent('close');await close();await closed;
  assert.equal(await page.locator('.youtube-preparation,[data-youtube-preview-close]').count(),0);
  assert.equal(await page.evaluate(()=>ProMaxYouTubeLibrary.list().length),1,'Closing a preview does not remove its library entry');
  assert.equal(await page.evaluate(()=>state===originalPreviewCue),true,'Closing a preloaded video never changes the live cue');
  assert.equal(await page.locator('[data-youtube-status]').innerText(),'Not prepared');
  await page.evaluate(()=>ProMaxYouTubeLibrary.prepare(previewEntry));player=context.pages().find(p=>p.url().startsWith('https://www.youtube.com/watch'));assert(player);await player.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
  assert.deepEqual(await page.evaluate(()=>promaxDesktop.closeYouTubePreview('not-the-open-video')),{closed:false});assert.equal(player.isClosed(),false,'A stale close cannot close another video');
  closed=player.waitForEvent('close');await close();await closed;
  // Closing during an unfinished network load must be immediate and stay closed.
  await main('holdPreviewLoad=true');
  await page.evaluate(()=>{window.loadingPreview=ProMaxYouTubeLibrary.prepare(previewEntry).then(()=>window.previewLoadSettled=true);});
  for(let n=0;n<100&&!await main('typeof releasePreviewLoad===\'function\'');n++)await new Promise(r=>setTimeout(r,20));
  assert.equal(await main('typeof releasePreviewLoad===\'function\''),true);
  await close();await page.waitForFunction(()=>window.previewLoadSettled,{},{timeout:5000});
  await main('holdPreviewLoad=false;releasePreviewLoad();releasePreviewLoad=null');
  await page.waitForTimeout(150);assert.equal(await page.locator('.youtube-preparation').count(),0,'A late network response does not restore a closed preview');
  assert.equal(await page.evaluate(()=>state===originalPreviewCue),true);
  // The shared native player must remain untouched after it has moved to output.
  await page.evaluate(()=>ProMaxYouTubeLibrary.prepare(previewEntry));player=context.pages().find(p=>p.url().startsWith('https://www.youtube.com/watch'));await player.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
  await page.waitForFunction(()=>/\d+p/.test(document.querySelector('[data-youtube-status]')?.textContent));
  await page.evaluate(()=>openOutput());await page.waitForFunction(()=>nativeOutputActive);await page.evaluate(()=>ProMaxYouTubeLibrary.play(previewEntry));
  await player.waitForSelector('[data-promax-presentation]');await player.evaluate(()=>{window.existingPreviewPlayer=document.querySelector('video');window.existingPreviewSource=existingPreviewPlayer.currentSrc;});
  await page.evaluate(()=>{window.existingYoutubeCue=state;});await close();
  assert.equal(await page.evaluate(()=>state===existingYoutubeCue&&state.youtube.id===previewEntry.id),true);
  assert.equal(await player.evaluate(()=>document.querySelector('video')===existingPreviewPlayer&&existingPreviewPlayer.currentSrc===existingPreviewSource&&!existingPreviewPlayer.paused),true,'Closing the preview keeps the same video playing on output');
  assert.equal(player.isClosed(),false);assert.equal(await page.locator('.youtube-preparation').count(),0);
  assert.deepEqual(errors,[]);console.log('PASS: Close preview removes idle native player, cancels an unfinished load, ignores stale IDs, reopens, preserves library and cue, and keeps an active output playing; '+(process.argv[2]||'source'));
 }finally{clearTimeout(watchdog);await app?.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
