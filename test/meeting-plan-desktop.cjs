/* Synthetic content only. Optional executable argument exercises a packaged app. */
const {_electron:electron}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
async function run(){
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'promax-plan-')),env={...process.env,PROMAX_TEST_DATA:profile},executablePath=process.argv[2];delete env.ELECTRON_RUN_AS_NODE;
  let app;const errors=[],output=path.join(__dirname,'../test-results');await fs.mkdir(output,{recursive:true});
  const watchdog=setTimeout(()=>{console.error('Meeting plan desktop check timed out.');app?.process().kill();process.exit(1);},120000);watchdog.unref();
  try{
    app=await electron.launch({executablePath,args:executablePath?[`--user-data-dir=${profile}`]:[path.join(__dirname,'..')],env,timeout:45000});
    const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));await page.waitForFunction(()=>window.ProMaxControls&&document.querySelector('#meeting-plan-open'));
    await page.evaluate(async()=>{await ProMaxControls.ready;await ProMaxControls.mutate('Running sheet fixture',()=>{
      songs=[{id:'song',title:'Opening song',lyrics:'Synthetic lyric must not be exported',lines:4,slides:[{id:'slide',text:'Public lyric',section:'Verse',key:'v'}]}];selected='song';
      meetingFolders=[{id:'plan',name:'Evening gathering · Synthetic example',operatorNotes:'Private team reminder: sound check at 23:30.',items:[
        {id:'welcome',type:'text',title:'Welcome & opening prayer',operatorNotes:'Private item reminder: wait for the sound operator.',slides:[{id:'welcome-slide',text:'Welcome, everyone',label:'Text'}]},
        {id:'music',type:'song',songId:'song',title:'Cached song title',plannedMinutes:15},
        {id:'reading',type:'bible',title:'Prepared reading',slides:[{id:'reading-slide',text:'Synthetic reading',label:'Text'}],plannedMinutes:10},
        {id:'video',type:'video',assetId:'unavailable',title:'A missing local clip',plannedMinutes:5}
      ]}];meetingSelected=null;
    });ProMaxMeetings.select('plan');state={text:'Retain this live cue',black:false};paint();});
    // Notes for the whole meeting must stay accessible while an item is selected.
    await page.locator('#meeting-notes-scope').selectOption('meeting');assert.equal(await page.locator('#meeting-operator-note').inputValue(),'Private team reminder: sound check at 23:30.');
    await page.locator('#meeting-notes-scope').selectOption('item');assert.match(await page.locator('#meeting-operator-note').inputValue(),/Private item reminder/);
    await page.locator('#meeting-plan-open').click();await page.locator('.running-sheet-row').first().waitFor();
    assert.equal(await page.locator('.running-sheet-row').count(),4);assert.equal(await page.locator('#meeting-plan-notes').isChecked(),false);assert.equal(await page.locator('.running-sheet-notes:visible').count(),0);
    assert.match(await page.locator('#meeting-plan-summary').innerText(),/1 duration not set/);assert.match(await page.locator('[data-plan-item="music"]').innerText(),/Opening song/);
    await page.locator('#meeting-plan-start').fill('23:50');await page.locator('#meeting-plan-start').blur();await page.waitForFunction(()=>!ProMaxControls.busy&&ProMaxMeetings.folder().plannedStart==='23:50');
    const duration=page.locator('[data-plan-item="welcome"] input');await duration.fill('20');await duration.blur();await page.waitForFunction(()=>!ProMaxControls.busy&&ProMaxMeetings.folder().items[0].plannedMinutes===20);
    assert.equal(await page.locator('[data-plan-item="music"] .running-sheet-time').innerText(),'00:10 (+1d)');assert.match(await page.locator('#meeting-plan-summary').innerText(),/50 min.*Ends 00:40/);
    assert.match(await page.locator('.meeting-item[data-item-id="music"] .meeting-item-timing').innerText(),/00:10.*15 min/);
    await page.evaluate(()=>ProMaxControls.undo());assert.equal(await duration.inputValue(),'');assert.match(await page.locator('#meeting-plan-summary').innerText(),/1 duration not set/);
    await page.evaluate(()=>ProMaxControls.redo());assert.equal(await duration.inputValue(),'20');assert.match(await page.locator('#meeting-plan-summary').innerText(),/50 min/);
    await duration.fill('-1');await duration.blur();assert.equal(await duration.inputValue(),'20');assert.match(await page.locator('#meeting-plan-message').innerText(),/whole number/);
    await duration.fill('1.5');await duration.blur();assert.equal(await duration.inputValue(),'20');
    await page.locator('#meeting-plan-notes').check();assert.equal(await page.locator('.running-sheet-notes:visible').count(),2);assert.match(await page.locator('#meeting-plan-dialog').innerText(),/Private team reminder/);
    await page.screenshot({path:path.join(output,'meeting-plan-wide.png')});
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.isVisible()).setSize(850,650));await page.screenshot({path:path.join(output,'meeting-plan-compact.png')});
    assert.equal(await page.locator('#meeting-plan-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true,'No horizontal overflow at minimum app size');
    await page.locator('#meeting-plan-copy').click();await page.waitForFunction(()=>!document.querySelector('#meeting-plan-copy').disabled);assert.match(await app.evaluate(({clipboard})=>clipboard.readText()),/Private item reminder/);
    await page.locator('#meeting-plan-notes').uncheck();await page.locator('#meeting-plan-copy').click();await page.waitForFunction(()=>!document.querySelector('#meeting-plan-copy').disabled);const copied=await app.evaluate(({clipboard})=>clipboard.readText());assert.doesNotMatch(copied,/Private|Synthetic lyric|Public lyric/);assert.match(copied,/Opening song/);
    // Native save dialog, PDF encoder and hidden-window cleanup, without touching user files.
    const pdf=path.join(output,'meeting-plan-public.pdf');await app.evaluate(({dialog},destination)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:destination});},pdf);
    const windowsBefore=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().length);
    await page.locator('#meeting-plan-pdf').click();await page.locator('#meeting-plan-message').filter({hasText:'PDF saved.'}).waitFor();const bytes=await fs.readFile(pdf);assert.equal(bytes.subarray(0,5).toString(),'%PDF-');assert.ok(bytes.length>3000);assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().length),windowsBefore);
    await page.locator('#meeting-plan-notes').check();await app.evaluate(({dialog},destination)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:destination});},path.join(output,'meeting-plan-notes.pdf'));
    await page.locator('#meeting-plan-pdf').click();await page.locator('#meeting-plan-message').filter({hasText:'PDF saved.'}).waitFor();
    await app.evaluate(({dialog})=>{dialog.showSaveDialog=async()=>({canceled:true});});await page.locator('#meeting-plan-pdf').click();await page.locator('#meeting-plan-message').filter({hasText:'Export cancelled.'}).waitFor();
    await app.evaluate(({dialog},destination)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:destination});},path.join(profile,'missing-directory','failure.pdf'));
    await page.locator('#meeting-plan-pdf').click();await page.waitForFunction(()=>!document.querySelector('#meeting-plan-pdf').disabled);assert.match(await page.locator('#meeting-plan-message').innerText(),/ENOENT|no such file/i);assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().length),windowsBefore);
    assert.equal(await page.evaluate(()=>state.text),'Retain this live cue');assert.equal(await page.evaluate(()=>state.black),false);
    await page.locator('#meeting-plan-close').click();await page.locator('#meeting-plan-open').click();assert.equal(await page.locator('#meeting-plan-notes').isChecked(),false,'Private notes opt-in resets each opening');
    await page.locator('#meeting-plan-close').click();await page.reload();await page.waitForFunction(()=>window.ProMaxControls&&document.querySelector('#meeting-plan-open'));await page.evaluate(()=>ProMaxControls.ready);await page.locator('#meeting-plan-open').click();
    assert.equal(await page.locator('#meeting-plan-start').inputValue(),'23:50');assert.equal(await page.locator('[data-plan-item="welcome"] input').inputValue(),'20');assert.equal(await page.locator('#meeting-plan-notes').isChecked(),false);
    // A longer running order scrolls vertically; its timing model remains exact.
    await page.locator('#meeting-plan-close').click();await page.evaluate(async()=>{await ProMaxControls.mutate('Long running sheet',()=>{const f=ProMaxMeetings.folder();f.items=Array.from({length:60},(_,i)=>({id:'long-'+i,type:'text',title:'Synthetic planned item '+(i+1),plannedMinutes:1,slides:[{id:'long-slide-'+i,text:'Words'}]}));});});await page.locator('#meeting-plan-open').click();assert.equal(await page.locator('.running-sheet-row').count(),60);assert.match(await page.locator('#meeting-plan-summary').innerText(),/1 h.*00:50/);
    await app.evaluate(({dialog},destination)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:destination});},path.join(output,'meeting-plan-long.pdf'));
    await page.locator('#meeting-plan-pdf').click();await page.locator('#meeting-plan-message').filter({hasText:'PDF saved.'}).waitFor();
    assert.deepEqual(errors,[]);console.log('PASS: running sheet timing/midnight/unknown durations, validation, undo/redo/restart, unchanged live cue, notes opt-in, clipboard, real PDF/cancel/write failure/window cleanup, compact and 60-item layouts; '+(executablePath||'source'));
  }finally{clearTimeout(watchdog);await app?.close();if(path.dirname(profile)!==os.tmpdir()||!path.basename(profile).startsWith('promax-plan-'))throw Error('Unexpected profile path');await fs.rm(profile,{recursive:true,force:true});}
}
run().then(()=>process.exit(0),error=>{console.error(error);process.exit(1);});
