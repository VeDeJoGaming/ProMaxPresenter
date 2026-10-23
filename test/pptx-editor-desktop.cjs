const { _electron:electron }=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const run=require('node:util').promisify(require('node:child_process').execFile);
async function main(){
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'promax-pptx-test-')),fixture=path.join(profile,'fixture.pptx');
  await run('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'pptx-fixture.ps1'),'-Destination',fixture],{timeout:60000,windowsHide:true});
  const original=await fs.readFile(fixture),env={...process.env,PROMAX_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
  const exe=process.argv[2];let app;
  try{
    app=await electron.launch({executablePath:exe,args:exe?[`--user-data-dir=${profile}`]:[path.resolve(__dirname,'..')],env,timeout:45000});
    let page;for(let i=0;i<100;i++){page=app.windows().find(p=>/index\.html/.test(p.url()));if(page)break;await new Promise(r=>setTimeout(r,100));}
    await page.waitForFunction(()=>window.ProMaxPptxEditor&&window.ProMaxFeatures);await page.evaluate(()=>ProMaxFeatures.ready);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    // Native dialogs are stubbed only in this isolated test process.
    await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},fixture);
    const result=await page.evaluate(()=>promaxDesktop.importPowerPoint());assert.ok(result.document,result.error);
    const doc=result.document;assert.ok(doc.nativeSource);assert.equal(doc.slides.length,1);
    await page.evaluate(async doc=>{await ProMaxFeatures.saveDocument(doc);ProMaxFeatures.showTab('presentations');},doc);
    await page.getByRole('button',{name:'Edit PowerPoint',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#pptx-object-list'),{},{timeout:60000});
    await page.evaluate(()=>{state={text:'First text',black:false};paint();document.querySelector('#preview .screen-text').getAnimations().forEach(a=>a.finish());state.text='Next text';paint();});
    assert.equal(await page.locator('#preview .text-outgoing').count(),1);
    await page.locator('#pptx-object-list').selectOption({label:'TextBox 1'});
    await page.locator('#pptx-text').fill('Saved from inside ProMax');
    await page.locator('#pptx-fontSize').fill('48');
    await page.locator('#pptx-left').fill('110');
    await page.locator('#pptx-editor').getByRole('button',{name:'Close',exact:true}).click();assert.equal(await page.locator('#pptx-editor').evaluate(n=>n.open),true);
    await page.getByRole('button',{name:'Apply changes',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#pptx-status').textContent.startsWith('Saved to'),{},{timeout:90000});
    let saved=await page.evaluate(()=>ProMaxFeatures.getDocuments()[0]);assert.notEqual(saved.nativeSource,doc.nativeSource);
    const read=await page.evaluate(source=>promaxDesktop.editPowerPoint({source,action:'inspect'}),saved.nativeSource);
    assert.ok(read.model,read.error);assert.equal(read.model.slides[0].objects[0].text,'Saved from inside ProMax');assert.equal(read.model.slides[0].objects[0].fontSize,48);assert.equal(read.model.slides[0].objects[0].left,110);
    assert.equal(await page.evaluate(()=>state.text),'Next text');
    await page.getByRole('button',{name:'Add text',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#pptx-object-list')?.options.length===4,{},{timeout:90000});
    await page.locator('#pptx-undo').click();await page.waitForFunction(()=>document.querySelector('#pptx-object-list')?.options.length===3);
    await page.getByRole('button',{name:'Add shape',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#pptx-object-list')?.options.length===4,{},{timeout:90000});
    await page.locator('#pptx-object-list').selectOption({index:3});await page.getByRole('button',{name:'Delete object',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#pptx-object-list')?.options.length===3,{},{timeout:90000});
    const picture=require('node:url').fileURLToPath(doc.slides[0]);await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},picture);
    await page.getByRole('button',{name:'Add picture',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#pptx-object-list')?.options.length===4,{},{timeout:90000});
    await page.locator('#pptx-undo').click();await page.waitForFunction(()=>document.querySelector('#pptx-object-list')?.options.length===3);
    await page.getByRole('button',{name:'Duplicate slide',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('#pptx-slides button').length===2,{},{timeout:90000});
    await page.getByRole('button',{name:'Delete slide',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('#pptx-slides button').length===1,{},{timeout:90000});
    saved=await page.evaluate(()=>ProMaxFeatures.getDocuments()[0]);
    // Export uses the actual main-process save handler, with an isolated destination.
    const exported=path.join(profile,'exported.pptx');await app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});},exported);
    await page.getByRole('button',{name:'Save PPTX copy',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#pptx-status').textContent==='Editable PPTX copy saved.');
    assert.ok((await fs.stat(exported)).size>1000);assert.deepEqual(await fs.readFile(fixture),original);
    // PPTX XML confirms that native animation and transition data survived edits.
    const verifyScript=path.join(profile,'verify.ps1');await fs.writeFile(verifyScript,"param([string]$File)\nAdd-Type -AssemblyName System.IO.Compression.FileSystem\n$z=[IO.Compression.ZipFile]::OpenRead($File)\ntry { $r=[IO.StreamReader]::new($z.GetEntry('ppt/slides/slide1.xml').Open()); $r.ReadToEnd(); $r.Close() } finally { $z.Dispose() }");
    const slide=(await run('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',verifyScript,'-File',exported],{windowsHide:true})).stdout;
    assert.match(slide,/Saved from inside ProMax/);assert.match(slide,/<p:timing/);assert.match(slide,/<p:transition/);
    await page.screenshot({path:path.join(profile,'editor.png')});
    await page.locator('#pptx-editor').getByRole('button',{name:'Close',exact:true}).click();
    await page.reload();await page.waitForFunction(()=>window.ProMaxFeatures);await page.evaluate(()=>ProMaxFeatures.ready);assert.equal((await page.evaluate(()=>ProMaxFeatures.getDocuments()[0])).nativeSource,saved.nativeSource);
    assert.deepEqual(errors,[]);
    await page.screenshot({path:path.join(profile,'restarted.png')});console.log('PPTX edit, native save/reopen, formatting, add text/picture/shape, undo, duplicate/delete slide, export, animation preservation and restart passed. '+profile);
  }finally{await app?.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
