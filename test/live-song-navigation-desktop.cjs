/* Return to a real live song without changing output or resetting its cursor. */
const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
async function run(){
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'promax-live-song-')),executablePath=process.argv[2],env={...process.env,PROMAX_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
  let app;const errors=[];
  const watchdog=setTimeout(()=>{console.error('Live song navigation check timed out');app?.process().kill();process.exit(1);},90000);watchdog.unref();
  try{
    app=await electron.launch({executablePath,args:executablePath?[`--user-data-dir=${profile}`]:[path.join(__dirname,'..')],env,timeout:45000});assert.equal(path.resolve(await app.evaluate(({app})=>app.getPath('userData'))).toLowerCase(),path.resolve(profile).toLowerCase());
    const page=await app.firstWindow();page.on('pageerror',error=>errors.push(error.message));await page.waitForFunction(()=>window.ProMaxControls);await page.evaluate(()=>ProMaxControls.ready);
    await page.evaluate(async()=>{
      await ProMaxControls.mutate('Live navigation examples',()=>{songs=['live-song','other-song'].map((id,index)=>({id,title:index?'Other preparation':'Actual live song',lyrics:'Synthetic words',lines:4,slides:[0,1,2].map(n=>({id:id+'-'+n,text:(index?'Other':'Live')+' words '+n,section:'Verse '+(n+1),key:String(n+1)}))}));selected='live-song';meetingFolders=[];meetingSelected=null;});
      goLive(1);window.originalSongCue=state;selectSong('other-song');selectSong('live-song');
    });
    assert.equal(await page.evaluate(()=>liveIndex),1,'Reopening the actual live song must retain its cursor');assert.equal(await page.evaluate(()=>state===originalSongCue),true);
    await app.evaluate(({screen})=>{const primary=screen.getPrimaryDisplay();screen.getAllDisplays=()=>[primary,{...primary,id:primary.id+1000,label:'Synthetic live song output'}];screen.getDisplayMatching=()=>primary;});
    const opened=app.waitForEvent('window',p=>p.url().endsWith('/desktop/output.html'));await page.evaluate(()=>openOutput());const output=await opened;await output.waitForFunction(()=>document.querySelector('#stage .screen-text')?.textContent==='Live words 1');
    await page.evaluate(()=>{selectSong('other-song');ProMaxFeatures.showTab('bible');});const jump=page.locator('#meeting-open-live');await jump.waitFor({state:'visible'});assert.equal(await jump.innerText(),'Open live song');await jump.click();
    assert.deepEqual(await page.evaluate(()=>({selected,liveIndex,meetingSelected,same:state===originalSongCue})),{selected:'live-song',liveIndex:1,meetingSelected:null,same:true});assert.equal(await page.evaluate(()=>document.activeElement.matches('.song.active')),true);
    await page.waitForFunction(()=>{const text=document.querySelector('#preview .screen-text');return text?.textContent==='Live words 1'&&Number(getComputedStyle(text).opacity)>.99;});await fs.mkdir(path.join(__dirname,'../test-results'),{recursive:true});await page.screenshot({path:path.join(__dirname,'../test-results/live-song-navigation.png')});
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.getTitle()==='ProMax Presenter').focus());await page.waitForFunction(()=>document.hasFocus());await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>liveIndex),1);assert.equal(await page.evaluate(()=>state===originalSongCue),true,'Repeated selection cannot cue or reset the live slide');
    await page.locator('#next').click();await output.waitForFunction(()=>document.querySelector('#stage .screen-text')?.textContent==='Live words 2');
    await page.evaluate(()=>{toggleBlackout();window.blackSongCue=state;selectSong('other-song');ProMaxFeatures.showTab('bible');});await jump.click();assert.equal(await page.evaluate(()=>state===blackSongCue&&state.black),true);assert.equal(await page.evaluate(()=>liveIndex),2);
    await page.evaluate(async()=>{await ProMaxControls.mutate('Repeated meeting song',()=>{meetingFolders=[{id:'meeting',name:'Repeated song example',items:[{id:'first',type:'song',songId:'live-song',title:'First occurrence'},{id:'second',type:'song',songId:'live-song',title:'Second occurrence'}]}];meetingSelected='meeting';});await ProMaxMeetings.open(meetingFolders[0].items[1]);goLive(1);window.meetingSongCue=state;await ProMaxMeetings.open(meetingFolders[0].items[0]);});
    assert.equal(await jump.innerText(),'Open live item');await jump.click();assert.equal(await page.evaluate(()=>ProMaxMeetings.folder().selectedItem),'second');assert.equal(await page.evaluate(()=>liveIndex),1);assert.equal(await page.evaluate(()=>state===meetingSongCue),true);await page.locator('#next').click();assert.equal(await page.evaluate(()=>state.text),'Live words 2');
    await page.evaluate(()=>{ProMaxMeetings.select(null);selectSong('live-song');goLive(0);window.removedLiveCue=state;return ProMaxControls.remove({type:'song',songId:'live-song'});});assert.equal(await jump.isHidden(),true);await page.evaluate(()=>ProMaxControls.undo());await jump.waitFor({state:'visible'});assert.equal(await page.evaluate(()=>state===removedLiveCue),true);
    await page.evaluate(()=>openOutput());await jump.waitFor({state:'hidden'});assert.deepEqual(errors,[]);
    console.log('PASS: live song cursor across browsing, direct-library return, actual next output, repeated selection without cue, blackout, repeated meeting occurrence, delete/undo and output-off cleanup; '+(executablePath||'source'));
  }finally{clearTimeout(watchdog);await app?.close();if(path.dirname(profile)!==os.tmpdir()||!path.basename(profile).startsWith('promax-live-song-'))throw Error('Unexpected live song profile');await fs.rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}
}
run().then(()=>process.exit(0),error=>{console.error(error);process.exit(1);});
