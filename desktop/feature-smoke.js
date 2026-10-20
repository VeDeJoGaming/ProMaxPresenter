const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { importPowerPoint } = require('./documents');

module.exports = async function featureSmoke({ app, control, getPresentation }) {
  const execute = code => control.webContents.executeJavaScript(code);
  await execute(`(async()=>{
    const file=new File([JSON.stringify({name:'Test translation',verses:[
      {book:'John',chapter:3,verse:16,text:'Synthetic first verse.'},
      {book:'John',chapter:3,verse:17,text:'Synthetic second verse.'}
    ]})],'test-bible.json',{type:'application/json'});
    await ProMaxFeatures.importBible(file);
    ProMaxFeatures.showTab('bible');
    document.getElementById('bible-search').value='Joh 3:16–17';
    document.getElementById('bible-search').form.requestSubmit();
    const checks=[...document.querySelectorAll('.verse-row input')];
    checks.forEach(check=>{check.checked=true;check.dispatchEvent(new Event('change'));});
    [...document.querySelectorAll('#feature-view button')].find(b=>b.textContent==='Show selected passage').click();
  })()`);
  assert.equal(await execute('document.querySelectorAll(".verse-row").length'), 2);
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.match(await getPresentation().webContents.executeJavaScript('document.querySelector(".screen-text").textContent'), /Synthetic second verse/);
  assert.equal(await execute(`ProMaxBible.parse('<XMLBIBLE biblename="Test"><BIBLEBOOK bnumber="43"><CHAPTER cnumber="3"><VERS vnumber="16">Synthetic XML.</VERS></CHAPTER></BIBLEBOOK></XMLBIBLE>','test.xml').verses[0].book`), 'Johannes');
  assert.equal(await execute(`ProMaxBible.parse('<osis><verse osisID="John.3.16">Synthetic OSIS.</verse></osis>','test.xml').verses.length`), 1);
  await execute(`[...document.querySelectorAll('#feature-view button')].find(b=>b.textContent==='Add passage to song library').click()`);
  assert.match(await execute('current().slides[0].text'), /Synthetic first verse/);
  await execute(`(async()=>{
    ProMaxFeatures.showTab('videos');
    const canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;
    const stream=canvas.captureStream(15);const recorder=new MediaRecorder(stream,{mimeType:'video/webm'});const chunks=[];
    recorder.ondataavailable=e=>chunks.push(e.data);
    const complete=new Promise(resolve=>recorder.onstop=resolve);
    recorder.start();let frame=0;
    const interval=setInterval(()=>{const ctx=canvas.getContext('2d');ctx.fillStyle=frame++%2?'#ffb35c':'#181818';ctx.fillRect(0,0,160,90);},60);
    await new Promise(resolve=>setTimeout(resolve,1600));recorder.stop();await complete;clearInterval(interval);stream.getTracks().forEach(t=>t.stop());
    await ProMaxFeatures.addVideos([new File(chunks,'synthetic-test.webm',{type:'video/webm'})]);
    document.getElementById('video-loop').checked=true;
    await ProMaxFeatures.playVideo(ProMaxFeatures.getVideos()[0]);
  })()`);
  await new Promise(resolve => setTimeout(resolve, 600));
  assert.equal(await execute('document.querySelector("#preview video").readyState>=2'), true);
  assert.equal(await getPresentation().webContents.executeJavaScript('document.querySelector("#stage video").readyState>=2'), true);
  assert.equal(await execute('document.querySelector("#preview video").muted'), true);
  await execute('document.getElementById("video-muted").click()');
  assert.equal(await getPresentation().webContents.executeJavaScript('document.querySelector("#stage video").muted'), false);
  await execute(`[...document.querySelectorAll('#feature-view button')].find(b=>b.textContent==='Pause').click()`);
  await new Promise(resolve => setTimeout(resolve, 200));
  assert.equal(await getPresentation().webContents.executeJavaScript('document.querySelector("#stage video").paused'), true);
  const paused = await getPresentation().webContents.executeJavaScript('document.querySelector("#stage video").currentTime');
  await new Promise(resolve => setTimeout(resolve, 200));
  assert.equal(await getPresentation().webContents.executeJavaScript('document.querySelector("#stage video").currentTime'), paused);
  await execute(`[...document.querySelectorAll('#feature-view button')].find(b=>b.textContent==='Restart').click()`);
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.ok(await getPresentation().webContents.executeJavaScript('document.querySelector("#stage video").currentTime<0.1'));
  await execute(`[...document.querySelectorAll('#feature-view button')].find(b=>b.textContent==='Resume').click()`);
  await execute('document.getElementById("blackout").click()');
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(await getPresentation().webContents.executeJavaScript('document.getElementById("stage").children.length'), 0);
  await execute('document.getElementById("blackout").click()');
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(await getPresentation().webContents.executeJavaScript('document.querySelector("#stage video").paused'), false);
  await execute('goLive(0)');
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.match(await getPresentation().webContents.executeJavaScript('document.querySelector(".screen-text").textContent'), /Synthetic first verse/);
  const fixture = path.join(app.getPath('temp'), 'promax-import-test.pptx');
  if (!fs.existsSync(fixture)) throw new Error('Create the synthetic PowerPoint fixture before running --feature-test.');
  const doc = await importPowerPoint(fixture, app.getPath('userData'));
  assert.equal(doc.slides.length, 2);
  await execute(`ProMaxFeatures.saveDocument(${JSON.stringify(doc)})`);
  await execute('ProMaxFeatures.showTab("presentations");document.querySelector(".document-slide").click()');
  await new Promise(resolve => setTimeout(resolve, 250));
  assert.equal(await getPresentation().webContents.executeJavaScript('document.querySelector("#stage img").naturalWidth'), 1920);
  await execute('document.getElementById("next").click()');
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(await getPresentation().webContents.executeJavaScript('document.querySelector("#stage img").src'), doc.slides[1]);
  assert.equal(await execute('document.querySelectorAll(".document-slide").length'), 2);
  await execute('state.black=true;paint()');
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(await getPresentation().webContents.executeJavaScript('document.getElementById("stage").children.length'), 0);
  control.webContents.reload();
  for (let i=0;i<100;i++) {
    await new Promise(resolve=>setTimeout(resolve,100));
    if (await execute('!!window.ProMaxFeatures && ProMaxFeatures.getDocuments().length===1 && ProMaxFeatures.getVideos().length===1').catch(()=>false)) break;
  }
  assert.equal(await execute('ProMaxFeatures.getBible().verses.length'), 2);
  assert.equal(await execute('ProMaxFeatures.getVideos().length'), 1);
  assert.equal(await execute('ProMaxFeatures.getDocuments().length'), 1);
  control.showInactive();
  await execute('ProMaxFeatures.showTab("bible")');
  await new Promise(resolve=>setTimeout(resolve,150));
  const image = await control.webContents.capturePage();fs.writeFileSync(path.join(app.getPath('temp'),'promax-bible-preview.png'),image.toPNG());
  await execute('ProMaxFeatures.showTab("videos")');
  await new Promise(resolve=>setTimeout(resolve,150));
  const videoImage = await control.webContents.capturePage();fs.writeFileSync(path.join(app.getPath('temp'),'promax-video-preview.png'),videoImage.toPNG());
  await execute('ProMaxFeatures.showTab("presentations")');
};
