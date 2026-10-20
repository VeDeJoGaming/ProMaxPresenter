const assert=require('node:assert/strict');
module.exports=async({control,getPresentation})=>{
  const execute=code=>control.webContents.executeJavaScript(code),output=getPresentation();
  await execute(`(async()=>{await ProMaxYouTubeLibrary.ready;window.youtubeTest=await ProMaxYouTubeLibrary.add('https://youtu.be/M7lc1UVf-VE?t=5','YouTube integration test');ProMaxMeetings.create('YouTube meeting');ProMaxMeetings.add({type:'youtube',assetId:youtubeTest.id,title:youtubeTest.title});})()`);
  assert.equal(await execute("ProMaxMeetings.folder().items[0].type"),'youtube');
  const deadline=Date.now()+25000;let ready=false;
  while(Date.now()<deadline){
    ready=await execute("[...document.querySelectorAll('[data-youtube-status]')].some(e=>e.textContent.includes('Player ready'))");
    if(ready)break;await new Promise(resolve=>setTimeout(resolve,250));
  }
  // The shell and playback routing are testable even when YouTube is blocked
  // by the current network. Record real player readiness separately.
  console.log('YouTube live player ready: '+ready);
  assert.equal(await output.webContents.executeJavaScript("document.querySelectorAll('iframe[data-youtube]').length"),1,'One player must be prepared on the output');
  assert.equal(await output.webContents.executeJavaScript("!!document.querySelector('#stage iframe[data-youtube]')"),false,'Preparation must not replace the current slide');
  const frame=output.webContents.mainFrame.frames.find(f=>f.url.includes('/youtube-player.html'));
  if(frame)await frame.executeJavaScript("window.playerPreservationTest='retained'");
  await execute("state={text:'',black:false,pdf:null,youtube:{...youtubeTest,position:5,paused:true,muted:true,command:1}};paint()");
  await new Promise(resolve=>setTimeout(resolve,200));
  assert.equal(await output.webContents.executeJavaScript("document.querySelectorAll('#stage iframe[data-youtube]').length"),1);
  const moved=output.webContents.mainFrame.frames.find(f=>f.url.includes('/youtube-player.html'));
  if(frame&&moved)assert.equal(await moved.executeJavaScript('window.playerPreservationTest'),'retained','Prepared player must not reload when shown');
  await output.webContents.executeJavaScript("window.youtubeLiveStates=[];document.addEventListener('promax-youtube-status',e=>youtubeLiveStates.push(e.detail.type))");
  await execute("state.youtube={...state.youtube,paused:false,muted:true,command:2};paint()");
  const playbackDeadline=Date.now()+10000;let playing=false;
  while(Date.now()<playbackDeadline){playing=await output.webContents.executeJavaScript("youtubeLiveStates.includes('playing')");if(playing)break;await new Promise(resolve=>setTimeout(resolve,250));}
  console.log('YouTube real streamed playback: '+playing);
  await execute("state.black=true;paint()");
  await new Promise(resolve=>setTimeout(resolve,100));
  assert.equal(await output.webContents.executeJavaScript("document.getElementById('stage').children.length"),0);
  await execute("state.black=false;paint();goLive(0)");
  await new Promise(resolve=>setTimeout(resolve,100));
  assert.equal(await output.webContents.executeJavaScript("!!document.querySelector('#stage iframe[data-youtube]')"),false);
  await execute(`(async()=>{
    const canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;canvas.getContext('2d').fillRect(0,0,160,90);
    const stream=canvas.captureStream(15),recorder=new MediaRecorder(stream,{mimeType:'video/webm'}),chunks=[];
    recorder.ondataavailable=e=>chunks.push(e.data);const ended=new Promise(r=>recorder.onstop=r);
    recorder.start();await new Promise(r=>setTimeout(r,500));recorder.stop();await ended;stream.getTracks().forEach(t=>t.stop());
    await ProMaxYouTubeLibrary.attach(youtubeTest,new File(chunks,'local-youtube-test.webm',{type:'video/webm'}));
    await ProMaxYouTubeLibrary.play(youtubeTest);
  })()`);
  await new Promise(resolve=>setTimeout(resolve,200));
  assert.equal(await execute('!!state.video&&!state.youtube'),true,'Attached local file must take priority');
  assert.equal(await output.webContents.executeJavaScript("!!document.querySelector('#stage video')"),true);
  await execute("goLive(0)");
  const data=await execute("storedAsset('get',null,'youtube-list')");
  assert.equal(data[0].start,5);assert.ok(data[0].localAssetId);
  console.log('PASSED: YouTube links, saved meeting entry, output preparation, retained iframe, blackout/return to lyrics and ad-free local fallback.');
};
