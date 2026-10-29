/* YouTube metadata transactions with synthetic local files and no network player. */
const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
async function run(){
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'promax-youtube-library-')),executablePath=process.argv[2];
  const env={...process.env,PROMAX_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
  let app;const errors=[],requests=[];
  const watchdog=setTimeout(()=>{console.error('YouTube metadata check timed out');app?.process().kill();process.exit(1);},90000);watchdog.unref();
  async function launch(){
    app=await electron.launch({executablePath,args:executablePath?[`--user-data-dir=${profile}`]:[path.join(__dirname,'..')],env,timeout:45000});
    assert.equal(path.resolve(await app.evaluate(({app})=>app.getPath('userData'))).toLowerCase(),path.resolve(profile).toLowerCase());
    await app.evaluate(({ipcMain})=>{ipcMain.removeHandler('youtube:browser-prepare');ipcMain.handle('youtube:browser-prepare',()=>({}));});
    const page=await app.firstWindow();page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(/^https?:/.test(request.url()))requests.push(request.url());});
    await page.waitForFunction(()=>window.ProMaxControls);await page.evaluate(()=>ProMaxControls.ready);return page;
  }
  try{
    let page=await launch();
    await page.evaluate(bytes=>{window.youtubeBytes=Uint8Array.from(atob(bytes),c=>c.charCodeAt(0));window.youtubeFile=name=>new File([youtubeBytes],name,{type:'video/webm'});window.youtubeOriginalStore=storedAsset;window.youtubeOriginalCue=state;},(await fs.readFile(path.join(__dirname,'../desktop/smoke-video.webm'))).toString('base64'));
    await page.evaluate(()=>Promise.all([ProMaxYouTubeLibrary.add('https://youtu.be/abcdefghijk','First synthetic link'),ProMaxYouTubeLibrary.add('https://youtu.be/lmnopqrstuv','Second synthetic link')]));
    assert.deepEqual(await page.evaluate(()=>ProMaxYouTubeLibrary.list().map(e=>e.title)),['First synthetic link','Second synthetic link'],'Concurrent additions must retain both links');
    const names=await page.evaluate(()=>ProMaxYouTubeLibrary.list().map(e=>e.title));
    async function failOnce(operation){
      return page.evaluate(async operation=>{
        storedAsset=async(action,value,key)=>{if(action==='put'&&key==='youtube-list'){storedAsset=youtubeOriginalStore;throw Error('Synthetic YouTube list failure');}return youtubeOriginalStore(action,value,key);};
        try{
          if(operation==='remove')await ProMaxYouTubeLibrary.remove(ProMaxYouTubeLibrary.list()[0].id);
          else if(operation==='attach')await ProMaxYouTubeLibrary.attach(ProMaxYouTubeLibrary.list()[0],youtubeFile('Uncommitted attachment.webm'));
          else if(operation==='history')await ProMaxYouTubeLibrary.history.apply([]);
          else await ProMaxYouTubeLibrary.add('https://youtu.be/wxyzabcdefg','Rejected synthetic link');
          return null;
        }catch(error){return error.message;}
      },operation);
    }
    for(const operation of ['remove','attach','history','add']){
      assert.equal(await failOnce(operation),'Synthetic YouTube list failure');
      assert.deepEqual(await page.evaluate(()=>ProMaxYouTubeLibrary.list().map(e=>e.title)),names,operation+' failure keeps the in-memory list');
      assert.deepEqual(await page.evaluate(async()=>(await storedAsset('get',null,'youtube-list')).map(e=>e.title)),names,operation+' failure keeps the saved list');
      assert.equal(await page.evaluate(()=>ProMaxYouTubeLibrary.list()[0].localAssetId),undefined,'A failed attachment cannot appear committed in memory');
    }
    await page.evaluate(()=>ProMaxYouTubeLibrary.add('https://youtu.be/wxyzabcdefg','Third synthetic link'));
    await page.evaluate(()=>{
      window.removedYoutube=ProMaxYouTubeLibrary.list()[0].id;
      storedAsset=async(action,value,key)=>{if(action==='put'&&key?.startsWith('video:')){storedAsset=youtubeOriginalStore;await new Promise(resolve=>window.releaseYoutubeAttachment=resolve);}return youtubeOriginalStore(action,value,key);};
      window.pendingYoutubeAttachment=ProMaxYouTubeLibrary.attach(ProMaxYouTubeLibrary.list()[0],youtubeFile('Removed entry attachment.webm')).then(()=>null,error=>error.message);
    });
    await page.waitForFunction(()=>typeof releaseYoutubeAttachment==='function');await page.evaluate(async()=>{await ProMaxYouTubeLibrary.remove(removedYoutube);releaseYoutubeAttachment();});
    assert.match(await page.evaluate(()=>pendingYoutubeAttachment),/removed/i);assert.equal(await page.evaluate(()=>ProMaxYouTubeLibrary.list().some(e=>e.id===removedYoutube)),false);
    await page.evaluate(async()=>{
      const stale=ProMaxYouTubeLibrary.list()[0];await ProMaxYouTubeLibrary.history.apply(ProMaxYouTubeLibrary.history.take());
      await ProMaxYouTubeLibrary.attach(stale,youtubeFile('Attachment after history restore.webm'));
    });
    assert.equal(await page.evaluate(()=>ProMaxFeatures.getVideos().find(v=>v.id===ProMaxYouTubeLibrary.list()[0].localAssetId)?.name),'Attachment after history restore.webm','Attachments resolve the current entry by ID after history clones');
    assert.equal(await page.evaluate(()=>state===youtubeOriginalCue),true);const saved=await page.evaluate(()=>ProMaxYouTubeLibrary.history.take());
    await app.close();app=null;page=await launch();assert.deepEqual(await page.evaluate(()=>ProMaxYouTubeLibrary.history.take()),saved);
    assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);
    console.log('PASS: concurrent YouTube additions, atomic failure of remove/attach/history/add, queue recovery, removal during attachment, current identity after history, unchanged cue, restart and no external requests; '+(executablePath||'source'));
  }finally{
    clearTimeout(watchdog);await app?.close();
    if(path.dirname(profile)!==os.tmpdir()||!path.basename(profile).startsWith('promax-youtube-library-'))throw Error('Unexpected YouTube metadata profile');
    await fs.rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});
  }
}
run().then(()=>process.exit(0),error=>{console.error(error);process.exit(1);});
