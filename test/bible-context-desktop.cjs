// Generated fixture only. Optional first argument: packaged or installed executable.
const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
async function run(){
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'promax-context-'));
  const env={...process.env,PROMAX_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
  const executablePath=process.argv[2],errors=[];let app;
  try{
    app=await electron.launch({executablePath,args:executablePath?[`--user-data-dir=${profile}`]:[path.join(__dirname,'..')],env,timeout:45000});
    const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.stack));
    await page.waitForFunction(()=>window.ProMaxControls&&window.ProMaxFeatures);
    await page.evaluate(async()=>{await ProMaxControls.ready;
      const verses=[...Array.from({length:14},(_,i)=>({book:'Matt',chapter:6,verse:14-i,text:(14-i===9?'Synthetic search phrase. ':'')+'Generated context verse '+(14-i)})),{book:'Eph',chapter:1,verse:3,text:'Synthetic search phrase in another book'},{book:'Matt',chapter:7,verse:1,text:'Next chapter'}];
      await ProMaxFeatures.importBible(new File([JSON.stringify({name:'Context test',verses})],'context.json'));
      ProMaxMeetings.create('Synthetic context meeting');
      state={text:'Keep this live cue',black:false};paint();ProMaxFeatures.showTab('bible');
    });
    await page.locator('#bible-search').fill('Synthetic search phrase');
    assert.equal(await page.locator('.verse-row').count(),2);
    await fs.mkdir(path.join(__dirname,'..','test-results'),{recursive:true});
    await page.screenshot({path:path.join(__dirname,'..','test-results','bible-context-search.png')});
    await page.getByRole('checkbox',{name:'Select Matteus 6:9',exact:true}).check();
    await page.getByRole('button',{name:'Read verses around Matteus 6:9',exact:true}).click();
    assert.equal(await page.locator('.verse-row').count(),14);
    assert.match(await page.locator('.bible-context-target').innerText(),/Matteus 6:9/);
    assert.equal(await page.getByRole('checkbox',{name:'Select Matteus 6:9',exact:true}).isChecked(),true);
    assert.equal(await page.locator('.verse-row').first().getAttribute('data-verse-index'),'0');
    assert.match(await page.locator('.verse-row').first().innerText(),/Matteus 6:1\b/);
    await page.getByRole('checkbox',{name:'Select Matteus 6:8',exact:true}).check();
    await page.getByRole('checkbox',{name:'Select Matteus 6:10',exact:true}).check();
    assert.equal(await page.evaluate(()=>state.text),'Keep this live cue');
    const drag=await page.evaluate(()=>ProMaxFeatures.passageForDrag(8));
    assert.equal(drag.title,'Matteus 6:8-10');
    await fs.mkdir(path.join(__dirname,'..','test-results'),{recursive:true});
    await page.screenshot({path:path.join(__dirname,'..','test-results','bible-context.png')});
    await page.getByRole('button',{name:'← Back to search results',exact:true}).click();
    assert.equal(await page.locator('#bible-search').inputValue(),'Synthetic search phrase');
    assert.equal(await page.locator('.verse-row').count(),2);
    const restored=await page.evaluate(()=>ProMaxFeatures.passageForDrag(0));assert.equal(restored.title,'Matteus 6:8-10');
    await page.getByRole('button',{name:'Add passage to meeting',exact:true}).click();
    assert.equal(await page.evaluate(()=>ProMaxMeetings.folder().items[0].title),'Matteus 6:8-10');
    assert.equal(await page.evaluate(()=>state.text),'Keep this live cue');
    await page.getByRole('button',{name:'Show selected passage',exact:true}).click();
    assert.deepEqual(await page.evaluate(()=>state.biblePassage.verses.map(v=>v.verse)),[8,9]);
    await page.locator('#bible-search').fill('Eph 1:3');
    await page.getByRole('button',{name:'Read verses around Efeserne 1:3',exact:true}).click();
    assert.equal(await page.locator('.verse-row').count(),1);
    await page.getByRole('checkbox',{name:'Select Efeserne 1:3',exact:true}).check();
    await page.getByRole('button',{name:'Show selected passage',exact:true}).click();
    assert.deepEqual(await page.evaluate(()=>state.biblePassage.verses.map(v=>v.book)),['Efeserne']);
    assert.deepEqual(errors,[]);
    console.log('PASSED: full ordered chapter, highlighted search hit, nearby selection, drag passage, back/search preservation, unchanged live cue, passage order and chapter boundaries; '+(executablePath||'source'));
  }finally{await app?.close();await fs.rm(profile,{recursive:true,force:true});}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
