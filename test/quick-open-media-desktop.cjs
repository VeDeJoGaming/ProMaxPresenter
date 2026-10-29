/* Synthetic cross-library navigation. Never prepare or cue a YouTube player. */
const {_electron:electron}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
async function run(){
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'promax-find-')),env={...process.env,PROMAX_TEST_DATA:profile},executablePath=process.argv[2];delete env.ELECTRON_RUN_AS_NODE;let app;const errors=[];
  const watchdog=setTimeout(()=>{console.error('Cross-library finder check timed out');app?.process().kill();process.exit(1);},90000);watchdog.unref();
  try{
    app=await electron.launch({executablePath,args:executablePath?[`--user-data-dir=${profile}`]:[path.join(__dirname,'..')],env,timeout:45000});const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));
    await page.waitForFunction(()=>window.ProMaxControls&&window.ProMaxQuickOpenSearch);await page.evaluate(()=>ProMaxControls.ready);
    await page.evaluate(async videoData=>{
      await ProMaxControls.mutate('Finder catalog',async()=>{
        songs=[{id:'song',title:'Opening song',lyrics:'Unique lyric words',slides:[{id:'slide',text:'Words',section:'Verse',key:'v'}],lines:4}];selected='song';
        meetingFolders=[{id:'meeting',name:'Sunday meeting',items:[{id:'text',type:'text',title:'Welcome',slides:[{id:'text-slide',text:'Words'}]}]}];meetingSelected=null;
        await ProMaxFeatures.importBible(new File([JSON.stringify({name:'Synthetic finder Bible',verses:[{book:'John',chapter:3,verse:15,text:'Synthetic before'},{book:'John',chapter:3,verse:16,text:'Unique verse marker'},{book:'John',chapter:3,verse:17,text:'Synthetic after'}]})],'finder.json'));
        await storedAsset('put',new Blob([Uint8Array.from(atob(videoData),c=>c.charCodeAt(0))],{type:'video/webm'}),'video:clip');
        const old=ProMaxFeatures.history.take();await ProMaxFeatures.history.apply({...old,videos:[{id:'clip',name:'Håp over sjøen.webm',size:1024,type:'video/webm'}],documents:[{id:'deck',title:'Welcome deck',slides:['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lZ0AAAAASUVORK5CYII=']}]});
        await ProMaxYouTubeLibrary.history.apply([{...ProMaxYouTubeLinks.parse('https://youtu.be/M7lc1UVf-VE'),id:'yt',title:'Recorded message'}]);
      });ProMaxMeetings.select('meeting');state={text:'Keep this public cue',black:false};paint();
      window.finderPrepareCalls=0;const prepare=ProMaxYouTubeLibrary.prepare;ProMaxYouTubeLibrary.prepare=function(){finderPrepareCalls++;return prepare.apply(this,arguments);};
    },(await fs.readFile(path.join(__dirname,'../desktop/smoke-video.webm'))).toString('base64'));
    async function search(query,filter='all'){
      await page.keyboard.press('Control+k');await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true,repeat:true,bubbles:true,cancelable:true})));assert.equal(await page.locator('#quick-open').isVisible(),true,'Holding Ctrl+K opens the finder only once');await page.locator('#quick-open-search').fill(query);if(filter!=='all')await page.locator('[data-quick-filter="'+filter+'"]').click();
    }
    async function unchanged(){assert.equal(await page.evaluate(()=>state.text),'Keep this public cue');assert.equal(await page.evaluate(()=>state.black),false);}
    await search('Joh 3:16','bible');assert.equal(await page.locator('[data-quick-type="bible"]').count(),1);await page.keyboard.press('Enter');
    assert.equal(await page.locator('.bible-context-target').count(),1);assert.equal(await page.locator('.verse-row').count(),3);assert.equal(await page.locator('#bible-search').inputValue(),'Johannes 3:16');await unchanged();await page.keyboard.press('Enter');await unchanged();
    await search('unique verse','bible');await page.keyboard.press('Enter');assert.match(await page.locator('.bible-context-target').innerText(),/Unique verse marker/);await unchanged();
    await search('hap sjoen','media');assert.equal(await page.locator('[data-quick-type="video"]').count(),1);await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>ProMaxFeatures.focusedAsset()),'clip');assert.match(await page.locator('#feature-view h2').innerText(),/Håp/);assert.equal(await page.locator('.meeting-video-preview').evaluate(v=>v.paused),true);await unchanged();
    await search('Welcome deck','media');await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>ProMaxFeatures.focusedAsset()),'deck');assert.equal(await page.locator('.document-slide').count(),1);await unchanged();
    await search('Recorded message','media');await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>ProMaxYouTubeLibrary.focused()?.id),'yt');assert.equal(await page.evaluate(()=>finderPrepareCalls),0);await unchanged();
    await search('Sunday','meetings');await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>meetingSelected),'meeting');await unchanged();
    await search('unique lyric','songs');await page.keyboard.press('Enter');assert.equal(await page.locator('#title').inputValue(),'Opening song');await unchanged();
    await search('');await page.locator('[data-quick-filter="bible"]').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#quick-open').isVisible(),true);assert.equal(await page.locator('[data-quick-filter="bible"]').getAttribute('aria-pressed'),'true');assert.match(await page.locator('#quick-open-status').innerText(),/at least two/);
    await page.locator('#quick-open-search').fill('marker');await fs.mkdir(path.join(__dirname,'../test-results'),{recursive:true});await page.screenshot({path:path.join(__dirname,'../test-results/quick-open-bible.png')});
    await page.keyboard.press('Escape');await unchanged();
    await search('');await page.locator('[aria-label="Close quick open"]').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#quick-open').isVisible(),false);await unchanged();
    await page.reload();await page.waitForFunction(()=>window.ProMaxQuickOpenSearch&&window.ProMaxControls);await page.evaluate(()=>ProMaxControls.ready);await search('Recorded message','media');assert.equal(await page.locator('[data-quick-type="youtube"]').count(),1);await page.keyboard.press('Escape');
    assert.deepEqual(errors,[]);console.log('PASS: Ctrl+K Bible reference/text opens chapter, video/PowerPoint/YouTube navigation, type filters, Nordic matching, keyboard activation/close, restart, no live cue or YouTube prepare; '+(executablePath||'source'));
  }finally{clearTimeout(watchdog);await app?.close();if(path.dirname(profile)!==os.tmpdir()||!path.basename(profile).startsWith('promax-find-'))throw Error('Unexpected test profile');await fs.rm(profile,{recursive:true,force:true});}
}
run().then(()=>process.exit(0),error=>{console.error(error);process.exit(1);});
