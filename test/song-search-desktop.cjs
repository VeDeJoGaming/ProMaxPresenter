// Synthetic profile only; also accepts an installed executable as its first argument.
const { _electron:electron }=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
async function run(){
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'promax-search-')),errors=[];
  const env={...process.env,PROMAX_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
  const executablePath=process.argv[2];let app;
  try{
    app=await electron.launch({executablePath,args:executablePath?[`--user-data-dir=${profile}`]:[path.join(__dirname,'..')],env,timeout:45000});
    const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));
    await page.waitForFunction(()=>window.ProMaxControls&&window.ProMaxMeetings);
    await page.evaluate(async()=>{await ProMaxControls.ready;await ProMaxControls.mutate('Synthetic songs',()=>{
      songs=[{id:'evening',title:'Evening prayer',lyrics:'Håp over sjøen\nA light shines in the night',lines:4,slides:[{text:'Synthetic live cue',section:'Verse'}]},
        {id:'light',title:'Light',lyrics:'A new morning',lines:4,slides:[]}];selected='evening';
    });ProMaxMeetings.select(null);selectSong('evening');state={text:'Synthetic live cue',black:false};paint();});
    await page.locator('#search').fill('light');
    await page.waitForFunction(()=>$('library').children[0]?.dataset.songId==='light');
    assert.match(await page.locator('#library .song').nth(1).innerText(),/A light shines/);
    await page.locator('#search').fill('HAP sjoen');
    await page.waitForFunction(()=>$('library').children.length===1);
    assert.equal(await page.locator('#library .song').getAttribute('data-song-id'),'evening');
    await fs.mkdir(path.join(__dirname,'..','test-results'),{recursive:true});
    await page.screenshot({path:path.join(__dirname,'..','test-results','song-search.png')});
    await page.evaluate(()=>{window.originalLyrics=$('lyrics').value;$('lyrics').value='Changed lyrics';$('lyrics').dispatchEvent(new Event('input',{bubbles:true}));});
    await page.locator('#song-search-empty').waitFor({state:'visible'});
    await page.evaluate(()=>{$('lyrics').value=originalLyrics;$('lyrics').dispatchEvent(new Event('input',{bubbles:true}));});
    await page.waitForFunction(()=>$('library').children.length===1);
    await page.locator('#search').fill('no-such-song');await page.locator('#song-search-empty').waitFor({state:'visible'});
    assert.equal(await page.locator('#song-search-results').innerText(),'0 songs found');
    await page.locator('#search').fill('');await page.waitForFunction(()=>$('library').children.length===2);
    await page.evaluate(()=>ProMaxMeetings.create('Synthetic meeting'));
    await page.locator('#meeting-add-song').click();await page.locator('#meeting-song-search').fill('shines night');
    assert.equal(await page.locator('#meeting-song-options button').count(),1);
    await page.locator('#meeting-song-options button').click();
    assert.equal(await page.evaluate(()=>ProMaxMeetings.folder().items[0].songId),'evening');
    assert.equal(await page.evaluate(()=>state.text),'Synthetic live cue');
    await page.locator('#meeting-song-close').click();
    await page.reload();await page.waitForFunction(()=>window.ProMaxMeetings);
    assert.equal(await page.evaluate(()=>ProMaxMeetings.folder().items[0].songId),'evening');
    assert.deepEqual(errors,[]);
    console.log('PASSED: title ranking, Nordic lyric search, excerpts, live lyric edits, empty/reset, meeting picker/add, unchanged live cue and persisted meeting; '+(executablePath||'source'));
  }finally{await app?.close();await fs.rm(profile,{recursive:true,force:true});}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
