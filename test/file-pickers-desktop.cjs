/* Real keyboard file selection, without user files or external YouTube requests. */
const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
function blankPdf(){
  let body='%PDF-1.4\n';const offsets=[0],objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << >> >>'];
  objects.forEach((object,index)=>{offsets.push(Buffer.byteLength(body));body+=`${index+1} 0 obj\n${object}\nendobj\n`;});
  const start=Buffer.byteLength(body);body+='xref\n0 4\n0000000000 65535 f \n'+offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('');
  return body+`trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
}
async function run(){
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'promax-file-pickers-')),executablePath=process.argv[2];
  const env={...process.env,PROMAX_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
  let app;const errors=[],requests=[];
  const watchdog=setTimeout(()=>{console.error('File picker check timed out');app?.process().kill();process.exit(1);},90000);watchdog.unref();
  try{
    app=await electron.launch({executablePath,args:executablePath?[`--user-data-dir=${profile}`]:[path.join(__dirname,'..')],env,timeout:45000});
    assert.equal(path.resolve(await app.evaluate(({app})=>app.getPath('userData'))).toLowerCase(),path.resolve(profile).toLowerCase());
    const page=await app.firstWindow();page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(/^https?:/.test(request.url()))requests.push(request.url());});
    await page.waitForFunction(()=>window.ProMaxControls);await page.evaluate(()=>ProMaxControls.ready);
    await page.evaluate(async bytes=>{
      window.pickerBytes=Uint8Array.from(atob(bytes),c=>c.charCodeAt(0));
      await ProMaxYouTubeLibrary.history.apply([{id:'picker-entry',videoId:'abcdefghijk',title:'Synthetic offline attachment',start:0,url:'https://www.youtube.com/watch?v=abcdefghijk'}]);
      await Promise.all([ProMaxFeatures.addVideos([new File([pickerBytes],'Unrelated import.webm',{type:'video/webm'})]),ProMaxYouTubeLibrary.attach(ProMaxYouTubeLibrary.list()[0],new File([pickerBytes],'Intended local copy.webm',{type:'video/webm'}))]);
    },(await fs.readFile(path.join(__dirname,'../desktop/smoke-video.webm'))).toString('base64'));
    assert.equal(await page.evaluate(()=>ProMaxFeatures.getVideos().find(v=>v.id===ProMaxYouTubeLibrary.list()[0].localAssetId).name),'Intended local copy.webm','An attachment must use its own imported file when another import is queued');
    await page.evaluate(()=>{goLive(0);window.pickerCue=state;document.querySelector('#background').closest('details').open=true;});
    const background=page.locator('button[data-file-picker="background"]');await background.focus();const backgroundChooser=page.waitForEvent('filechooser');await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>state===pickerCue),true);
    await (await backgroundChooser).setFiles(path.join(__dirname,'../desktop/smoke-video.webm'));await page.waitForFunction(()=>media?.type==='video/webm');assert.equal(await page.evaluate(()=>state===pickerCue),true);
    await page.evaluate(()=>document.querySelector('#pdf').closest('details').open=true);
    const pdf=page.locator('button[data-file-picker="pdf"]');await pdf.focus();const canceledChooser=page.waitForEvent('filechooser');await page.keyboard.press('Enter');await (await canceledChooser).setFiles([]);assert.equal(await page.evaluate(()=>state===pickerCue),true,'Canceled file selection keeps the live cue');
    const pdfFile=path.join(profile,'synthetic-keyboard.pdf');await fs.writeFile(pdfFile,blankPdf());await pdf.focus();const pdfChooser=page.waitForEvent('filechooser');await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>state===pickerCue),true,'Opening a PDF chooser does not cue another slide');await (await pdfChooser).setFiles(pdfFile);await page.waitForFunction(()=>state.pdf?.startsWith('blob:'));
    await page.evaluate(()=>{
      ProMaxFeatures.showTab('videos');window.attachmentCue=state;window.previousAttachment=ProMaxYouTubeLibrary.list()[0].localAssetId;
      window.originalPickerStore=storedAsset;
      storedAsset=async(action,value,key)=>{if(action==='put'&&key?.startsWith('video:')){storedAsset=originalPickerStore;await new Promise(resolve=>window.releaseAttachment=resolve);}return originalPickerStore(action,value,key);};
    });
    const attach=page.getByRole('button',{name:'Attach local copy',exact:true});await attach.focus();const localChooser=page.waitForEvent('filechooser');await page.keyboard.press('Enter');await (await localChooser).setFiles(path.join(__dirname,'../desktop/smoke-video.webm'));await page.waitForFunction(()=>typeof releaseAttachment==='function');
    await page.evaluate(()=>{ProMaxFeatures.showTab('presentations');releaseAttachment();});await page.waitForFunction(async()=>(await storedAsset('get',null,'youtube-list'))[0].localAssetId!==previousAttachment);
    assert.equal(await page.locator('#feature-view h2').innerText(),'PowerPoint','Attachment completion preserves a later workspace choice');assert.equal(await page.evaluate(()=>state===attachmentCue),true);
    await page.evaluate(()=>{ProMaxFeatures.showTab('videos');window.lastPickerAttachment=ProMaxYouTubeLibrary.list()[0].localAssetId;});await page.getByRole('button',{name:'Attach local copy',exact:true}).focus();const focusedChooser=page.waitForEvent('filechooser');await page.keyboard.press('Space');await (await focusedChooser).setFiles(path.join(__dirname,'../desktop/smoke-video.webm'));
    await page.waitForFunction(async()=>(await storedAsset('get',null,'youtube-list'))[0].localAssetId!==lastPickerAttachment&&document.activeElement?.dataset.filePicker==='youtube-local:picker-entry'&&!document.activeElement.disabled);
    // Check that restored focus survives the import and attachment render frames.
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(await page.evaluate(()=>document.activeElement?.dataset.filePicker),'youtube-local:picker-entry');
    await fs.mkdir(path.join(__dirname,'../test-results'),{recursive:true});await page.locator('[data-file-picker="youtube-local:picker-entry"]').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(__dirname,'../test-results/file-pickers-video.png')});
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.getTitle()==='ProMax Presenter').setSize(850,650));
    assert.equal(await page.locator('main>.workspace').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);await page.locator('[data-file-picker="youtube-local:picker-entry"]').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(__dirname,'../test-results/file-pickers-compact.png')});
    assert.deepEqual(requests,[],'Attaching local files must not prepare or request remote YouTube content');assert.deepEqual(errors,[]);
    console.log('PASS: background/PDF/local-copy keyboard pickers, cancellation/cue preservation, concurrent attachment identity, later workspace preservation, exact focus return and no external requests; '+(executablePath||'source'));
  }finally{
    clearTimeout(watchdog);await app?.close();
    if(path.dirname(profile)!==os.tmpdir()||!path.basename(profile).startsWith('promax-file-pickers-'))throw Error('Unexpected file picker profile');
    await fs.rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});
  }
}
run().then(()=>process.exit(0),error=>{console.error(error);process.exit(1);});
