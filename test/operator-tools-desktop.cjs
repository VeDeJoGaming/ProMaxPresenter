// Synthetic content only. An optional first argument selects a packaged/installed executable.
const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
async function run(){
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'promax-operator-')),env={...process.env,PROMAX_TEST_DATA:profile},errors=[];delete env.ELECTRON_RUN_AS_NODE;
  const executablePath=process.argv[2];let app;
  try{
    app=await electron.launch({executablePath,args:executablePath?[`--user-data-dir=${profile}`]:[path.join(__dirname,'..')],env,timeout:45000});
    const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.stack));await page.waitForFunction(()=>window.ProMaxControls&&window.ProMaxMeetings&&document.querySelector('#quick-open-button'));
    await page.evaluate(async()=>{await ProMaxControls.ready;await ProMaxControls.mutate('Operator fixture',()=>{
      songs=['Alpha','Bravo','Åpen'].map((title,i)=>({id:'song-'+i,title,lyrics:i===0?'Unique lyric marker':'Keep this song',lines:4,slides:[{id:'slide-'+i,text:'Generated slide '+i,section:'Verse',key:'v'}]}));selected='song-0';
      meetingFolders=['Friday','Sunday'].map((name,i)=>({id:'meeting-'+i,name,items:[{id:'item-'+i,type:'text',title:'Generated meeting cue',slides:[{id:'prepared-'+i,text:'Prepared public words',label:'Text'}]}]}));meetingSelected=null;
    });state={text:'Original live cue',black:false};paint();selectSong('song-1');});
    await page.locator('#song-favorite').click();assert.equal(await page.locator('#song-favorite').getAttribute('aria-pressed'),'true');
    await page.locator('#song-favorites').click();assert.equal(await page.locator('#library .song').count(),1);assert.match(await page.locator('#library .song').innerText(),/Bravo/);
    await page.keyboard.press('Control+k');await page.locator('#quick-open').waitFor({state:'visible'});
    await page.locator('#quick-open-search').fill('unique lyric');assert.equal(await page.locator('#quick-open-results button').count(),1);
    await fs.mkdir(path.join(__dirname,'..','test-results'),{recursive:true});await page.screenshot({path:path.join(__dirname,'..','test-results','quick-open.png')});
    await page.keyboard.press('Enter');assert.equal(await page.locator('#title').inputValue(),'Alpha');assert.equal(await page.locator('#library [data-song-id="song-0"]').count(),1);assert.equal(await page.evaluate(()=>state.text),'Original live cue');
    await page.keyboard.press('Control+k');await page.locator('#quick-open-search').fill('no match at all');await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>state.black),false,'Escape in finder must not blackout');
    await page.keyboard.press('Control+k');await page.locator('#quick-open-search').fill('day');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>meetingSelected),'meeting-1');assert.equal(await page.evaluate(()=>state.text),'Original live cue');
    await page.locator('#meeting-notes summary').click();await page.locator('#meeting-operator-note').fill('Private reminder: wait for sound operator');
    await page.locator('#meeting-operator-note').blur();await page.evaluate(()=>flushPendingSave());
    assert.equal(await page.evaluate(()=>ProMaxMeetings.folder().items[0].operatorNotes),'Private reminder: wait for sound operator');
    assert.equal(await page.locator('.meeting-item-note:visible').count(),1);assert.equal(await page.evaluate(()=>state.text),'Original live cue');
    await page.screenshot({path:path.join(__dirname,'..','test-results','operator-notes.png')});
    await page.evaluate(()=>ProMaxControls.undo());assert.equal(await page.evaluate(()=>ProMaxMeetings.folder().items[0].operatorNotes||''),'');
    await page.evaluate(()=>ProMaxControls.redo());assert.equal(await page.evaluate(()=>ProMaxMeetings.folder().items[0].operatorNotes),'Private reminder: wait for sound operator');
    await page.evaluate(async()=>{const verses=[{book:'Matt',chapter:5,verse:1,text:'Earlier chapter'},...Array.from({length:8},(_,i)=>({book:'Matt',chapter:6,verse:i+1,text:i===2?'Reader marker':'Nearby generated verse '+(i+1)})),{book:'Matt',chapter:7,verse:1,text:'Later chapter'}];await ProMaxFeatures.importBible(new File([JSON.stringify({name:'Operator test Bible',verses})],'operator-bible.json'));ProMaxFeatures.showTab('bible');});
    await page.locator('#bible-search').fill('reader marker');await page.getByRole('button',{name:'Read verses around Matteus 6:3',exact:true}).click();
    await page.getByRole('checkbox',{name:'Select Matteus 6:2',exact:true}).click();await page.getByRole('checkbox',{name:'Select Matteus 6:5',exact:true}).click({modifiers:['Shift']});
    assert.deepEqual(await page.evaluate(()=>ProMaxFeatures.passageForDrag(2).slides.flatMap(s=>s.biblePassage.verses.map(v=>v.verse))),[2,3,4,5]);
    await page.getByRole('button',{name:'Next chapter →',exact:true}).click();assert.match(await page.locator('.bible-context-bar strong').innerText(),/Matteus 7/);
    assert.equal(await page.getByRole('button',{name:'Next chapter →',exact:true}).isDisabled(),true);assert.equal(await page.locator('.bible-context-target').count(),0);
    await page.getByRole('button',{name:'← Previous chapter',exact:true}).click();assert.equal(await page.locator('.bible-context-target').count(),1);assert.equal(await page.locator('.verse-row input:checked').count(),4);
    await page.getByRole('button',{name:'← Previous chapter',exact:true}).click();assert.equal(await page.getByRole('button',{name:'← Previous chapter',exact:true}).isDisabled(),true);
    await page.getByRole('button',{name:'Next chapter →',exact:true}).click();await page.screenshot({path:path.join(__dirname,'..','test-results','bible-reader-navigation.png')});
    await page.getByRole('button',{name:'Clear selection',exact:true}).click();assert.equal(await page.locator('.verse-row input:checked').count(),0);
    await page.getByRole('button',{name:'← Back to search results',exact:true}).click();assert.equal(await page.locator('#bible-search').inputValue(),'reader marker');assert.equal(await page.evaluate(()=>state.text),'Original live cue');
    await page.reload();await page.waitForFunction(()=>window.ProMaxControls&&window.ProMaxMeetings);await page.evaluate(()=>ProMaxControls.ready);
    assert.deepEqual(await page.evaluate(()=>settings.songFavorites),['song-1']);assert.equal(await page.evaluate(()=>meetingFolders.find(f=>f.id==='meeting-1').items[0].operatorNotes),'Private reminder: wait for sound operator');
    assert.deepEqual(errors,[]);console.log('PASSED: favorites/filter, Ctrl+K lyrics/meetings/arrows/Enter/Escape, unchanged live cue, operator note privacy/undo/redo/restart, indexed Bible chapter navigation and range/clear selection; '+(executablePath||'source'));
  }finally{await app?.close();await fs.rm(profile,{recursive:true,force:true});}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
