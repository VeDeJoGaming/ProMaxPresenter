/* Button activation must not be intercepted by presentation shortcuts. */
const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
async function run(){
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'promax-preparation-keys-')),executablePath=process.argv[2];
  const env={...process.env,PROMAX_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
  let app;const errors=[];
  const watchdog=setTimeout(()=>{console.error('Preparation keyboard check timed out');app?.process().kill();process.exit(1);},90000);watchdog.unref();
  try{
    app=await electron.launch({executablePath,args:executablePath?[`--user-data-dir=${profile}`]:[path.join(__dirname,'..')],env,timeout:45000});
    assert.equal(path.resolve(await app.evaluate(({app})=>app.getPath('userData'))).toLowerCase(),path.resolve(profile).toLowerCase());
    const page=await app.firstWindow();page.on('pageerror',error=>errors.push(error.message));await page.waitForFunction(()=>window.ProMaxControls);await page.evaluate(()=>ProMaxControls.ready);
    await page.evaluate(async()=>{
      await ProMaxControls.mutate('Keyboard example',()=>{songs=[{id:'keyboard-song',title:'Keyboard example',lyrics:'[Verse]\nFirst synthetic slide\n\n[Chorus]\nSecond synthetic slide',lines:4,slides:[{id:'key-one',text:'First synthetic slide',section:'Verse',key:'v'},{id:'key-two',text:'Second synthetic slide',section:'Chorus',key:'c'}]}];selected='keyboard-song';});
      goLive(0);
    });
    await page.locator('#clear').focus();await page.keyboard.press('Space');const cleared=await page.evaluate(()=>state.text==='');
    await page.evaluate(()=>goLive(1));await page.locator('.slide-edit-button').first().focus();await page.keyboard.press('Enter');
    const editing=await page.evaluate(()=>({open:document.querySelector('#slide-editor').open,keptCue:state.text==='Second synthetic slide'}));
    if(editing.open)await page.locator('#slide-edit-cancel').click();
    console.log('Preparation key checks: '+JSON.stringify({cleared,editing}));
    assert.equal(cleared,true,'Space on Clear must activate Clear, not the next slide');
    assert.deepEqual(editing,{open:true,keptCue:true},'Enter on Edit must open the editor without showing that slide');
    await page.evaluate(()=>{goLive(0);document.activeElement.blur();});await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>state.text),'Second synthetic slide','Space still advances when presentation shortcuts own focus');
    await page.locator('.slide-card').first().focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>state.text),'First synthetic slide','Enter on a slide card still presents that slide');
    const lyricsOpen=await page.locator('#lyrics-fold').evaluate(el=>el.open);await page.locator('#lyrics-fold>summary').focus();await page.keyboard.press('Space');assert.equal(await page.locator('#lyrics-fold').evaluate(el=>el.open),!lyricsOpen);assert.equal(await page.evaluate(()=>state.text),'First synthetic slide','Space on a disclosure must keep the live cue');
    await page.evaluate(()=>{ProMaxFeatures.showTab('videos');window.preparationCue=state;});
    const add=page.getByRole('button',{name:'Add local videos',exact:true});await add.focus();const videoChooser=page.waitForEvent('filechooser');await page.keyboard.press('Space');
    await (await videoChooser).setFiles(path.join(__dirname,'../desktop/smoke-video.webm'));await page.waitForFunction(()=>ProMaxFeatures.getVideos().length===1);
    await page.waitForFunction(()=>document.activeElement?.textContent==='Add local videos');assert.equal(await page.evaluate(()=>state===preparationCue),true,'Keyboard import must keep the live cue and restore preparation focus');
    await page.evaluate(()=>ProMaxFeatures.playVideo(ProMaxFeatures.getVideos()[0]));await page.waitForFunction(()=>document.querySelector('#preview video')?.readyState>=2);
    await page.locator('#feature-view .feature-actions').getByRole('button',{name:'Stop',exact:true}).focus();await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>state.video),undefined,'Space on Stop must stop the clip, not pause it');
    await page.evaluate(()=>{window.preparationCue=state;});
    await fs.mkdir(path.join(__dirname,'../test-results'),{recursive:true});await page.screenshot({path:path.join(__dirname,'../test-results/preparation-keys-video.png')});
    await page.evaluate(()=>ProMaxSettings.open('bible'));
    const bibleFile=path.join(profile,'keyboard-bible.json');await fs.writeFile(bibleFile,JSON.stringify({name:'Synthetic keyboard Bible',verses:[{book:'John',chapter:3,verse:16,text:'Synthetic keyboard passage'}]}));
    const importBible=page.getByRole('button',{name:'Import Bible text',exact:true});await importBible.focus();const bibleChooser=page.waitForEvent('filechooser');await page.keyboard.press('Enter');await (await bibleChooser).setFiles(bibleFile);
    await page.waitForFunction(()=>ProMaxFeatures.getBible()?.name==='Synthetic keyboard Bible');assert.equal(await page.locator('#app-settings-dialog').evaluate(el=>el.open),true);assert.equal(await page.evaluate(()=>state===preparationCue),true);
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.getTitle()==='ProMax Presenter').setSize(850,650));
    assert.equal(await page.locator('#app-settings-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);await page.screenshot({path:path.join(__dirname,'../test-results/preparation-keys-bible-compact.png')});
    assert.deepEqual(errors,[]);
    console.log('PASS: Space activates buttons, Enter edits without cueing, slide/body shortcuts remain, keyboard video/Bible pickers, restored import focus and unchanged live cue; '+(executablePath||'source'));
  }finally{
    clearTimeout(watchdog);await app?.close();
    if(path.dirname(profile)!==os.tmpdir()||!path.basename(profile).startsWith('promax-preparation-keys-'))throw Error('Unexpected keyboard test profile');
    await fs.rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});
  }
}
run().then(()=>process.exit(0),error=>{console.error(error);process.exit(1);});
