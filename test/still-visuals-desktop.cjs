// Synthetic content only; all artwork must be bundled and render without network.
const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
async function run(){
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'promax-stills-')),env={...process.env,PROMAX_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
  const executablePath=process.argv[2];let app;const errors=[],network=[];
  try{
    app=await electron.launch({executablePath,args:executablePath?[`--user-data-dir=${profile}`]:[path.join(__dirname,'..')],env,timeout:45000});
    const control=await app.firstWindow();control.on('pageerror',e=>errors.push(e.message));
    control.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
    await control.waitForFunction(()=>window.ProMaxControls&&window.ProMaxStillVisuals);await control.evaluate(()=>ProMaxControls.ready);
    await control.evaluate(async()=>{settings.glassAuto=false;settings.glassVariant='a';await ProMaxControls.mutate('Still fixture',()=>{current().title='Synthetic still background check';current().slides=[{id:uid(),text:'Every heart can sing',section:'Verse',key:''},{id:uid(),text:'Hope has risen',section:'Chorus',key:''}];});});
    const ids=await control.evaluate(()=>ProMaxStillVisuals.presets.map(p=>p.id));assert.ok(ids.length>=4);
    const outputReady=app.waitForEvent('window');await control.locator('#open-output').click();const output=await outputReady;
    await output.waitForLoadState('domcontentloaded');output.on('pageerror',e=>errors.push(e.message));
    for(const id of ids){
      await control.evaluate(id=>{selectVisual(id);goLive(0);},id);
      await control.waitForFunction(id=>{const image=document.querySelector('#preview img[data-still-visual]');return image?.dataset.stillVisual===id&&image.complete&&image.naturalWidth>=1000;},id);
      await output.waitForFunction(id=>{const image=document.querySelector('#stage img[data-still-visual]');return image?.dataset.stillVisual===id&&image.complete&&image.naturalWidth>=1000;},id);
      assert.equal(await control.locator('#glass-controls').evaluate(el=>el.hidden),await control.evaluate(id=>!ProMaxStillVisuals.presets.find(p=>p.id===id).variants,id));
      assert.equal(await output.locator('#stage canvas[data-glass]').count(),0,'Stills do not run motion canvases');
      await output.evaluate(()=>window.previousStill=document.querySelector('img[data-still-visual]'));
      await control.evaluate(()=>goLive(1));await output.waitForFunction(()=>document.querySelector('.screen-text').textContent==='Hope has risen');
      assert.equal(await output.evaluate(()=>window.previousStill===document.querySelector('img[data-still-visual]')),true,'Image is retained across lyrics and song sections');
      const size=await output.locator('img[data-still-visual]').evaluate(image=>({width:image.clientWidth,height:image.clientHeight,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,url:image.src}));
      assert.ok(size.width>0&&size.height>0&&size.url.startsWith('file:'),'Offline full-frame output');
    }
    const authored=await control.evaluate(()=>ProMaxStillVisuals.presets.filter(p=>p.variants).map(p=>p.id));
    for(const id of authored){
      for(const look of ['a','b','c']){
        await control.evaluate(({id,look})=>{settings.glassAuto=false;settings.glassVariant=look;selectVisual(id);}, {id,look});
        await output.waitForFunction(({id,look})=>{const image=document.querySelector('img[data-still-visual]');return image?.dataset.stillVisual===id&&image.dataset.stillVariant===look&&image.complete&&image.naturalWidth>0;},{id,look});
        assert.equal(await control.locator('#visual-motion').evaluate(el=>el.closest('label').hidden),true);
        assert.equal(await control.locator('#glass-palette').evaluate(el=>el.closest('label').hidden),true);
        if(look!=='a')assert.ok(await output.locator('.background-fade').count()>0,'Authored image changes use the background fade');
        await output.waitForTimeout(1600);assert.equal(await output.locator('.background-fade').count(),0,'Snapshot released after authored image transition');
      }
      for(const [section,look]of [['Verse','a'],['Chorus','b'],['Bridge','c']]){
        await control.evaluate(({section})=>{settings.glassAuto=true;state.section=section;paint();},{section});
        await output.waitForFunction(look=>document.querySelector('img[data-still-visual]')?.dataset.stillVariant===look,look);
      }
    }
    await control.evaluate(()=>{settings.glassAuto=false;settings.glassVariant='a';selectVisual('dynamic-glass');goLive(0);});await output.waitForFunction(()=>document.querySelector('canvas[data-glass]'));
    await control.evaluate(()=>selectVisual('empty-tomb'));await output.waitForFunction(()=>document.querySelector('img[data-still-visual="empty-tomb"]')?.complete);
    assert.equal(await output.locator('canvas[data-glass]').count(),0,'Leaving motion for a still releases the old canvas');
    await control.locator('#blackout').click();await output.waitForFunction(()=>!document.querySelector('img[data-still-visual]'));
    await control.locator('#blackout').click();await output.waitForFunction(()=>document.querySelector('img[data-still-visual="empty-tomb"]')?.complete);
    await control.evaluate(()=>document.getElementById('browse-visuals').closest('details').open=true);
    await control.locator('#browse-visuals').click();await control.locator('#visual-search').fill('empty tomb');
    const card=control.locator('.visual-option[data-visual-id="empty-tomb"]');await card.hover();await card.locator('img[data-still-visual]').waitFor();
    assert.equal(await card.locator('.visual-option-preview').count(),1);assert.equal(await card.locator('.visual-letter').count(),0);assert.equal(await card.locator('canvas').count(),0);
    assert.match(await card.innerText(),/Still artwork/);
    for(const id of authored){
      await control.locator('#visual-search').fill(id.replaceAll('-',' '));const authoredCard=control.locator('.visual-option[data-visual-id="'+id+'"]');await authoredCard.hover();
      await control.waitForFunction(id=>{const images=[...document.querySelectorAll('.visual-option[data-visual-id="'+id+'"] img')];return images.length===3&&images.every(i=>i.complete&&i.naturalWidth>0);},id);
      assert.deepEqual(await authoredCard.locator('img').evaluateAll(images=>images.map(i=>i.dataset.stillVariant)),['a','b','c']);
      assert.equal(await authoredCard.locator('.visual-letter').count(),3);assert.equal(await authoredCard.locator('canvas').count(),0);
    }
    await control.locator('#close-visuals').click();
    await control.reload();await control.waitForFunction(()=>window.ProMaxControls);await control.evaluate(()=>ProMaxControls.ready);
    assert.equal(await control.evaluate(()=>settings.visual),'empty-tomb');
    assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
    console.log('PASSED: all bundled stills, offline image decoding in native output, retained across lyrics, authored A/B/C manual/section selection and fades, no motion/tints for stills, motion transition cleanup, blackout/restore, single-image gallery and persisted selection. '+(executablePath||'source'));
  }finally{await app?.close();await fs.rm(profile,{recursive:true,force:true});}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
