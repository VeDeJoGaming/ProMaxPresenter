/* Native output and embedded-browser keys in an isolated synthetic profile. */
const {_electron:electron}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
async function run(){
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'promax-keys-')),env={...process.env,PROMAX_TEST_DATA:profile},executablePath=process.argv[2];delete env.ELECTRON_RUN_AS_NODE;let app;
  const watchdog=setTimeout(()=>{console.error('Presentation key check timed out');app?.process().kill();process.exit(1);},90000);watchdog.unref();
  try{
    app=await electron.launch({executablePath,args:executablePath?[`--user-data-dir=${profile}`]:[path.join(__dirname,'..')],env,timeout:45000});const page=await app.firstWindow();await page.waitForFunction(()=>window.ProMaxControls);await page.evaluate(()=>ProMaxControls.ready);
    await page.evaluate(async()=>{await ProMaxControls.mutate('Key fixture',()=>{songs=[{id:'key-song',title:'Key check',lyrics:'Synthetic',lines:4,slides:Array.from({length:4},(_,i)=>({id:'key-slide-'+i,text:'Synthetic slide '+i,section:'Verse',key:''}))}];selected='key-song';});selectSong('key-song');goLive(0);});
    const send=async(target,key,repeat=false)=>target.evaluate(({key,repeat})=>document.body.dispatchEvent(new KeyboardEvent('keydown',{key,repeat,bubbles:true,cancelable:true})),{key,repeat});
    await send(page,'Escape');assert.equal(await page.evaluate(()=>state.black),true);await send(page,'Escape',true);assert.equal(await page.evaluate(()=>state.black),true);await send(page,'Escape');assert.equal(await page.evaluate(()=>state.black),false);
    await send(page,'F6');await send(page,'F6',true);assert.equal(await page.evaluate(()=>state.black),true);await send(page,'F6');
    // Give the test a virtual second-display inventory even on single-screen CI.
    // This affects only this Electron process, never Windows display settings.
    await app.evaluate(({screen})=>{const primary=screen.getPrimaryDisplay();screen.getAllDisplays=()=>[primary,{...primary,id:primary.id+1000,label:'Synthetic output'}];screen.getDisplayMatching=()=>primary;});
    const next=app.waitForEvent('window',p=>p.url().endsWith('/desktop/output.html'));await page.evaluate(()=>openOutput());const output=await next;await output.waitForFunction(()=>window.promaxDesktop&&document.querySelector('#stage'));
    await send(output,'F6');await page.waitForFunction(()=>state.black===true);await send(output,'F6',true);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>state.black),true,'Repeated output F6 must not restore blackout');
    await send(output,'F6');await page.waitForFunction(()=>state.black===false);await send(output,'Escape');await page.waitForFunction(()=>state.black===true);await send(output,'Escape',true);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>state.black),true);await send(output,'Escape');await page.waitForFunction(()=>state.black===false);
    await send(output,'ArrowRight');await page.waitForFunction(()=>liveIndex===1);await send(output,'ArrowRight',true);await page.waitForFunction(()=>liveIndex===2);
    await send(output,'F5',true);await page.waitForTimeout(100);assert.equal(await page.locator('#open-output').getAttribute('aria-pressed'),'true');await send(output,'F5');await page.waitForFunction(()=>!nativeOutputActive);
    const browserKeys=await app.evaluate(async({app,BrowserWindow,session})=>{
      // Cancel the initial YouTube request before it leaves this test process.
      const isolated=session.fromPartition('persist:promax-youtube-browser');isolated.webRequest.onBeforeRequest({urls:['https://*.youtube.com/*']},(_details,callback)=>callback({cancel:true}));
      const nativeRequire=process.getBuiltinModule('module').createRequire(app.getAppPath()+'/package.json');
      const received=[],browser=nativeRequire('./desktop/youtube-browser.js').createYouTubeBrowser({getControl:()=>BrowserWindow.getAllWindows()[0],getPresentation:()=>null,onStatus(){},onKey:key=>received.push(key)});
      try{
        await browser.prepare({id:'test-youtube',videoId:'M7lc1UVf-VE',start:0}).catch(()=>{});const contents=browser.getView().webContents;
        const dispatch=input=>{let prevented=false;contents.emit('before-input-event',{preventDefault(){prevented=true;}},{type:'keyDown',key:'F6',isAutoRepeat:false,control:false,alt:false,meta:false,...input});return prevented;};
        const prevention=[dispatch({}),dispatch({isAutoRepeat:true}),dispatch({key:'F5'}),dispatch({key:'Escape'}),dispatch({control:true}),dispatch({type:'keyUp'}),dispatch({key:'ArrowRight'})];
        return {received,prevention};
      }finally{browser.destroy();isolated.webRequest.onBeforeRequest(null);}
    });
    assert.deepEqual(browserKeys.received,['F6','F5']);assert.deepEqual(browserKeys.prevention,[true,true,true,false,false,false,false]);
    console.log('PASS: control/output Escape and F6 ignore held-key repeats, output F5 remains open on repeat, arrow repeat still navigates, embedded YouTube F5/F6 relay without refresh or network; '+(executablePath||'source'));
  }finally{clearTimeout(watchdog);await app?.close();if(path.dirname(profile)!==os.tmpdir()||!path.basename(profile).startsWith('promax-keys-'))throw Error('Unexpected profile path');await fs.rm(profile,{recursive:true,force:true});}
}
run().then(()=>process.exit(0),error=>{console.error(error);process.exit(1);});
