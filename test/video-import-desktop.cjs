/* Concurrent IndexedDB imports and navigation, using synthetic media/profile only. */
const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
async function run(){
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'promax-video-import-')),executablePath=process.argv[2];
  const env={...process.env,PROMAX_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
  let app;const errors=[];
  const watchdog=setTimeout(()=>{console.error('Video import check timed out');app?.process().kill();process.exit(1);},90000);watchdog.unref();
  async function launch(){
    app=await electron.launch({executablePath,args:executablePath?[`--user-data-dir=${profile}`]:[path.join(__dirname,'..')],env,timeout:45000});
    assert.equal(path.resolve(await app.evaluate(({app})=>app.getPath('userData'))).toLowerCase(),path.resolve(profile).toLowerCase());
    const page=await app.firstWindow();page.on('pageerror',error=>errors.push(error.message));
    await page.waitForFunction(()=>window.ProMaxControls);await page.evaluate(()=>ProMaxControls.ready);return page;
  }
  try{
    let page=await launch();
    await page.evaluate(bytes=>{
      window.importFixture=Uint8Array.from(atob(bytes),c=>c.charCodeAt(0));
      window.importFile=name=>new File([importFixture],name,{type:'video/webm'});
      window.originalImportCue=state;
      ProMaxFeatures.showTab('videos');
    },(await fs.readFile(path.join(__dirname,'../desktop/smoke-video.webm'))).toString('base64'));
    await page.evaluate(()=>Promise.all([ProMaxFeatures.addVideos([importFile('First synthetic clip.webm')]),ProMaxFeatures.addVideos([importFile('Second synthetic clip.webm')])]));
    assert.deepEqual(await page.evaluate(()=>ProMaxFeatures.getVideos().map(v=>v.name)),['First synthetic clip.webm','Second synthetic clip.webm'],'Concurrent imports must retain both files and list entries');
    await page.evaluate(()=>{
      window.originalStoredAsset=storedAsset;
      window.holdNextVideo=true;
      storedAsset=async(action,value,key)=>{
        if(action==='put'&&key?.startsWith('video:')&&holdNextVideo){holdNextVideo=false;await new Promise(resolve=>window.releaseImport=resolve);}
        return originalStoredAsset(action,value,key);
      };
      window.pendingImport=ProMaxFeatures.addVideos([importFile('Third synthetic clip.webm')]);
    });
    await page.waitForFunction(()=>typeof releaseImport==='function');
    await page.evaluate(()=>{window.removedVideo=ProMaxFeatures.getVideos()[0].id;window.pendingRemoval=ProMaxFeatures.removeVideo(removedVideo);ProMaxFeatures.showTab('presentations');releaseImport();});
    await page.evaluate(()=>Promise.all([pendingImport,pendingRemoval]));
    assert.equal(await page.locator('#feature-view h2').innerText(),'PowerPoint','Completing an import/removal must preserve the current workspace');
    assert.deepEqual(await page.evaluate(()=>ProMaxFeatures.getVideos().map(v=>v.name)),['Second synthetic clip.webm','Third synthetic clip.webm']);
    assert.equal(await page.evaluate(async()=>!!await storedAsset('get',null,'video:'+removedVideo)),true,'Removed media remains available for undo');
    const failure=await page.evaluate(async()=>{
      storedAsset=async(action,value,key)=>{
        if(action==='put'&&key?.startsWith('video:'))window.failedBlobKey=key;
        if(action==='put'&&key==='video-list'){storedAsset=originalStoredAsset;throw Error('Synthetic video list write failure');}
        return originalStoredAsset(action,value,key);
      };
      try{await ProMaxFeatures.addVideos([importFile('Rejected synthetic clip.webm')]);return null;}catch(error){return error.message;}
    });
    assert.equal(failure,'Synthetic video list write failure');
    assert.equal(await page.evaluate(()=>storedAsset('get',null,failedBlobKey)),undefined,'An unsuccessful list update must remove its unreferenced blob');
    assert.equal(await page.evaluate(()=>ProMaxFeatures.getVideos().length),2);
    const failedRemoval=await page.evaluate(async()=>{
      storedAsset=async(action,value,key)=>{if(action==='put'&&key==='video-list'){storedAsset=originalStoredAsset;throw Error('Synthetic remove write failure');}return originalStoredAsset(action,value,key);};
      try{await ProMaxFeatures.removeVideo(ProMaxFeatures.getVideos()[0].id);return null;}catch(error){return error.message;}
    });
    assert.equal(failedRemoval,'Synthetic remove write failure');assert.equal(await page.evaluate(()=>ProMaxFeatures.getVideos().length),2,'Failed removal must preserve the in-memory list');
    await page.evaluate(()=>{document.body.dispatchEvent(new MouseEvent('click',{bubbles:true}));return ProMaxFeatures.addVideos([importFile('Fourth synthetic clip.webm')]);});
    await page.evaluate(()=>ProMaxControls.undo());assert.equal(await page.evaluate(()=>ProMaxFeatures.getVideos().length),2);
    await page.evaluate(()=>ProMaxControls.redo());assert.equal(await page.evaluate(()=>ProMaxFeatures.getVideos().length),3);
    assert.equal(await page.evaluate(()=>state===originalImportCue),true,'Preparation never changes the live cue');
    const savedNames=await page.evaluate(async()=>(await storedAsset('get',null,'video-list')).map(v=>v.name));
    assert.deepEqual(savedNames,['Second synthetic clip.webm','Third synthetic clip.webm','Fourth synthetic clip.webm']);
    await app.close();app=null;page=await launch();
    assert.deepEqual(await page.evaluate(()=>ProMaxFeatures.getVideos().map(v=>v.name)),savedNames);
    assert.equal(await page.evaluate(async()=>{for(const asset of ProMaxFeatures.getVideos())if(!await storedAsset('get',null,'video:'+asset.id))return false;return true;}),true);
    assert.deepEqual(errors,[]);
    console.log('PASS: concurrent video imports, import/removal serialization, undo/redo with retained media, workspace/cue preservation, failed import/removal rollback, queue recovery and restart; '+(executablePath||'source'));
  }finally{
    clearTimeout(watchdog);await app?.close();
    if(path.dirname(profile)!==os.tmpdir()||!path.basename(profile).startsWith('promax-video-import-'))throw Error('Unexpected import test profile');
    await fs.rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});
  }
}
run().then(()=>process.exit(0),error=>{console.error(error);process.exit(1);});
