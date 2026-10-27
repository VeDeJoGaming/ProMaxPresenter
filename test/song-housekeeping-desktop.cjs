const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
async function run(){const profile=await fs.mkdtemp(path.join(os.tmpdir(),'promax-tidy-')),env={...process.env,PROMAX_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;let app;
  try{const executablePath=process.argv[2];app=await electron.launch({executablePath,args:executablePath?[`--user-data-dir=${profile}`]:[path.join(__dirname,'..')],env,timeout:45000});const p=await app.firstWindow();
    await p.waitForFunction(()=>window.ProMaxControls&&window.ProMaxMeetings);await p.evaluate(async()=>{await ProMaxControls.ready;
      await ProMaxControls.mutate('Synthetic housekeeping',()=>{songs=['Åpen','Ønske','Ære','Zebra','Beta','alfa'].map((title,i)=>({id:'song-'+i,title,lyrics:'Keep original '+i,lines:4,slides:[]}));songs.push({id:'empty',title:'Untitled song',lyrics:' ',lines:4,slides:[]});selected='song-5';meetingFolders=[{id:'meeting',name:'Keep order',items:[{id:'one',type:'song',songId:'song-0',title:'Åpen'},{id:'blank-item',type:'song',songId:'empty',title:'Empty'},{id:'two',type:'song',songId:'song-5',title:'alfa'}]}];});selectSong('song-5');});
    assert.deepEqual(await p.locator('#library .song').allTextContents(),['alfa0 slides','Beta0 slides','Zebra0 slides','Ære0 slides','Ønske0 slides','Åpen0 slides']);
    assert.deepEqual(await p.evaluate(()=>meetingFolders[0].items.map(i=>i.songId)),['song-0','song-5']);
    await p.locator('#new-song').click();assert.equal(await p.evaluate(()=>current().lyrics),'');assert.equal(await p.locator('#library .song').count(),7,'active draft stays editable');
    await p.evaluate(()=>selectSong('song-5'));assert.equal(await p.locator('#library .song').count(),6,'abandoned empty draft is removed');
    await p.locator('#new-song').click();await p.locator('#title').fill('Named draft');await p.evaluate(()=>{$('lyrics').value='Keep my draft';$('lyrics').dispatchEvent(new Event('input',{bubbles:true}));selectSong('song-5');});
    assert.equal(await p.locator('#library .song').count(),7,'draft with lyrics is kept');
    await p.reload();await p.waitForFunction(()=>window.ProMaxControls);assert.equal(await p.locator('#library .song').count(),7);
    assert.equal(await p.evaluate(()=>songs.some(s=>s.id==='empty')),false);
    console.log('PASSED: Norwegian alphabetical order, automatic empty cleanup, active drafts, nonempty draft persistence and unchanged meeting order; '+(executablePath||'source'));
  }finally{await app?.close();await fs.rm(profile,{recursive:true,force:true});}}
run().catch(e=>{console.error(e);process.exitCode=1;});
