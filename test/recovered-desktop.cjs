const { _electron: electron } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

async function run() {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(),'promax-complete-'));
  const env = { ...process.env, PROMAX_TEST_DATA:profile }; delete env.ELECTRON_RUN_AS_NODE;
  const executablePath = process.argv[2];
  let app; const errors=[];
  let stage='launch';
  const watchdog=setTimeout(()=>{console.error('Desktop check timed out during '+stage);app?.process().kill();process.exit(1);},120000); watchdog.unref();
  try {
    app=await electron.launch({executablePath,args:executablePath?[`--user-data-dir=${profile}`]:[path.join(__dirname,'..')],env,timeout:45000});
    const page=await app.firstWindow(); page.on('pageerror',e=>errors.push(e.message));
    stage='startup'; console.log('Desktop check: startup');
    await page.waitForFunction(()=>window.ProMaxControls && window.proMaxSharedHost && document.querySelector('.song'));
    assert.equal(path.resolve(await app.evaluate(({app})=>app.getPath('userData'))).toLowerCase(),profile.toLowerCase());
    assert.equal(await page.evaluate(()=>typeof require),'undefined');
    assert.equal(await page.evaluate(()=>ProMaxVisuals.presets.length),22);
    await page.evaluate(()=>{ProMaxMeetings.create('Sunday');ProMaxMeetings.addSong();ProMaxMeetings.create('Youth');ProMaxMeetings.addSong();ProMaxMeetings.create('Prayer');ProMaxMeetings.addSong();});
    assert.equal((await page.evaluate(()=>proMaxPrepareUpdate())).meetingFolders.length,3);
    // All six SVG loops load from the install directory and continue across cues.
    for(const id of ['nordlys','blaa-tide','gyllent-lys','purpurdis','prisme','etterklang']) {
      stage='visual '+id; console.log('Desktop check: '+stage);
      await page.evaluate(id=>{selectVisual(id);state={text:'Bundled background',black:false};paint();},id);
      await page.waitForFunction(id=>{const img=document.querySelector('#preview img[data-bundled-visual]');return img?.dataset.bundledVisual===id&&img.complete&&img.naturalWidth>0;},id);
      const same=await page.evaluate(()=>{const image=document.querySelector('#preview img');state.text='Next cue';paint();return image===document.querySelector('#preview img');});
      assert.equal(same,true);
      const first=await page.locator('#preview').evaluate(el=>({x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y,width:el.clientWidth,height:el.clientHeight}));
      const before=await page.screenshot({clip:first});
      await new Promise(resolve=>setTimeout(resolve,250));
      const after=await page.screenshot({clip:first});
      assert.equal(before.equals(after),false,id+' must animate');
    }
    await page.evaluate(()=>{selectVisual('dynamic-glass');state.text='Canvas restored';paint();});
    assert.equal(await page.locator('#preview canvas[data-glass]').count(),1);
    stage='Bible and saved YouTube library'; console.log('Desktop check: '+stage);
    await page.evaluate(async()=>{
      await ProMaxFeatures.importBible(new File([JSON.stringify({name:'Synthetic Bible',verses:[{book:'John',chapter:3,verse:16,text:'Synthetic verse'}]})],'test.json'));
      // Verify the offline link store without relying on YouTube's network/player.
      await ProMaxYouTubeLibrary.history.apply([{...ProMaxYouTubeLinks.parse('https://youtu.be/M7lc1UVf-VE'),id:uid(),title:'Test link'}]);
      ProMaxFeatures.showTab('songs');ProMaxMeetings.select(null);
    });
    await page.locator('#shared-open').click();
    await page.locator('#sharing-dialog').waitFor();
    assert.equal(await page.locator('#shared-choice').inputValue(),'none');
    await page.locator('#shared-close').click();
    const data=await page.evaluate(()=>proMaxPrepareUpdate());
    stage='backup'; console.log('Desktop check: '+stage);
    const {backupLibrary}=require('../desktop/backup.cjs');
    const backup=await backupLibrary(path.join(profile,'backups'),data,'1.2.0');
    const saved=JSON.parse(await fs.readFile(backup,'utf8'));
    assert.deepEqual(saved.meetingFolders,data.meetingFolders);
    assert.equal(saved.settings.visual,'dynamic-glass');
    await page.evaluate(()=>selectVisual('nordlys'));
    await page.reload();
    stage='restart'; console.log('Desktop check: '+stage);
    await page.waitForFunction(()=>window.ProMaxControls && document.querySelector('#preview img[data-bundled-visual]')?.complete);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('promax-library')).meetingFolders.length),3);
    assert.equal(await page.evaluate(()=>settings.visual),'nordlys');
    await page.evaluate(()=>ProMaxYouTubeLibrary.ready);
    assert.equal(await page.evaluate(()=>ProMaxYouTubeLibrary.list().length),1);
    assert.equal(await page.evaluate(()=>proMaxShared.getState().then(s=>s.connected)),false);
    await fs.mkdir(path.join(__dirname,'..','test-results'),{recursive:true});
    await page.screenshot({path:path.join(__dirname,'..','test-results','complete-app.png')});
    assert.deepEqual(errors,[]);
    console.log('PASS: complete app, 3 meeting folders, Bible import, YouTube library, all 22 installed backgrounds, shared consent, update backup, restart and isolated profile.');
  } finally {
    clearTimeout(watchdog);
    if(app){const child=app.process();const exited=child.exitCode!==null?Promise.resolve():new Promise(r=>child.once('exit',r));app.close().catch(()=>{});const stop=setTimeout(()=>child.kill(),10000);await exited;clearTimeout(stop);}
  }
}
run().then(()=>process.exit(0),e=>{console.error(e);process.exit(1);});
