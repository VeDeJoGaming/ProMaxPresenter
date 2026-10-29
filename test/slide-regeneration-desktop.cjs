/* Keep prepared slide identity and the live cursor while regenerating lyrics. */
const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
async function run(){
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'promax-regeneration-')),executablePath=process.argv[2],env={...process.env,PROMAX_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
  let app;const errors=[];
  const watchdog=setTimeout(()=>{console.error('Slide regeneration check timed out');app?.process().kill();process.exit(1);},90000);watchdog.unref();
  async function launch(){app=await electron.launch({executablePath,args:executablePath?[`--user-data-dir=${profile}`]:[path.join(__dirname,'..')],env,timeout:45000});assert.equal(path.resolve(await app.evaluate(({app})=>app.getPath('userData'))).toLowerCase(),path.resolve(profile).toLowerCase());const page=await app.firstWindow();page.on('pageerror',error=>errors.push(error.message));await page.waitForFunction(()=>window.ProMaxControls);await page.evaluate(()=>ProMaxControls.ready);return page;}
  try{
    let page=await launch();await page.evaluate(async()=>{
      window.regenerationLyrics='[Verse 1]\nOpening words\n\n[Chorus]\nMiddle words\n\n[Verse 2]\nClosing words';
      await ProMaxControls.mutate('Regeneration example',()=>{songs=[{id:'regeneration-song',title:'Synthetic regeneration example',lyrics:regenerationLyrics,lines:4,slides:parseLyrics(regenerationLyrics,4).map((slide,index)=>({...slide,id:'original-'+index,key:['q','w','e'][index]}))}];selected='regeneration-song';});
      window.originalGenerated=structuredClone(current().slides);goLive(1);window.regenerationCue=state;document.querySelector('#lyrics-fold').open=true;
    });
    await page.locator('#lyrics').fill('[Intro]\nNew opening\n\n'+await page.evaluate(()=>regenerationLyrics));await page.locator('#build').click();
    assert.deepEqual(await page.evaluate(()=>current().slides.slice(1).map(s=>s.key)),['q','w','e'],'Unchanged content must retain custom shortcuts when a slide is inserted before it');
    assert.deepEqual(await page.evaluate(()=>current().slides.slice(1).map(s=>s.id)),['original-0','original-1','original-2']);assert.equal(await page.evaluate(()=>liveIndex),2);assert.equal(await page.evaluate(()=>state===regenerationCue),true);
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].focus());await page.waitForFunction(()=>document.hasFocus());await page.evaluate(()=>document.activeElement.blur());await page.keyboard.press('q');assert.equal(await page.evaluate(()=>state.text),'Opening words');await page.keyboard.press('w');assert.equal(await page.evaluate(()=>state.text),'Middle words');
    await page.waitForFunction(()=>{const text=document.querySelector('#preview .screen-text');return text?.textContent==='Middle words'&&Number(getComputedStyle(text).opacity)>.99;});await fs.mkdir(path.join(__dirname,'../test-results'),{recursive:true});await page.locator('.slide-card.active').evaluate(el=>el.scrollIntoView({block:'center'}));await page.screenshot({path:path.join(__dirname,'../test-results/slide-regeneration.png')});
    await page.locator('#next').click();assert.equal(await page.evaluate(()=>state.text),'Closing words','Next continues after the retained live slide');
    await page.evaluate(()=>{window.regenerationNext=state;return ProMaxControls.undo();});assert.equal(await page.evaluate(()=>current().slides.length),3);assert.equal(await page.evaluate(()=>state===regenerationNext),true);
    await page.evaluate(()=>ProMaxControls.redo());assert.equal(await page.evaluate(()=>current().slides.length),4);assert.equal(await page.evaluate(()=>liveIndex),3);
    await page.locator('#lyrics').fill((await page.evaluate(()=>current().lyrics)).replace('[Verse 1]','[Opening verse]'));await page.locator('#build').click();assert.equal(await page.evaluate(()=>current().slides[1].key),'q','A unique unchanged text keeps its shortcut across a section rename');
    await page.locator('#lyrics').fill((await page.evaluate(()=>current().lyrics)).replace('Middle words','Edited middle words'));await page.locator('#build').click();assert.notEqual(await page.evaluate(()=>current().slides[2].id),'original-1');assert.equal(await page.evaluate(()=>current().slides[2].key),'c');
    const beforeNoop=await page.evaluate(()=>current().slides.map(s=>s.id));await page.locator('#build').click();assert.deepEqual(await page.evaluate(()=>current().slides.map(s=>s.id)),beforeNoop);await page.evaluate(()=>ProMaxControls.undo());assert.equal(await page.evaluate(()=>current().slides[2].text),'Middle words','An unchanged Generate does not add an undo step');
    const saved=await page.evaluate(()=>current().slides);await app.close();app=null;page=await launch();assert.deepEqual(await page.evaluate(()=>current().slides),saved);assert.deepEqual(errors,[]);
    console.log('PASS: regenerated IDs/custom keys after insertion/rename, retained live cursor/next cue, unchanged live state, undo/redo, changed text defaults, no-op history and restart; '+(executablePath||'source'));
  }finally{clearTimeout(watchdog);await app?.close();if(path.dirname(profile)!==os.tmpdir()||!path.basename(profile).startsWith('promax-regeneration-'))throw Error('Unexpected regeneration profile');await fs.rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}
}
run().then(()=>process.exit(0),error=>{console.error(error);process.exit(1);});
