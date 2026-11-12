/* Synthetic profile: modal keys and persistent meeting navigation. */
const {launch}=require('./hidden-native.cjs');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
async function run(){
 const profile=await fs.mkdtemp(path.join(os.tmpdir(),'promax-operator-access-'));let app;
 const watchdog=setTimeout(()=>{app?.child.kill();console.error('Operator access check timed out');process.exit(1);},90000);watchdog.unref();
 try{
  app=await launch(profile,process.argv[2]);const {page}=app,errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(()=>{goLive(0);window.accessCue=state;ProMaxFeatures.showTab('scores');});
  await page.locator('.score-remove').first().click();assert.equal(await page.locator('#score-confirm-cancel').evaluate(e=>e===document.activeElement),true);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#score-confirm').evaluate(e=>e.open),false);assert.equal(await page.locator('.score-team-row').count(),3);
  await page.locator('.score-remove').first().click();await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.up('Enter');
  assert.equal(await page.locator('.score-team-row').count(),2,'Enter accepts even though Cancel initially has focus, and held Enter does not add a new team');
  await page.evaluate(()=>ProMaxControls.undo());await page.waitForFunction(()=>!ProMaxControls.busy);assert.equal(await page.locator('.score-team-row').count(),3);
  await page.locator('.score-plus').first().click();const score=await page.locator('.score-value').first().inputValue();
  await page.locator('#score-reset').click();await page.keyboard.press('Escape');assert.equal(await page.locator('.score-value').first().inputValue(),score);
  await page.locator('#score-reset').click();await page.keyboard.press('Enter');assert.equal(await page.locator('.score-value').first().inputValue(),'0');
  assert.equal(await page.evaluate(()=>state===accessCue),true,'Confirmation Enter/Escape never advance the live cue or toggle blackout');
  await page.locator('#new-meeting').click();await page.keyboard.press('Enter');assert.equal(await page.locator('#meeting-new').evaluate(e=>e.open),true,'Required fields retain form validation');
  await page.locator('#meeting-new-name').fill('Synthetic accessible meeting');await page.keyboard.press('Enter');
  assert.equal(await page.locator('#meeting-new').evaluate(e=>e.open),false);const folderId=await page.evaluate(()=>meetingSelected);assert(folderId);
  await page.evaluate(async()=>{ProMaxMeetings.add({type:'text',title:'Selected meeting item',slides:[{text:'Prepared meeting content'}]});await ProMaxMeetings.open(ProMaxMeetings.folder().items[0]);});
  for(const tab of ['bible','videos','presentations','scores','price-game','songs']){
   await page.locator('.workspace-tabs [data-tab="'+tab+'"]').click();
   assert.equal(await page.evaluate(()=>document.querySelector('.workspace-tabs').hidden),false);
   assert.equal(await page.evaluate(()=>meetingSelected),folderId,'Changing tabs retains the active meeting folder');
   assert.equal(await page.locator('.workspace-tabs button:visible').count(),6);
  }
  assert.equal(await page.locator('.prepared-slide .caption').first().innerText(),'Prepared meeting content','The Meeting tab restores the selected meeting item');
  await page.evaluate(()=>{const f=ProMaxMeetings.folder(),item=f.items[0];openPreparedSlideEditor(f.id,item.id,item.slides[0].id);});const before=await page.locator('#slide-edit-text').inputValue();await page.keyboard.press('Enter');
  assert.equal(await page.locator('#slide-editor').evaluate(e=>e.open),true,'Enter in multiline text keeps editing');assert.equal((await page.locator('#slide-edit-text').inputValue()).length,before.length+1);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#slide-editor').evaluate(e=>e.open),false);assert.equal(await page.evaluate(()=>state===accessCue),true);
  // Newly created confirmation dialogs get the same keys; nested Escape closes only the top dialog.
  await page.evaluate(()=>{ProMaxSettings.open('help');const dialog=document.createElement('dialog');dialog.id='dynamic-confirm';dialog.innerHTML='<p>Synthetic continuation</p><button data-dialog-cancel>Cancel</button><button data-dialog-accept>Continue</button>';dialog.querySelector('[data-dialog-cancel]').onclick=()=>dialog.close();dialog.querySelector('[data-dialog-accept]').onclick=()=>{window.continued=true;dialog.close();};document.body.append(dialog);dialog.showModal();});
  await page.keyboard.press('Escape');assert.equal(await page.locator('#dynamic-confirm').evaluate(e=>e.open),false);assert.equal(await page.locator('#app-settings-dialog').evaluate(e=>e.open),true);
  await page.evaluate(()=>document.querySelector('#dynamic-confirm').showModal());await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>continued),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#app-settings-dialog').evaluate(e=>e.open),false);
  await page.locator('.workspace-tabs [data-tab="price-game"]').click();await page.evaluate(()=>{document.querySelector('.workspace').scrollTop=500;});
  const geometry=await page.locator('.workspace-tabs').evaluate(e=>({top:e.getBoundingClientRect().top,pane:e.closest('.workspace').getBoundingClientRect().top}));assert(geometry.top>=geometry.pane&&geometry.top<geometry.pane+30,'Meeting tabs stay visible while the workspace scrolls');
  assert.deepEqual(errors,[]);console.log('PASS: Enter accepts/Escape cancels confirmations, required fields, multiline editing, held Enter, dynamic/nested dialogs, unchanged live cue, six meeting tabs and sticky navigation; '+(process.argv[2]||'source'));
 }finally{clearTimeout(watchdog);await app?.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
