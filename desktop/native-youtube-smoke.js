const assert=require('node:assert/strict');
module.exports=async({control,getPresentation,browser})=>{
  async function waitFor(check){const deadline=Date.now()+3000;while(Date.now()<deadline){if(check())return;await new Promise(r=>setTimeout(r,50));}}
  const execute=code=>control.webContents.executeJavaScript(code);
  await execute("(async()=>{window.nativeYoutubeEntry=await ProMaxYouTubeLibrary.add('https://youtu.be/M7lc1UVf-VE?t=15','Browser YouTube test')})()");
  const view=browser.getView(),contents=view.webContents;
  contents.on('did-navigate',(_event,url)=>console.log('Browser navigation: '+url));
  contents.on('render-process-gone',(_event,detail)=>console.log('Browser renderer exit: '+JSON.stringify(detail)));
  assert.ok(contents.getURL().includes('youtube.com')||contents.getURL().includes('google.com'));
  assert.equal(contents.getLastWebPreferences().nodeIntegration,false);
  assert.equal(contents.isAudioMuted(),true);
  let ready=false;const deadline=Date.now()+15000;
  while(Date.now()<deadline){ready=await contents.executeJavaScript("!!document.querySelector('video')&&document.querySelector('video').readyState>=2");if(ready)break;await new Promise(r=>setTimeout(r,250));}
  console.log('Regular YouTube browser: '+contents.getURL());
  console.log('Regular YouTube video ready: '+ready);
  if(ready){
    await new Promise(r=>setTimeout(r,11000));
    assert.equal(await contents.executeJavaScript("document.querySelector('video').paused"),true,'Preparation must pause silently after warming up');
    assert.ok(await contents.executeJavaScript("Math.abs(document.querySelector('video').currentTime-15)<1"),'Preparation must return to the requested start');
  }
  await contents.executeJavaScript("window.proMaxPreservationMarker='browser-retained'");
  assert.equal(await contents.executeJavaScript('window.proMaxPreservationMarker'),'browser-retained');
  if(ready)assert.ok(await contents.executeJavaScript("!!document.querySelector('.ytp-settings-button')"),'Regular YouTube quality menu must be available');
  await execute("state={text:'',black:false,pdf:null,youtube:{...nativeYoutubeEntry,nativeBrowser:true,paused:true,muted:true,command:1}};paint()");
  await new Promise(r=>setTimeout(r,250));
  assert.ok(getPresentation().contentView.children.includes(view));
  assert.equal(await contents.executeJavaScript('window.proMaxPreservationMarker'),'browser-retained');
  const geometry=await contents.executeJavaScript(`(()=>{const p=document.querySelector('[data-promax-presentation]'),v=p?.querySelector('video'),r=v?.getBoundingClientRect();return {root:!!p&&p.parentNode===document.body,width:r?.width,height:r?.height,viewportWidth:innerWidth,viewportHeight:innerHeight,pageHidden:getComputedStyle(document.querySelector('ytd-app')).visibility==='hidden',background:getComputedStyle(document.body).backgroundColor}})()`);
  assert.equal(geometry.root,true,'Player must escape the clipped watch-page containers');
  assert.equal(geometry.pageHidden,true,'YouTube page chrome must not appear on the output');
  assert.equal(geometry.background,'rgb(0, 0, 0)');
  assert.ok(geometry.width>=geometry.viewportWidth*.95&&geometry.height>=geometry.viewportHeight*.95,'Video must fill the presentation viewport');
  const electron=require('electron'),display=electron.screen.getDisplayMatching(getPresentation().getBounds());
  const sources=await electron.desktopCapturer.getSources({types:['screen'],thumbnailSize:{width:1280,height:800}});
  const source=sources.find(s=>s.display_id===String(display.id));
  if(source){
    require('node:fs').writeFileSync(require('node:path').join(electron.app.getPath('temp'),'promax-youtube-output-check.png'),source.thumbnail.toPNG());
    const pixels=source.thumbnail.toBitmap();let nonWhite=0;
    for(let i=0;i<pixels.length;i+=4)if(Math.min(pixels[i],pixels[i+1],pixels[i+2])<230)nonWhite++;
    assert.ok(nonWhite/(pixels.length/4)>.25,'Actual output must contain the video image, not a white loading page');
  }
  await execute("state.black=true;paint()");await new Promise(r=>setTimeout(r,150));
  assert.equal(view.getVisible(),false);
  await execute("state.black=false;paint()");await waitFor(()=>view.getVisible());
  assert.equal(view.getVisible(),true);
  await execute("goLive(0)");await waitFor(()=>control.contentView.children.includes(view));
  assert.ok(control.contentView.children.includes(view));
  assert.equal(await contents.executeJavaScript('window.proMaxPreservationMarker'),'browser-retained');
  assert.equal(await contents.executeJavaScript("!!document.querySelector('[data-promax-presentation]')"),false,'Returning must restore normal YouTube layout');
  await execute("state={text:'',black:false,pdf:null,youtube:{...nativeYoutubeEntry,nativeBrowser:true,paused:true,muted:true,command:3}};paint()");
  await new Promise(r=>setTimeout(r,300));
  await execute("document.getElementById('open-output').click()");await new Promise(r=>setTimeout(r,500));
  assert.equal(getPresentation(),null);
  assert.ok(control.contentView.children.includes(view),'Closing output must preserve the prepared browser');
  assert.equal(await contents.executeJavaScript('window.proMaxPreservationMarker'),'browser-retained');
  console.log('PASSED: isolated regular YouTube browser, silent preparation, unchanged page across display transfer, blackout and return to operator.');
};
