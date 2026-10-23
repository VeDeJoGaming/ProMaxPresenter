const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');

async function run(){
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'promax-gallery-'));
  const env={...process.env,PROMAX_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
  const executablePath=process.argv[2];
  let app;
  const watchdog=setTimeout(()=>{app?.process().kill();console.error('Motion library check timed out.');process.exit(1);},120000);watchdog.unref();
  try{
    app=await electron.launch({executablePath,args:executablePath?[`--user-data-dir=${profile}`]:[path.join(__dirname,'..')],env,timeout:45000});
    const page=await app.firstWindow(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.waitForFunction(()=>window.ProMaxControls&&window.ProMaxVisuals);
    assert.equal(path.resolve(await app.evaluate(({app})=>app.getPath('userData'))).toLowerCase(),profile.toLowerCase());
    await page.setViewportSize({width:1440,height:1000});
    const open=()=>page.evaluate(()=>{
      const start=performance.now();document.getElementById('browse-visuals').click();
      return {ms:performance.now()-start,count:ProMaxVisuals.presets.length,canvases:document.querySelectorAll('#visual-grid canvas').length};
    });
    const initial=await open();
    assert.equal(await page.locator('.visual-option').count(),initial.count);
    assert.equal(initial.canvases,0,'Opening queues thumbnails instead of drawing the entire collection');
    assert.ok(initial.ms<1500,`Gallery opening should stay responsive (${Math.round(initial.ms)} ms)`);
    assert.match(await page.locator('#visual-results').textContent(),new RegExp(`^${initial.count} of ${initial.count}`));
    assert.equal(await page.locator('#visual-search').evaluate(el=>el===document.activeElement),true);
    await page.waitForFunction(()=>document.querySelector('#visual-grid canvas')).catch(async error=>{console.error(await page.evaluate(()=>({open:document.querySelector('#visual-library').open,cards:document.querySelectorAll('.visual-option').length,queue:visualStillQueue.length,frame:visualStillFrame,visible:[...visualPreviewCards.values()].filter(c=>c.visible).length})));throw error;});
    assert.ok(await page.locator('#visual-grid canvas').count()<initial.count*3,'Only nearby previews are loaded');

    const category=await page.evaluate(()=>ProMaxVisuals.presets[0].category);
    const categoryCount=await page.evaluate(category=>ProMaxVisuals.presets.filter(p=>p.category===category).length,category);
    await page.locator('#visual-filters button').filter({hasText:new RegExp(`^${category}$`)}).click();
    assert.equal(await page.locator('.visual-option').count(),categoryCount);
    await page.locator('#visual-filters button').filter({hasText:/^All$/}).click();
    const tagged=await page.evaluate(()=>{const preset=ProMaxVisuals.presets.find(p=>p.tags?.length);return preset?{id:preset.id,tag:typeof preset.tags==='string'?preset.tags.split(/\s+/)[0]:preset.tags[0]}:null;});
    if(tagged){
      await page.locator('#visual-search').fill(tagged.tag);
      assert.equal(await page.locator(`.visual-option[data-visual-id="${tagged.id}"]`).count(),1,'Search includes descriptive tags');
      await page.locator('#visual-search').fill('');
    }
    const accentPreset=await page.evaluate(()=>{
      const preset=ProMaxVisuals.presets.find(p=>p.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'')!==p.name)||ProMaxVisuals.presets[0];
      return {id:preset.id,query:preset.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()};
    });
    await page.locator('#visual-search').fill(accentPreset.query);
    assert.equal(await page.locator(`.visual-option[data-visual-id="${accentPreset.id}"]`).count(),1,'Search ignores case and accents');
    await page.locator(`.visual-option[data-visual-id="${accentPreset.id}"]`).evaluate(el=>el.parentElement.querySelector('.visual-favorite').click());
    assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('promax-library')).settings.visualFavorites),[accentPreset.id]);
    await page.locator('#visual-search').fill('');
    await page.locator('#visual-favorites').click();
    assert.equal(await page.locator('.visual-option').count(),1);
    await page.locator('.visual-option').click();
    assert.equal(await page.evaluate(()=>settings.visual),accentPreset.id);
    await page.locator('.visual-favorite').click();
    assert.equal(await page.locator('#visual-empty').isVisible(),true);
    assert.equal(await page.locator('#visual-favorites').evaluate(el=>el===document.activeElement),true,'Removing the last favorite retains keyboard focus');
    await page.locator('#visual-reset').click();
    assert.equal(await page.locator('.visual-option').count(),initial.count);
    await page.locator('#visual-search').fill('zz_no_matching_background_zz');
    assert.equal(await page.locator('.visual-option').count(),0);
    assert.equal(await page.locator('#visual-empty').isVisible(),true);
    await page.locator('#visual-reset').click();

    await page.locator('#visual-sample-lyrics').uncheck();
    assert.equal(await page.locator('.visual-sample-lyrics').first().isVisible(),false);
    await page.locator('#visual-sample-lyrics').check();
    await page.locator('.visual-option').first().focus();
    await page.keyboard.press('ArrowRight');
    const secondId=await page.locator('.visual-option').nth(1).getAttribute('data-visual-id');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.visualId),secondId);
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>settings.visual),secondId);
    await page.keyboard.press('Home');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.visualId),await page.locator('.visual-option').first().getAttribute('data-visual-id'));
    await page.keyboard.press('End');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.visualId),await page.locator('.visual-option').last().getAttribute('data-visual-id'));

    await page.evaluate(()=>{
      window.galleryLive=new Set();
      const mount=ProMaxVisuals.mount;
      ProMaxVisuals.mount=function(container,id,animated,options){
        const surface=mount(container,id,animated,options);
        if(animated&&surface?.stop){
          galleryLive.add(surface);const stop=surface.stop;
          surface.stop=()=>{galleryLive.delete(surface);stop();};
        }
        return surface;
      };
    });
    // Focus requests a preview immediately, even before the lazy queue reaches it.
    await page.locator('.visual-option').first().hover();
    assert.equal(await page.evaluate(()=>galleryLive.size),3);
    await page.locator('.visual-option').nth(1).hover();
    assert.equal(await page.evaluate(()=>galleryLive.size),3,'One triptych animates at a time');
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>galleryLive.size===0);
    assert.equal(await page.evaluate(()=>galleryLive.size),0,'Reduced motion stops animated gallery previews');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.locator('.visual-option').first().hover();
    await page.locator('#visual-search').fill('zz_no_matching_background_zz');
    assert.equal(await page.evaluate(()=>galleryLive.size),0,'Filtering stops animation resources');
    await page.locator('#visual-reset').click();
    await page.locator('.visual-option').first().hover();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#visual-library').evaluate(el=>el.open),false);
    assert.equal(await page.evaluate(()=>galleryLive.size),0,'Closing stops animation resources');
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.equal(await page.locator('#visual-grid').evaluate(el=>el.children.length),0,'Queued previews remain stopped after close');

    await open();
    await page.locator('.visual-favorite').first().click();
    const favoriteId=await page.locator('.visual-option').first().getAttribute('data-visual-id');
    await page.reload();await page.waitForFunction(()=>window.ProMaxControls);
    assert.deepEqual(await page.evaluate(()=>settings.visualFavorites),[favoriteId]);
    await open();await page.setViewportSize({width:600,height:850});
    const layout=await page.locator('#visual-library').evaluate(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth}));
    assert.equal(layout.width,layout.scrollWidth,'Compact gallery has no horizontal overflow');
    assert.deepEqual(errors,[]);
    console.log(`PASS: ${initial.count} backgrounds; gallery opens in ${Math.round(initial.ms)} ms; lazy previews, search, categories, favorites persistence, lyrics, keyboard, reduced motion, cleanup and compact layout.`);
  }finally{
    clearTimeout(watchdog);
    if(app){const child=app.process(),exited=child.exitCode!==null?Promise.resolve():new Promise(resolve=>child.once('exit',resolve));app.close().catch(()=>{});const stop=setTimeout(()=>child.kill(),10000);await exited;clearTimeout(stop);}
  }
}
run().then(()=>process.exit(0),error=>{console.error(error);process.exit(1);});
